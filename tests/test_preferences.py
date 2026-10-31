import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "preferences.py"
CONFIG_NAME = ".physics-inquiry-web.json"


class PreferencesCliTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.project = Path(self.temp.name) / "project"
        self.project.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def cli(self, *arguments):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--project", str(self.project), *arguments],
            capture_output=True,
            text=True,
            check=False,
        )
        try:
            payload = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            self.fail(f"CLI did not return JSON: {result.stdout!r}; {result.stderr!r}: {exc}")
        return result.returncode, payload

    def init(self, *extra):
        return self.cli(
            "init",
            "--assistant-host",
            "codex",
            "--site-mode",
            "single",
            "--hosting",
            "none",
            *extra,
        )

    def test_status_on_first_use_does_not_write(self):
        code, response = self.cli("status")

        self.assertEqual(code, 0)
        self.assertEqual(response["status"], "uninitialized")
        self.assertIsNone(response["preferences"])
        self.assertEqual(list(self.project.iterdir()), [])

    def test_init_persists_explicit_choices_and_local_html_invariant(self):
        code, response = self.cli(
            "init",
            "--assistant-host",
            "kimi",
            "--site-mode",
            "catalog",
            "--hosting",
            "kimi",
        )

        self.assertEqual(code, 0)
        saved = json.loads((self.project / CONFIG_NAME).read_text(encoding="utf-8"))
        self.assertEqual(
            saved,
            {
                "schema_version": 1,
                "assistant_host": "kimi",
                "site_mode": "catalog",
                "hosting": "kimi",
                "output_dir": "experiments",
                "local_html": True,
            },
        )
        self.assertEqual(response["status"], "initialized")
        self.assertEqual(
            response["resolved_output_dir"], str(self.project.resolve() / "experiments")
        )
        self.assertFalse((self.project / "experiments").exists())
        self.assertEqual({path.name for path in self.project.iterdir()}, {CONFIG_NAME})

    def test_repeat_init_refuses_overwrite(self):
        self.assertEqual(self.init()[0], 0)
        config = self.project / CONFIG_NAME
        original = config.read_bytes()

        code, response = self.init("--output-dir", "other-experiments")

        self.assertEqual(code, 2)
        self.assertFalse(response["ok"])
        self.assertIn("already exist", response["error"])
        self.assertEqual(config.read_bytes(), original)

    def test_update_changes_only_supplied_preferences(self):
        self.assertEqual(
            self.cli(
                "init",
                "--assistant-host",
                "workbuddy",
                "--site-mode",
                "catalog",
                "--hosting",
                "workbuddy",
            )[0],
            0,
        )

        code, response = self.cli("update", "--site-mode", "single", "--output-dir", "build/labs")

        self.assertEqual(code, 0)
        saved = json.loads((self.project / CONFIG_NAME).read_text(encoding="utf-8"))
        self.assertEqual(saved["assistant_host"], "workbuddy")
        self.assertEqual(saved["site_mode"], "single")
        self.assertEqual(saved["hosting"], "workbuddy")
        self.assertEqual(saved["output_dir"], "build/labs")
        self.assertIs(saved["local_html"], True)
        self.assertEqual(response["status"], "updated")
        self.assertFalse((self.project / "build").exists())
        self.assertEqual({path.name for path in self.project.iterdir()}, {CONFIG_NAME})

    def test_init_requires_explicit_choices_and_does_not_write_on_error(self):
        code, response = self.cli("init", "--assistant-host", "codex")

        self.assertEqual(code, 2)
        self.assertFalse(response["ok"])
        self.assertEqual(list(self.project.iterdir()), [])

    def test_init_rejects_file_ancestor_without_writing_preferences(self):
        blocker = self.project / "ordinary-file"
        blocker.write_text("keep", encoding="utf-8")

        code, response = self.cli(
            "init",
            "--assistant-host",
            "codex",
            "--site-mode",
            "single",
            "--hosting",
            "none",
            "--output-dir",
            "ordinary-file/experiments",
        )

        self.assertEqual(code, 2)
        self.assertFalse(response["ok"])
        self.assertIn("file", response["error"])
        self.assertEqual(blocker.read_text(encoding="utf-8"), "keep")
        self.assertEqual({path.name for path in self.project.iterdir()}, {"ordinary-file"})

    def test_update_rejects_unknown_choice_and_unsafe_output_without_writing(self):
        self.assertEqual(self.init()[0], 0)
        config = self.project / CONFIG_NAME
        original = config.read_bytes()

        for arguments in (
            ("update", "--assistant-host", "unknown"),
            ("update", "--output-dir", "../outside"),
            ("update", "--output-dir", str(self.project.parent / "outside")),
        ):
            with self.subTest(arguments=arguments):
                code, response = self.cli(*arguments)
                self.assertEqual(code, 2)
                self.assertFalse(response["ok"])
                self.assertEqual(config.read_bytes(), original)
                self.assertEqual({path.name for path in self.project.iterdir()}, {CONFIG_NAME})

    def test_update_requires_existing_preferences_and_an_option(self):
        code, response = self.cli("update", "--hosting", "none")
        self.assertEqual(code, 2)
        self.assertIn("not initialized", response["error"])
        self.assertEqual(list(self.project.iterdir()), [])

        self.assertEqual(self.init()[0], 0)
        original = (self.project / CONFIG_NAME).read_bytes()
        code, response = self.cli("update")
        self.assertEqual(code, 2)
        self.assertIn("at least one", response["error"])
        self.assertEqual((self.project / CONFIG_NAME).read_bytes(), original)

    def test_invalid_existing_preferences_are_rejected_without_rewrite(self):
        base = {
            "schema_version": 1,
            "assistant_host": "codex",
            "site_mode": "single",
            "hosting": "none",
            "output_dir": "experiments",
            "local_html": True,
        }
        invalid_values = (
            {**base, "local_html": False},
            {**base, "assistant_host": "unknown"},
            {**base, "output_dir": "../outside"},
            {**base, "extra": "unexpected"},
        )

        for invalid in invalid_values:
            with self.subTest(invalid=invalid):
                config = self.project / CONFIG_NAME
                original = json.dumps(invalid).encode("utf-8")
                config.write_bytes(original)

                code, response = self.cli("status")

                self.assertEqual(code, 2)
                self.assertFalse(response["ok"])
                self.assertEqual(config.read_bytes(), original)
                config.unlink()

    def test_relative_project_path_is_rejected(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--project", ".", "status"],
            capture_output=True,
            text=True,
            check=False,
            cwd=self.project,
        )
        response = json.loads(result.stdout)
        self.assertEqual(result.returncode, 2)
        self.assertIn("absolute", response["error"])
        self.assertEqual(list(self.project.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
