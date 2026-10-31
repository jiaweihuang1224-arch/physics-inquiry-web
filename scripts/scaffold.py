#!/usr/bin/env python3
"""Copy the bundled plane-mirror reference site to a new local folder."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path


def ignored(_directory: str, names: list[str]) -> set[str]:
    """Keep local editor/VCS metadata out of a shared scaffold."""
    return {name for name in names if name in {".git", ".openai", ".DS_Store"}}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Copy the bundled plane-mirror reference site to a new folder."
    )
    parser.add_argument(
        "--output",
        required=True,
        metavar="ABS",
        help="absolute path for a new output folder (existing paths are refused)",
    )
    args = parser.parse_args()

    requested = Path(args.output).expanduser()
    if not requested.is_absolute():
        parser.error("--output must be an absolute path")

    source = Path(__file__).resolve().parent.parent / "assets" / "reference-site"
    if not source.is_dir():
        print(f"Reference site is missing: {source}", file=sys.stderr)
        return 1

    output = Path(os.path.abspath(requested))
    try:
        resolved_source = source.resolve(strict=True)
        resolved_output = output.resolve(strict=False)
    except OSError as exc:
        print(f"Could not resolve a path: {exc}", file=sys.stderr)
        return 1

    if resolved_output == resolved_source or resolved_source in resolved_output.parents:
        print("Output must be outside the bundled reference-site folder.", file=sys.stderr)
        return 2
    if os.path.lexists(output):
        print(f"Output already exists; refusing to overwrite: {output}", file=sys.stderr)
        return 2

    try:
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, output, ignore=ignored, symlinks=False)
    except FileExistsError:
        print(f"Output already exists; refusing to overwrite: {output}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"Could not scaffold the reference site: {exc}", file=sys.stderr)
        return 1

    files = [path for path in output.rglob("*") if path.is_file()]
    total_bytes = sum(path.stat().st_size for path in files)
    print(f"Created {output} ({len(files)} files, {total_bytes:,} bytes).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
