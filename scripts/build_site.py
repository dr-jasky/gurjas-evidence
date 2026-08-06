#!/usr/bin/env python3
"""Build the Gurjas site and apply registered static-page composition."""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from advisory_composition import compose_document, composed_paths
from home_command_bridge import apply_home_command_bridge
from home_institutional_composition import apply_home_institutional_composition
from home_navigation_utility import restore_compact_site_guide
from product_front_door import compose_product_front_door
from tool_evidence_loop import compose_tool_evidence_loop, tool_evidence_paths
from tool_standard_panel import compose_tool_standard_panel, tool_standard_paths

ROOT = Path(__file__).resolve().parents[1]
CORE = Path(__file__).with_name("build_site_core.py")
DEFAULT_OUTPUT = ROOT / "_site"
TOOLS_OPERATING_SYSTEM_STYLESHEET = (
    '<link rel="stylesheet" href="../assets/tools-operating-system.css?v=110">'
)
LEGACY_GUIDE_ITEM_RE = re.compile(
    r'\s*<li class="nav-guide-item"><button[\s\S]*?data-site-guide[\s\S]*?</button></li>',
    re.IGNORECASE,
)
COMPACT_GUIDE_RE = re.compile(
    r'\s*<button class="nav-guide nav-guide--compact"[\s\S]*?data-site-guide[\s\S]*?</button>',
    re.IGNORECASE,
)
PRIMARY_NAV_RE = re.compile(
    r'<nav id="nav" class="site-nav" aria-label="Primary">[\s\S]*?<ul>(?P<items>[\s\S]*?)</ul>',
    re.IGNORECASE,
)
EXPECTED_NAVIGATION = (
    ("about/", "About"),
    ("services/", "Services"),
    ("tools/", "Tools"),
    ("knowledge/", "Library"),
    ("insights/", "Insights"),
    ("contact/", "Contact"),
)


def resolved_output(argv: list[str]) -> Path:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args, _ = parser.parse_known_args(argv)
    return (args.output if args.output.is_absolute() else ROOT / args.output).resolve()


def registered_paths() -> tuple[str, ...]:
    return tuple(
        sorted(set(composed_paths()) | set(tool_evidence_paths()) | set(tool_standard_paths()))
    )


def assert_core_safeguards() -> None:
    """Refuse to delegate to a core builder missing its indexing controls."""
    source = CORE.read_text(encoding="utf-8")
    required = (
        "write_generated_sitemap(output)",
        'git", "log", "-1", "--format=%cs"',
    )
    missing = [marker for marker in required if marker not in source]
    if missing:
        raise RuntimeError("Delegated builder is missing indexing safeguards: " + ", ".join(missing))


def apply_tools_operating_system(document: str) -> str:
    """Load the Tools Hub design directly so cached parent CSS cannot hide it."""
    if TOOLS_OPERATING_SYSTEM_STYLESHEET in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Tools Hub has no closing head element")
    return document.replace(
        "</head>", f"{TOOLS_OPERATING_SYSTEM_STYLESHEET}\n</head>", 1
    )


def publish_registered_composition(output: Path) -> None:
    for relative_path in registered_paths():
        target = output / relative_path
        if not target.exists():
            raise RuntimeError(f"Composed public page is missing: {relative_path}")
        source = target.read_text(encoding="utf-8")
        composed = compose_tool_standard_panel(relative_path, source)
        composed = compose_tool_evidence_loop(relative_path, composed)
        composed = compose_document(relative_path, composed)
        if relative_path == "tools/index.html":
            composed = apply_tools_operating_system(composed)
        if relative_path == "index.html":
            composed, removed = COMPACT_GUIDE_RE.subn("", composed, count=1)
            if removed != 1:
                raise RuntimeError("Homepage shared route helper is missing before composition")
            composed = compose_product_front_door(composed)
            composed = apply_home_institutional_composition(composed)
            composed = apply_home_command_bridge(composed)
            composed = restore_compact_site_guide(composed)
        target.write_text(composed, encoding="utf-8")
    print(
        "Published registered composition, including the homepage product front door, "
        "shared tool standard and Research Library evidence loop"
    )


def publish_sitewide_navigation(output: Path) -> None:
    """Enforce one six-link header and one compact route helper on every public page."""
    checked = 0
    for target in sorted(output.rglob("*.html")):
        source = target.read_text(encoding="utf-8")
        if 'data-site-system="header"' not in source:
            continue

        source = LEGACY_GUIDE_ITEM_RE.sub("", source)
        match = PRIMARY_NAV_RE.search(source)
        if not match:
            raise RuntimeError(f"{target.relative_to(output)}: governed primary navigation is missing")
        items = match.group("items")

        if "has-sub" in items or "subnav" in items or "Our Work" in items:
            raise RuntimeError(f"{target.relative_to(output)}: obsolete dropdown navigation remains")
        if len(re.findall(r"<li(?:\s|>)", items)) != 6:
            raise RuntimeError(f"{target.relative_to(output)}: primary navigation must contain six list items")
        for path, label in EXPECTED_NAVIGATION:
            link = re.compile(
                rf'<a href="(?:\.\./)*{re.escape(path)}"[^>]*>{re.escape(label)}</a>',
                re.IGNORECASE,
            )
            if not link.search(items):
                raise RuntimeError(f"{target.relative_to(output)}: missing direct {label} navigation link")
        if source.count("data-site-guide") != 1:
            raise RuntimeError(f"{target.relative_to(output)}: expected exactly one compact route helper")
        if 'assets/site-nav-compact.css?v=1' not in source:
            raise RuntimeError(f"{target.relative_to(output)}: compact navigation stylesheet is missing")

        target.write_text(source, encoding="utf-8")
        checked += 1

    if checked == 0:
        raise RuntimeError("No generated pages exposed the governed site header")
    print(f"Published one governed six-link navigation across {checked} generated pages")


def git_value(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def publish_release_manifest(output: Path) -> None:
    """Expose deterministic provenance so production can prove its exact source commit."""
    source_commit = os.environ.get("GITHUB_SHA", "").strip().lower()
    if not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        source_commit = git_value("rev-parse", "HEAD").lower()
    source_date = git_value("show", "-s", "--format=%cI", source_commit)
    source_ref = os.environ.get("GITHUB_REF_NAME", "").strip() or git_value("rev-parse", "--abbrev-ref", "HEAD")
    site_data = json.loads((ROOT / "site" / "data" / "site.json").read_text(encoding="utf-8"))
    manifest = {
        "schemaVersion": 1,
        "site": "https://gurjas.org/",
        "sourceCommit": source_commit,
        "sourceDate": source_date,
        "sourceRef": source_ref,
        "navigationVersion": site_data.get("navigationVersion"),
        "buildSystem": "scripts/build_site.py",
    }
    (output / "release.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Published release provenance for source commit {source_commit}")


def main() -> None:
    assert_core_safeguards()
    subprocess.run([sys.executable, str(CORE), *sys.argv[1:]], cwd=ROOT, check=True)
    output = resolved_output(sys.argv[1:])
    publish_registered_composition(output)
    publish_sitewide_navigation(output)
    publish_release_manifest(output)


if __name__ == "__main__":
    main()
