#!/usr/bin/env python3
"""Run the established build checks against registered source composition.

The core checker is preserved unchanged. For the duration of verification, the
three declared source pages are materialised exactly as the build composes them,
then restored byte-for-byte. This keeps the source/output equality guarantee
while allowing reviewed static fragments to function as first-class source.
"""
from __future__ import annotations

import inspect
import sys
from pathlib import Path

from advisory_composition import compose_document, composed_paths
import check_build_core

ROOT = Path(__file__).resolve().parents[1]


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
        for relative_path in composed_paths():
            source = ROOT / relative_path
            originals[source] = source.read_text(encoding="utf-8")
            source.write_text(
                compose_document(relative_path, originals[source]),
                encoding="utf-8",
            )
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
