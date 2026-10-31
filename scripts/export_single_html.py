#!/usr/bin/env python3
"""Export the bundled plane-mirror reference site as one offline HTML file.

This is a deliberately constrained stitcher for this reference site's known
three-module graph and three PNG assets. It is not a general JavaScript bundler.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath


EXPECTED_TOP_LEVEL = {
    "index.html",
    "site.css",
    "lab.css",
    "site.js",
    "lab.js",
    "mirror-physics.js",
    "assets",
}
EXPECTED_ASSETS = {"girl.png", "lab-background.png", "subjects.png"}
EXPECTED_MODULES = {"site.js", "lab.js", "mirror-physics.js"}
# This exporter intentionally accepts only the packaged, byte-identical mirror example.
# Any new lesson/site must be authored as a self-contained HTML page or use a suitable bundler.
FIXED_SITE_SHA256 = {
    "index.html": "dc2f21612dfb064fa17a286f0677cc651cc2f8558b0918db6ff0ee5eda65f818",
    "site.css": "cca665d662946ea3b0d95c5d58374952ac1a31e4ad68d9263ad56016c487f6a5",
    "lab.css": "77899f271bc7dee46767bbf57fbe2b136c8caad37266d2991b6e560d02e32fa6",
    "site.js": "99ba6d07f7206b09469f0f187c62e01a4c2154838b9c3ca724d40d6310b349b2",
    "lab.js": "0babdd1fac6269176bb469879593bb7a2b01c3ddc6bbf877749a16ce050ea8c6",
    "mirror-physics.js": "742f7d1f1826ab730854edc41f4bba203598da1bd633dd01cbfe2c0aa53691f6",
    "assets/girl.png": "c6c1b417f402aba98100cb5197e7ff2168e28cf488c42f691c5223073f70c3c4",
    "assets/lab-background.png": "1366c69717eb28564a1bd707dd1d47b86d482fcee10478e1b1132bf6649cf06a",
    "assets/subjects.png": "c3e839db9408022843088eb844c04882e5fdfdd1d30aaf3ee220c9985f131cec",
}
DEFAULT_SITE = Path(__file__).resolve().parent.parent / "assets" / "reference-site"

IMPORT_LINE = re.compile(
    r"^(?P<indent>[ \t]*)import[ \t]+(?P<clause>.+?)[ \t]+from[ \t]+"
    r"(?P<quote>['\"])(?P<specifier>[^'\"]+)(?P=quote)[ \t]*;?[ \t]*$"
)
NAMED_IMPORTS = re.compile(r"^\{\s*(?P<names>.*?)\s*\}$")
IMPORT_NAME = re.compile(
    r"^(?P<imported>[A-Za-z_$][A-Za-z0-9_$]*)"
    r"(?:\s+as\s+(?P<local>[A-Za-z_$][A-Za-z0-9_$]*))?$"
)
EXPORT_DECL = re.compile(
    r"^(?P<indent>[ \t]*)export[ \t]+"
    r"(?P<declaration>(?:const|let|var|function|class)[ \t]+"
    r"(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)\b.*)$"
)
EXPORT_LIST = re.compile(
    r"^(?P<indent>[ \t]*)export[ \t]+\{\s*(?P<names>.*?)\s*\}[ \t]*;?[ \t]*$"
)
EXPORT_NAME = re.compile(
    r"^(?P<local>[A-Za-z_$][A-Za-z0-9_$]*)"
    r"(?:\s+as\s+(?P<exported>[A-Za-z_$][A-Za-z0-9_$]*))?$"
)
HTML_TAG = re.compile(r"<(?P<tag>link|script)\b(?P<attrs>[^>]*)>(?:\s*</script\s*>)?", re.I)
HTML_ATTR = re.compile(
    r"(?P<name>[^\s=/>]+)\s*=\s*(?:\"(?P<double>[^\"]*)\"|"
    r"'(?P<single>[^']*)'|(?P<bare>[^\s>]+))"
)
SCRIPT_TAG = re.compile(r"<script\b(?P<attrs>[^>]*)>(?P<body>.*?)</script\s*>", re.I | re.S)
CSS_URL = re.compile(r"url\(\s*(['\"]?)(?P<url>[^)'\"]+)\1\s*\)", re.I)
ASSET_REFERENCE = re.compile(r"\./assets/(?P<name>[A-Za-z0-9._/-]+)")
SCRIPT_END_TAG = re.compile(r"</script", re.I)


class ExportError(Exception):
    """An unsupported or unsafe input shape that the exporter refuses."""


@dataclass(frozen=True)
class ImportBinding:
    imported: str
    local: str


@dataclass(frozen=True)
class ImportRecord:
    line_index: int
    specifier: str
    bindings: tuple[ImportBinding, ...]


@dataclass
class ModuleRecord:
    key: str
    source: str
    lines: list[str]
    imports: list[ImportRecord]
    dependencies: list[str]
    exports: list[tuple[str, str]]
    root: Path


def fail(message: str) -> None:
    raise ExportError(message)


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def parse_attrs(raw: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for match in HTML_ATTR.finditer(raw):
        value = next((match.group(name) for name in ("double", "single", "bare")
                      if match.group(name) is not None), "")
        attrs[match.group("name").lower()] = value
    return attrs


def read_reference_tree(site: Path) -> tuple[Path, dict[str, str], dict[str, bytes]]:
    if site.is_symlink():
        fail(f"--site must not be a symlink: {site}")
    try:
        root = site.resolve(strict=True)
    except OSError as exc:
        fail(f"Cannot resolve reference site: {exc}")
    if not root.is_dir():
        fail(f"--site must point to a reference-site directory: {root}")

    actual_top = {entry.name for entry in root.iterdir()}
    if actual_top != EXPECTED_TOP_LEVEL:
        missing = sorted(EXPECTED_TOP_LEVEL - actual_top)
        extra = sorted(actual_top - EXPECTED_TOP_LEVEL)
        fail(f"Unsupported site layout (missing={missing}, extra={extra}).")

    assets_dir = root / "assets"
    if assets_dir.is_symlink() or not assets_dir.is_dir():
        fail("The assets folder must be a real directory.")
    actual_assets = {entry.name for entry in assets_dir.iterdir()}
    if actual_assets != EXPECTED_ASSETS:
        missing = sorted(EXPECTED_ASSETS - actual_assets)
        extra = sorted(actual_assets - EXPECTED_ASSETS)
        fail(f"Unsupported asset layout (missing={missing}, extra={extra}).")

    text_files: dict[str, str] = {}
    png_files: dict[str, bytes] = {}
    for relative_path, expected_digest in FIXED_SITE_SHA256.items():
        file_path = root / relative_path
        if file_path.is_symlink() or not file_path.is_file():
            fail(f"Expected a regular file: {relative_path}")
        try:
            data = file_path.read_bytes()
        except OSError as exc:
            fail(f"Cannot read {relative_path}: {exc}")
        actual_digest = hashlib.sha256(data).hexdigest()
        if actual_digest != expected_digest:
            fail(
                "This exporter accepts only the byte-identical packaged plane-mirror example; "
                f"content differs at {relative_path}."
            )
        if relative_path.startswith("assets/"):
            name = relative_path.removeprefix("assets/")
            if not data.startswith(b"\x89PNG\r\n\x1a\n"):
                fail(f"Asset is not a PNG file: {relative_path}")
            png_files[name] = data
        else:
            try:
                text_files[relative_path] = data.decode("utf-8")
            except UnicodeError as exc:
                fail(f"Cannot read {relative_path} as UTF-8 text: {exc}")
    return root, text_files, png_files


def parse_named_bindings(clause: str, context: str) -> tuple[ImportBinding, ...]:
    match = NAMED_IMPORTS.fullmatch(clause.strip())
    if not match:
        fail(f"Only named imports are supported ({context}): {clause.strip()}")
    bindings: list[ImportBinding] = []
    for raw_name in match.group("names").split(","):
        raw_name = raw_name.strip()
        if not raw_name:
            continue
        name_match = IMPORT_NAME.fullmatch(raw_name)
        if not name_match:
            fail(f"Unsupported import binding in {context}: {raw_name}")
        imported = name_match.group("imported")
        local = name_match.group("local") or imported
        bindings.append(ImportBinding(imported=imported, local=local))
    if not bindings:
        fail(f"Empty named import is unsupported ({context}).")
    return tuple(bindings)


def parse_export_names(raw_names: str, context: str) -> list[tuple[str, str]]:
    exports: list[tuple[str, str]] = []
    for raw_name in raw_names.split(","):
        raw_name = raw_name.strip()
        if not raw_name:
            continue
        match = EXPORT_NAME.fullmatch(raw_name)
        if not match:
            fail(f"Unsupported export name in {context}: {raw_name}")
        local = match.group("local")
        exported = match.group("exported") or local
        exports.append((exported, local))
    if not exports:
        fail(f"Empty export list is unsupported ({context}).")
    return exports


def resolve_module_key(specifier: str, importer: str, root: Path) -> str:
    if not (specifier.startswith("./") or specifier.startswith("../")):
        fail(f"Only relative JavaScript module dependencies are supported: {specifier}")
    if "?" in specifier or "#" in specifier or ":" in specifier:
        fail(f"Query, fragment, and URL module dependencies are unsupported: {specifier}")
    if not specifier.endswith(".js"):
        fail(f"Only .js module dependencies are supported: {specifier}")
    parts = list(PurePosixPath(importer).parent.parts)
    for part in PurePosixPath(specifier).parts:
        if part in ("", ".", "/"):
            continue
        if part == "..":
            if not parts:
                fail(f"Module dependency escapes the reference site: {specifier!r} from {importer}")
            parts.pop()
        else:
            parts.append(part)
    if not parts:
        fail(f"Module dependency does not name a file: {specifier!r} from {importer}")
    candidate = root.joinpath(*parts)
    try:
        resolved = candidate.resolve(strict=True)
    except OSError as exc:
        fail(f"Missing module dependency {specifier!r} imported by {importer}: {exc}")
    if not is_within(resolved, root):
        fail(f"Module dependency escapes the reference site: {specifier!r} from {importer}")
    if resolved.is_symlink() or not resolved.is_file():
        fail(f"Module dependency must be a regular file: {specifier!r} from {importer}")
    key = resolved.relative_to(root).as_posix()
    if key not in EXPECTED_MODULES:
        fail(f"Module is outside the supported three-module graph: {key}")
    return key


def parse_module(key: str, source: str, root: Path) -> ModuleRecord:
    if re.search(r"\bimport\s*\(", source):
        fail(f"Dynamic imports are unsupported in {key}.")
    if re.search(r"\bimport\s*\.\s*meta\b", source):
        fail(f"import.meta is unsupported in {key}.")

    lines = source.splitlines(keepends=True)
    imports: list[ImportRecord] = []
    dependencies: list[str] = []
    exports: list[tuple[str, str]] = []

    for line_index, line in enumerate(lines):
        content = line.rstrip("\r\n")
        if re.match(r"^[ \t]*import\b", content):
            match = IMPORT_LINE.fullmatch(content)
            if not match:
                fail(f"Unsupported or multiline import in {key}:{line_index + 1}.")
            dependency = resolve_module_key(match.group("specifier"), key, root)
            bindings = parse_named_bindings(match.group("clause"), f"{key}:{line_index + 1}")
            imports.append(ImportRecord(line_index, match.group("specifier"), bindings))
            if dependency not in dependencies:
                dependencies.append(dependency)
            continue

        if re.match(r"^[ \t]*export\b", content):
            declaration = EXPORT_DECL.fullmatch(content)
            if declaration:
                exports.append((declaration.group("name"), declaration.group("name")))
                continue
            export_list = EXPORT_LIST.fullmatch(content)
            if export_list:
                exports.extend(parse_export_names(export_list.group("names"), f"{key}:{line_index + 1}"))
                continue
            fail(f"Unsupported export syntax in {key}:{line_index + 1}.")

    export_names = [name for name, _ in exports]
    if len(export_names) != len(set(export_names)):
        fail(f"Duplicate exported names in {key}.")
    return ModuleRecord(key, source, lines, imports, dependencies, exports, root)


def build_module_graph(entry: str, sources: dict[str, str], root: Path) -> tuple[list[str], dict[str, ModuleRecord]]:
    records: dict[str, ModuleRecord] = {}
    states: dict[str, int] = {}
    order: list[str] = []
    stack: list[str] = []

    def visit(key: str) -> None:
        state = states.get(key, 0)
        if state == 1:
            start = stack.index(key) if key in stack else 0
            cycle = " -> ".join(stack[start:] + [key])
            fail(f"Circular module dependency is unsupported: {cycle}")
        if state == 2:
            return
        if key not in EXPECTED_MODULES or key not in sources:
            fail(f"Missing or unsupported module: {key}")
        states[key] = 1
        stack.append(key)
        record = parse_module(key, sources[key], root)
        records[key] = record
        for dependency in record.dependencies:
            visit(dependency)
        stack.pop()
        states[key] = 2
        order.append(key)

    visit(entry)
    found = set(order)
    if found != EXPECTED_MODULES:
        fail(f"The supported module graph must include exactly {sorted(EXPECTED_MODULES)}; found {sorted(found)}.")
    return order, records


def render_module(record: ModuleRecord, module_vars: dict[str, str]) -> str:
    imports_by_line = {item.line_index: item for item in record.imports}
    lines: list[str] = []
    for line_index, line in enumerate(record.lines):
        ending = "\n" if line.endswith("\n") else ""
        content = line.rstrip("\r\n")
        imported = imports_by_line.get(line_index)
        if imported:
            dependency_key = resolve_module_key(imported.specifier, record.key, record.root)
            dependency_var = module_vars[dependency_key]
            names = []
            for binding in imported.bindings:
                names.append(binding.imported if binding.imported == binding.local
                             else f"{binding.imported}: {binding.local}")
            lines.append(f"const {{ {', '.join(names)} }} = {dependency_var};{ending}")
            continue

        declaration = EXPORT_DECL.fullmatch(content)
        if declaration:
            # Strip only the module keyword; the declaration stays in its local IIFE scope.
            lines.append(f"{declaration.group('indent')}{declaration.group('declaration')}{ending}")
            continue
        if EXPORT_LIST.fullmatch(content):
            lines.append(ending)
            continue
        lines.append(line)

    properties = []
    for exported, local in record.exports:
        properties.append(exported if exported == local else f"{exported}: {local}")
    body = "".join(lines)
    if body and not body.endswith("\n"):
        body += "\n"
    exports_object = ", ".join(properties)
    return "(() => {\n" + body + f"return Object.freeze({{ {exports_object} }});\n}})()"


def inline_js_assets(module_sources: dict[str, str], girl_uri: str) -> dict[str, str]:
    result = dict(module_sources)
    replacements = {
        "site.js": ('src="./assets/girl.png"', 'src="${__inlineAssets.girl}"', 1),
        "lab.js": ('href="./assets/girl.png"', 'href="${__inlineAssets.girl}"', 2),
    }
    for module, (needle, replacement, expected_count) in replacements.items():
        source = result[module]
        count = source.count(needle)
        if count != expected_count:
            fail(f"Unsupported girl.png reference pattern in {module}: expected {expected_count}, found {count}.")
        result[module] = source.replace(needle, replacement)
    # Ensure the data URI remains available in the bundle builder's outer lexical scope.
    if not girl_uri.startswith("data:image/png;base64,"):
        fail("Internal error: girl image data URI was not built.")
    return result


def escape_script_end_tags(source: str) -> str:
    # In a JS string/template literal, \/ evaluates to / while preventing HTML's
    # raw-text parser from treating source content as the end of this script tag.
    return SCRIPT_END_TAG.sub(lambda match: "<\\/" + match.group(0)[2:], source)


def replace_asset_references(text: str, asset_uris: dict[str, str], context: str) -> str:
    def replace(match: re.Match[str]) -> str:
        name = match.group("name")
        if name not in asset_uris:
            fail(f"Unsupported or missing asset reference in {context}: {match.group(0)}")
        return asset_uris[name]

    updated = ASSET_REFERENCE.sub(replace, text)
    unknown_relative = re.search(r"\./assets/[^\s\"'`)>]+", updated)
    if unknown_relative:
        fail(f"Could not fully resolve an asset reference in {context}: {unknown_relative.group(0)}")
    return updated


def make_module_bundle(order: list[str], records: dict[str, ModuleRecord], sources: dict[str, str], girl_uri: str) -> str:
    # The known site uses one girl illustration in three template attributes.
    # Keep its base64 payload once in the shared outer scope instead of repeating it.
    module_sources = inline_js_assets(sources, girl_uri)
    for key, source in module_sources.items():
        records[key].source = source
        records[key].lines = source.splitlines(keepends=True)
        # The asset substitutions are inside the site's SVG/HTML template literals.
        if "./assets/" in source:
            fail(f"Could not inline all JavaScript assets in {key}.")

    # Reparse imports/exports after the asset-only source substitutions.
    reparsed: dict[str, ModuleRecord] = {}
    for key in order:
        reparsed[key] = parse_module(key, module_sources[key], records[key].root)

    module_vars = {key: f"__mirror_module_{index}" for index, key in enumerate(order)}
    pieces = [
        "(() => {",
        '  "use strict";',
        f"  const __inlineAssets = Object.freeze({{ girl: {json.dumps(girl_uri)} }});",
    ]
    for key in order:
        module = render_module(reparsed[key], module_vars)
        pieces.append(f"  const {module_vars[key]} = {module};")
    pieces.append("})();")
    bundle = "\n".join(pieces)
    return escape_script_end_tags(bundle)


def validate_css_resources(css: str, filename: str) -> None:
    if re.search(r"@import\b", css, re.I):
        fail(f"CSS imports are unsupported in this single-file export: {filename}")
    for match in CSS_URL.finditer(css):
        reference = match.group("url").strip()
        if reference.startswith("data:image/png;base64,") or reference.startswith("#"):
            continue
        fail(f"Unsupported CSS resource in {filename}: {reference!r}")


def build_single_html(site: Path) -> tuple[str, dict[str, bytes], int]:
    root, files, png_files = read_reference_tree(site)
    asset_uris = {
        name: "data:image/png;base64," + base64.b64encode(data).decode("ascii")
        for name, data in png_files.items()
    }

    css = {}
    for name in ("site.css", "lab.css"):
        css[name] = replace_asset_references(files[name], asset_uris, name)
        if re.search(r"</style", css[name], re.I):
            fail(f"A literal </style sequence cannot be safely embedded in {name}.")
        validate_css_resources(css[name], name)

    module_sources = {name: files[name] for name in EXPECTED_MODULES}
    order, records = build_module_graph("site.js", module_sources, root)
    bundle = make_module_bundle(order, records, module_sources, asset_uris["girl.png"])

    html = files["index.html"]
    stylesheet_counts: dict[str, int] = {"site.css": 0, "lab.css": 0}
    script_count = 0

    def replace_tag(match: re.Match[str]) -> str:
        nonlocal script_count
        tag = match.group("tag").lower()
        attrs = parse_attrs(match.group("attrs"))
        if tag == "link" and attrs.get("rel", "").lower() == "stylesheet":
            href = attrs.get("href", "")
            stylesheet = href[2:] if href.startswith("./") else href
            if stylesheet not in css:
                fail(f"Unsupported stylesheet link in index.html: {href!r}")
            stylesheet_counts[stylesheet] += 1
            return f"<style>\n{css[stylesheet]}\n</style>"
        if tag == "script":
            script_count += 1
            if script_count != 1 or attrs.get("type", "").lower() != "module" or attrs.get("src") != "./site.js":
                fail("index.html must contain only the known external site.js module entrypoint.")
            return f"<script>\n{bundle}\n</script>"
        return match.group(0)

    html = HTML_TAG.sub(replace_tag, html)
    if stylesheet_counts != {"site.css": 1, "lab.css": 1}:
        fail(f"Expected one link to each site stylesheet, found {stylesheet_counts}.")
    if script_count != 1:
        fail("Expected one site.js module entrypoint in index.html.")

    validate_single_html(html, asset_uris, order)
    return html, png_files, len(order)


def validate_single_html(html: str, asset_uris: dict[str, str], module_order: list[str]) -> None:
    if not html.lower().startswith("<!doctype html>"):
        fail("The output must retain an HTML5 doctype.")
    if "<meta charset=\"utf-8\">" not in html.lower():
        # Attribute order/casing can vary, so use a whitespace-insensitive fallback.
        if not re.search(r"<meta\b[^>]*charset\s*=\s*['\"]?utf-8", html, re.I):
            fail("The output must declare UTF-8 for Chinese text.")

    if re.search(r"<link\b[^>]*\brel\s*=\s*['\"]stylesheet", html, re.I):
        fail("A stylesheet link remains external to the single HTML file.")
    if re.search(r"<script\b[^>]*\bsrc\s*=", html, re.I):
        fail("A script src remains external to the single HTML file.")
    if "./assets/" in html or "./site.css" in html or "./lab.css" in html or "./site.js" in html:
        fail("A relative site resource reference remains in the output.")
    if re.search(r"\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\s*\(|\bEventSource\s*\(", html):
        fail("Network APIs are unsupported in this offline reference export.")
    if re.search(r"\b(?:import|export)\b", html):
        fail("JavaScript module syntax remains in the single-script output.")

    external = [url for url in re.findall(r"https?://[^\s\"'<>]+", html, re.I)
                if url.rstrip(".,);]") != "http://www.w3.org/2000/svg"]
    if external:
        fail(f"External URL remains in the output: {external[0]}")
    if re.search(r"/Users/|CloudStorage|\.openai(?:/|\b)|\.git(?:/|\b)|site[_-]?id|project[_-]?id", html, re.I):
        fail("Author paths or site/project identity metadata remain in the output.")

    scripts = list(SCRIPT_TAG.finditer(html))
    if len(scripts) != 1:
        fail(f"Expected one inline runtime script, found {len(scripts)}.")
    script_body = scripts[0].group("body")
    if re.search(r"</script", script_body, re.I):
        fail("An unescaped script end tag remains inside the inline JavaScript.")
    if "const __inlineAssets" not in script_body:
        fail("The shared inline image reference is missing from the script.")
    if len(module_order) != 3:
        fail(f"Expected three stitched JavaScript modules; found {len(module_order)}.")

    for name, uri in asset_uris.items():
        if uri not in html:
            fail(f"PNG asset was not embedded in the output: {name}")
        decoded = base64.b64decode(uri.split(",", 1)[1], validate=True)
        if not decoded.startswith(b"\x89PNG\r\n\x1a\n"):
            fail(f"Embedded asset did not decode as PNG: {name}")
    style_count = len(re.findall(r"<style\b", html, re.I))
    if style_count != 2:
        fail(f"Expected two inline style blocks; found {style_count}.")


def cli() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Export only the bundled frozen plane-mirror example or a byte-identical copy as one "
            "self-contained HTML file. Modified sites are refused; author new questions directly "
            "as self-contained HTML."
        )
    )
    parser.add_argument("--site", metavar="ABS", help="absolute folder; must be a byte-identical copy of this package's reference-site")
    parser.add_argument("--output", required=True, metavar="ABS.html", help="absolute path to a new .html file; existing files are refused")
    args = parser.parse_args()

    site_arg = Path(args.site).expanduser() if args.site else DEFAULT_SITE
    output_arg = Path(args.output).expanduser()
    if args.site and not site_arg.is_absolute():
        parser.error("--site must be an absolute path")
    if not output_arg.is_absolute():
        parser.error("--output must be an absolute path")
    if output_arg.suffix.lower() != ".html":
        parser.error("--output must end in .html")

    try:
        resolved_site = site_arg.resolve(strict=True)
        resolved_output = output_arg.resolve(strict=False)
    except OSError as exc:
        print(f"Path error: {exc}", file=sys.stderr)
        return 2
    if not resolved_site.is_dir():
        print(f"Site directory does not exist: {resolved_site}", file=sys.stderr)
        return 2
    if is_within(resolved_output, resolved_site):
        print("Output must be outside the read-only reference-site directory.", file=sys.stderr)
        return 2
    if os.path.lexists(output_arg):
        print(f"Output already exists; refusing to overwrite: {output_arg}", file=sys.stderr)
        return 2

    try:
        html, png_files, module_count = build_single_html(resolved_site)
        output_arg.parent.mkdir(parents=True, exist_ok=True)
        with output_arg.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(html)
    except ExportError as exc:
        print(f"Unsupported reference site: {exc}", file=sys.stderr)
        return 2
    except FileExistsError:
        print(f"Output already exists; refusing to overwrite: {output_arg}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"Export failed: {exc}", file=sys.stderr)
        return 1

    size = output_arg.stat().st_size
    print(f"Created {output_arg} ({module_count} inline modules, {len(png_files)} embedded PNGs, {size:,} bytes).")
    return 0


if __name__ == "__main__":
    raise SystemExit(cli())
