#!/usr/bin/env python3
"""Store first-use preferences for the physics-inquiry-web skill.

This helper only reads or writes ``.physics-inquiry-web.json`` in an existing
project directory. It does not prompt, create project folders, access a
network, scaffold an experiment, or grant publishing/design approval.
"""

from __future__ import annotations

import argparse
import json
import os
import stat
import sys
import tempfile
from pathlib import Path
from typing import Any


CONFIG_NAME = ".physics-inquiry-web.json"
SCHEMA_VERSION = 1
DEFAULT_OUTPUT_DIR = "experiments"
ASSISTANT_HOSTS = {"codex", "workbuddy", "kimi", "other"}
SITE_MODES = {"single", "catalog"}
HOSTING_OPTIONS = {"none", "codex-sites", "workbuddy", "kimi", "other"}
PREFERENCE_FIELDS = {
    "schema_version",
    "assistant_host",
    "site_mode",
    "hosting",
    "output_dir",
    "local_html",
}


class PreferencesError(Exception):
    """A user-correctable CLI or stored-preference error."""


class JsonArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise PreferencesError(message)


def _parser() -> argparse.ArgumentParser:
    parser = JsonArgumentParser(
        description="Read or update local physics-inquiry-web preferences."
    )
    parser.add_argument(
        "--project",
        required=True,
        help="absolute path to an existing project directory",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("status", help="show saved preferences without writing")

    init_parser = subparsers.add_parser("init", help="save first-use preferences")
    _add_preference_options(init_parser)

    update_parser = subparsers.add_parser("update", help="update saved preferences")
    _add_preference_options(update_parser, required=False)
    return parser


def _add_preference_options(
    parser: argparse.ArgumentParser, *, required: bool = True
) -> None:
    parser.add_argument("--assistant-host", required=required)
    parser.add_argument("--site-mode", required=required)
    parser.add_argument("--hosting", required=required)
    parser.add_argument(
        "--output-dir",
        help="output directory under the project (default: project/experiments)",
    )


def _project_directory(project_arg: str) -> Path:
    supplied = Path(project_arg)
    if not supplied.is_absolute():
        raise PreferencesError("--project must be an absolute path")
    try:
        project = supplied.resolve(strict=True)
    except OSError as exc:
        raise PreferencesError(f"project directory is unavailable: {exc}") from exc
    if not project.is_dir():
        raise PreferencesError("--project must name an existing directory")
    return project


def _config_path(project: Path) -> Path:
    return project / CONFIG_NAME


def _normalize_output_dir(project: Path, value: Any) -> str:
    if not isinstance(value, str) or not value or "\x00" in value:
        raise PreferencesError("output_dir must be a non-empty safe path")
    if "\\" in value:
        raise PreferencesError("output_dir must use portable forward-slash paths")

    path = Path(value)
    if any(part == ".." for part in path.parts):
        raise PreferencesError("output_dir cannot contain parent-directory traversal")
    if path.is_absolute():
        candidate = path
    else:
        candidate = project / path

    try:
        resolved = candidate.resolve(strict=False)
        relative = resolved.relative_to(project)
    except (OSError, ValueError) as exc:
        raise PreferencesError("output_dir must resolve inside the project") from exc
    if relative == Path(".") or not relative.parts:
        raise PreferencesError("output_dir must be a child directory of the project")
    if any(part in {"", ".", ".."} for part in relative.parts):
        raise PreferencesError("output_dir is not a normalized safe path")
    ancestor = project
    for part in relative.parts:
        ancestor = ancestor / part
        if ancestor.exists() and not ancestor.is_dir():
            raise PreferencesError("output_dir has an existing file where a directory is required")
    return relative.as_posix()


def _validate_preferences(value: Any, project: Path) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise PreferencesError("saved preferences must be a JSON object")
    missing = PREFERENCE_FIELDS.difference(value)
    unknown = set(value).difference(PREFERENCE_FIELDS)
    if missing:
        raise PreferencesError(
            "saved preferences are missing fields: " + ", ".join(sorted(missing))
        )
    if unknown:
        raise PreferencesError(
            "saved preferences contain unknown fields: " + ", ".join(sorted(unknown))
        )
    version = value["schema_version"]
    if type(version) is not int or version != SCHEMA_VERSION:
        raise PreferencesError(f"unsupported schema_version: {version!r}")
    if not isinstance(value["assistant_host"], str) or value["assistant_host"] not in ASSISTANT_HOSTS:
        raise PreferencesError("assistant_host has an unknown choice")
    if not isinstance(value["site_mode"], str) or value["site_mode"] not in SITE_MODES:
        raise PreferencesError("site_mode has an unknown choice")
    if not isinstance(value["hosting"], str) or value["hosting"] not in HOSTING_OPTIONS:
        raise PreferencesError("hosting has an unknown choice")
    if value["local_html"] is not True:
        raise PreferencesError("local_html must be true")

    normalized_output = _normalize_output_dir(project, value["output_dir"])
    if normalized_output != value["output_dir"]:
        raise PreferencesError("saved output_dir must be a normalized relative path")
    return {
        "schema_version": SCHEMA_VERSION,
        "assistant_host": value["assistant_host"],
        "site_mode": value["site_mode"],
        "hosting": value["hosting"],
        "output_dir": normalized_output,
        "local_html": True,
    }


def _read_preferences(project: Path) -> dict[str, Any] | None:
    config = _config_path(project)
    try:
        info = config.lstat()
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise PreferencesError(f"cannot inspect preferences file: {exc}") from exc
    if not stat.S_ISREG(info.st_mode):
        raise PreferencesError("preferences path must be a regular file, not a link")
    try:
        raw = config.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise PreferencesError(f"cannot read preferences file: {exc}") from exc
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PreferencesError(f"preferences file is not valid JSON: {exc.msg}") from exc
    return _validate_preferences(parsed, project)


def _serialize(preferences: dict[str, Any]) -> bytes:
    return (json.dumps(preferences, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def _write_new(project: Path, preferences: dict[str, Any]) -> None:
    config = _config_path(project)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(config, flags, 0o600)
    except FileExistsError as exc:
        raise PreferencesError("preferences already exist; init will not overwrite them") from exc
    except OSError as exc:
        raise PreferencesError(f"cannot create preferences file: {exc}") from exc
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(_serialize(preferences))
            handle.flush()
            os.fsync(handle.fileno())
    except OSError as exc:
        try:
            config.unlink(missing_ok=True)
        except OSError:
            pass
        raise PreferencesError(f"cannot write preferences file: {exc}") from exc


def _write_update(project: Path, preferences: dict[str, Any]) -> None:
    config = _config_path(project)
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=".physics-inquiry-web.",
            suffix=".tmp",
            dir=project,
            delete=False,
        ) as handle:
            temp_path = Path(handle.name)
            os.chmod(temp_path, 0o600)
            handle.write(_serialize(preferences))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, config)
    except OSError as exc:
        if "temp_path" in locals():
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
        raise PreferencesError(f"cannot update preferences file: {exc}") from exc


def _new_preferences(args: argparse.Namespace, project: Path) -> dict[str, Any]:
    if args.assistant_host not in ASSISTANT_HOSTS:
        raise PreferencesError("assistant_host has an unknown choice")
    if args.site_mode not in SITE_MODES:
        raise PreferencesError("site_mode has an unknown choice")
    if args.hosting not in HOSTING_OPTIONS:
        raise PreferencesError("hosting has an unknown choice")
    output_arg = args.output_dir if args.output_dir is not None else DEFAULT_OUTPUT_DIR
    return _validate_preferences(
        {
            "schema_version": SCHEMA_VERSION,
            "assistant_host": args.assistant_host,
            "site_mode": args.site_mode,
            "hosting": args.hosting,
            "output_dir": _normalize_output_dir(project, output_arg),
            "local_html": True,
        },
        project,
    )


def _result(project: Path, status: str, preferences: dict[str, Any] | None) -> dict[str, Any]:
    response: dict[str, Any] = {
        "ok": True,
        "status": status,
        "config_path": str(_config_path(project)),
        "preferences": preferences,
    }
    if preferences is not None:
        response["resolved_output_dir"] = str(project / preferences["output_dir"])
    return response


def _run(args: argparse.Namespace) -> dict[str, Any]:
    project = _project_directory(args.project)
    if args.command == "status":
        preferences = _read_preferences(project)
        return _result(
            project,
            "initialized" if preferences is not None else "uninitialized",
            preferences,
        )

    if args.command == "init":
        if _read_preferences(project) is not None:
            raise PreferencesError("preferences already exist; init will not overwrite them")
        preferences = _new_preferences(args, project)
        _write_new(project, preferences)
        return _result(project, "initialized", preferences)

    if args.command == "update":
        if all(
            getattr(args, field) is None
            for field in ("assistant_host", "site_mode", "hosting", "output_dir")
        ):
            raise PreferencesError("update requires at least one preference option")
        current = _read_preferences(project)
        if current is None:
            raise PreferencesError("preferences are not initialized; run init first")
        changed = dict(current)
        for field in ("assistant_host", "site_mode", "hosting"):
            supplied = getattr(args, field)
            if supplied is not None:
                changed[field] = supplied
        if args.output_dir is not None:
            changed["output_dir"] = _normalize_output_dir(project, args.output_dir)
        preferences = _validate_preferences(changed, project)
        _write_update(project, preferences)
        return _result(project, "updated", preferences)

    raise PreferencesError("unsupported command")


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parser().parse_args(argv)
        response = _run(args)
        code = 0
    except PreferencesError as exc:
        response = {"ok": False, "error": str(exc)}
        code = 2
    except Exception as exc:  # Keep CLI failures machine-readable.
        response = {"ok": False, "error": f"unexpected error: {exc}"}
        code = 2
    sys.stdout.write(json.dumps(response, ensure_ascii=False, indent=2) + "\n")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
