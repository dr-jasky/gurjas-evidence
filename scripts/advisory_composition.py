#!/usr/bin/env python3
"""Registered static-page composition for the international advisory network.

Both the build pipeline and the output-integrity checker import this module.
That keeps the permitted transformation explicit, deterministic and testable;
all unregistered changes to page-specific main content continue to fail CI.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRAGMENTS = ROOT / "site" / "fragments"


def ensure_assets(document: str, root: str) -> str:
    additions: list[str] = []
    if "advisory-network.css" not in document:
        additions.append(f'<link rel="stylesheet" href="{root}assets/advisory-network.css?v=1">')
    if "advisory-network.js" not in document:
        additions.append(f'<script src="{root}assets/advisory-network.js?v=1" defer></script>')
    if not additions:
        return document
    if "</head>" not in document:
        raise RuntimeError("Composed page has no closing head element")
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


def compose_document(relative_path: str, document: str) -> str:
    """Return the declared source composition for one public page."""
    normalized = relative_path.replace("\\", "/")

    if normalized == "index.html":
        document = ensure_assets(document, "")
        if "home-advisory-network" not in document:
            marker = '<section class="home-section home-section--dark" aria-labelledby="h-tools">'
            if document.count(marker) != 1:
                raise RuntimeError("Homepage tools marker is missing or ambiguous")
            fragment = (FRAGMENTS / "home-advisory.html").read_text(encoding="utf-8").strip()
            document = document.replace(marker, fragment + "\n\n" + marker, 1)
        return document

    if normalized == "advisory/index.html":
        document = ensure_assets(document, "../")
        main = (FRAGMENTS / "advisory-main.html").read_text(encoding="utf-8").strip()
        document, count = re.subn(r'<main id="main">[\s\S]*?</main>', main, document, count=1)
        if count != 1:
            raise RuntimeError("Advisory page main element is missing or ambiguous")
        return replace_meta_description(
            document,
            "Meet Gurjas's honorary, non-executive advisers and the selectively growing international network widening its disciplinary and geographic perspective.",
        )

    if normalized == "about/index.html":
        document = ensure_assets(document, "../")
        marker = '<div class="about-advisory" aria-labelledby="about-advisory-title">'
        replacement = '<div class="about-advisory" role="region" aria-labelledby="about-advisory-title">'
        if marker in document:
            if document.count(marker) != 1:
                raise RuntimeError("About-page advisory region is ambiguous")
            document = document.replace(marker, replacement, 1)
        elif replacement not in document:
            raise RuntimeError("About-page advisory region is missing")
        return document

    return document


def composed_paths() -> tuple[str, ...]:
    return ("index.html", "about/index.html", "advisory/index.html")
