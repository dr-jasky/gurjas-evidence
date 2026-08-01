#!/usr/bin/env python3
"""Build the Gurjas site, then publish the governed advisory-network fragments.

The established builder remains unchanged in build_site_core.py. This focused
post-build layer keeps the homepage and Advisory page content static, readable
without JavaScript and independently testable while PR #50 is isolated.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = Path(__file__).with_name("build_site_core.py")
FRAGMENTS = ROOT / "site" / "fragments"
DEFAULT_OUTPUT = ROOT / "_site"


def resolved_output(argv: list[str]) -> Path:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args, _ = parser.parse_known_args(argv)
    return (args.output if args.output.is_absolute() else ROOT / args.output).resolve()


def ensure_assets(document: str, root: str) -> str:
    additions: list[str] = []
    if "advisory-network.css" not in document:
        additions.append(f'<link rel="stylesheet" href="{root}assets/advisory-network.css?v=1">')
    if "advisory-network.js" not in document:
        additions.append(f'<script src="{root}assets/advisory-network.js?v=1" defer></script>')
    if not additions:
        return document
    if "</head>" not in document:
        raise RuntimeError("Generated page has no closing head element")
    return document.replace("</head>", "\n".join(additions) + "\n</head>", 1)


def replace_meta_description(document: str, description: str) -> str:
    patterns = (
        r'(<meta name="description" content=")[^"]*(">)',
        r'(<meta property="og:description" content=")[^"]*(">)',
        r'(<meta name="twitter:description" content=")[^"]*(">)',
    )
    for pattern in patterns:
        document, count = re.subn(pattern, rf"\g<1>{description}\g<2>", document, count=1)
        if count != 1:
            raise RuntimeError(f"Could not update advisory metadata with pattern: {pattern}")
    return document


def publish_advisory_network(output: Path) -> None:
    home_fragment = (FRAGMENTS / "home-advisory.html").read_text(encoding="utf-8").strip()
    advisory_main = (FRAGMENTS / "advisory-main.html").read_text(encoding="utf-8").strip()

    home_path = output / "index.html"
    home = ensure_assets(home_path.read_text(encoding="utf-8"), "")
    if "home-advisory-network" not in home:
        marker = '<section class="home-section home-section--dark" aria-labelledby="h-tools">'
        if home.count(marker) != 1:
            raise RuntimeError("Homepage tools marker is missing or ambiguous")
        home = home.replace(marker, home_fragment + "\n\n" + marker, 1)
    home_path.write_text(home, encoding="utf-8")

    advisory_path = output / "advisory" / "index.html"
    advisory = ensure_assets(advisory_path.read_text(encoding="utf-8"), "../")
    advisory, count = re.subn(
        r'<main id="main">[\s\S]*?</main>',
        advisory_main,
        advisory,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Advisory page main element is missing or ambiguous")
    advisory = replace_meta_description(
        advisory,
        "Meet Gurjas's honorary, non-executive advisers and the selectively growing international network widening its disciplinary and geographic perspective.",
    )
    advisory_path.write_text(advisory, encoding="utf-8")

    about_path = output / "about" / "index.html"
    about = ensure_assets(about_path.read_text(encoding="utf-8"), "../")
    about_path.write_text(about, encoding="utf-8")

    print("Published the governed international advisory network on Home, About and Advisory pages")


def main() -> None:
    subprocess.run([sys.executable, str(CORE), *sys.argv[1:]], cwd=ROOT, check=True)
    publish_advisory_network(resolved_output(sys.argv[1:]))


if __name__ == "__main__":
    main()
