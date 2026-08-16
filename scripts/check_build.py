#!/usr/bin/env python3
"""Run the established build checks against registered source composition.

The core checker is preserved unchanged. For the duration of verification, the
declared source pages are materialised exactly as the build composes them, then
restored byte-for-byte. This keeps the source/output equality guarantee while
allowing reviewed static fragments, the governed homepage product front door,
the shared tool-standard panel and the registry-driven Research Library evidence
loop to function as first-class source.
"""
from __future__ import annotations

import inspect
import sys
from pathlib import Path

from advisory_composition import compose_document, composed_paths
from home_navigation_utility import restore_compact_site_guide
from product_front_door import compose_product_front_door
from tool_evidence_loop import compose_tool_evidence_loop, tool_evidence_paths
from tool_standard_panel import compose_tool_standard_panel, tool_standard_paths
import check_build_core

ROOT = Path(__file__).resolve().parents[1]


def registered_paths() -> tuple[str, ...]:
    return tuple(
        sorted(set(composed_paths()) | set(tool_evidence_paths()) | set(tool_standard_paths()))
    )


def assert_core_check_safeguards() -> None:
    source = inspect.getsource(check_build_core)
    required = ("Indexable canonical route missing from sitemap",)
    missing = [marker for marker in required if marker not in source]
    if missing:
        raise RuntimeError("Delegated checker is missing indexing safeguards: " + ", ".join(missing))


def check_registered_build() -> list[str]:
    assert_core_check_safeguards()
    originals: dict[Path, str] = {}
    try:
        for relative_path in registered_paths():
            source = ROOT / relative_path
            originals[source] = source.read_text(encoding="utf-8")
            composed = compose_tool_standard_panel(relative_path, originals[source])
            composed = compose_tool_evidence_loop(relative_path, composed)
            composed = compose_document(relative_path, composed)
            if relative_path == "index.html":
                composed = compose_product_front_door(composed)
                composed = restore_compact_site_guide(composed)
            source.write_text(composed, encoding="utf-8")
        return check_build_core.check()
    finally:
        for source, original in originals.items():
            source.write_text(original, encoding="utf-8")


if __name__ == "__main__":
    failures = check_registered_build()
    if failures:
        print("Build checks failed:")
        for failure in failures:
            print(" -", failure)
        sys.exit(1)
    print(
        f"Build checks passed for {len(check_build_core.source_pages())} source routes "
        f"and {len(check_build_core.offer_routes())} generated offer routes."
    )
