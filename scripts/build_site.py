#!/usr/bin/env python3
"""Build the Gurjas site and apply registered static-page composition."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from advisory_composition import compose_document, composed_paths
from home_navigation_utility import restore_compact_site_guide
from product_front_door import compose_product_front_door
from tool_evidence_loop import compose_tool_evidence_loop, tool_evidence_paths

ROOT = Path(__file__).resolve().parents[1]
CORE = Path(__file__).with_name("build_site_core.py")
DEFAULT_OUTPUT = ROOT / "_site"


def resolved_output(argv: list[str]) -> Path:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args, _ = parser.parse_known_args(argv)
    return (args.output if args.output.is_absolute() else ROOT / args.output).resolve()


def registered_paths() -> tuple[str, ...]:
    return tuple(sorted(set(composed_paths()) | set(tool_evidence_paths())))


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


def publish_registered_composition(output: Path) -> None:
    for relative_path in registered_paths():
        target = output / relative_path
        if not target.exists():
            raise RuntimeError(f"Composed public page is missing: {relative_path}")
        source = target.read_text(encoding="utf-8")
        composed = compose_tool_evidence_loop(relative_path, source)
        composed = compose_document(relative_path, composed)
        if relative_path == "index.html":
            composed = compose_product_front_door(composed)
            composed = restore_compact_site_guide(composed)
        target.write_text(composed, encoding="utf-8")
    print("Published registered composition, including the homepage product front door and tool evidence loop")


def main() -> None:
    assert_core_safeguards()
    subprocess.run([sys.executable, str(CORE), *sys.argv[1:]], cwd=ROOT, check=True)
    publish_registered_composition(resolved_output(sys.argv[1:]))


if __name__ == "__main__":
    main()
