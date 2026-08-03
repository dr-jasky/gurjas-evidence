#!/usr/bin/env python3
"""Registered static-page composition for governed site additions.

Both the build pipeline and the output-integrity checker import this module.
That keeps permitted transformations explicit, deterministic and testable;
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


def ensure_stylesheet(document: str, href: str) -> str:
    if href in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Composed page has no closing head element")
    return document.replace("</head>", f'<link rel="stylesheet" href="{href}">\n</head>', 1)


def ensure_script(document: str, src: str) -> str:
    if src in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Composed page has no closing head element")
    return document.replace("</head>", f'<script src="{src}" defer></script>\n</head>', 1)


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
        document = ensure_stylesheet(document, "assets/home-engagement.css?v=1")
        tools_marker = '<section class="home-section home-section--dark" aria-labelledby="h-tools">'
        if "home-advisory-network" not in document:
            if document.count(tools_marker) != 1:
                raise RuntimeError("Homepage tools marker is missing or ambiguous")
            fragment = (FRAGMENTS / "home-advisory.html").read_text(encoding="utf-8").strip()
            document = document.replace(tools_marker, fragment + "\n\n" + tools_marker, 1)
        if "home-engagement-pathway" not in document:
            if document.count(tools_marker) != 1:
                raise RuntimeError("Homepage tools marker is missing or ambiguous")
            fragment = (FRAGMENTS / "home-engagement.html").read_text(encoding="utf-8").strip()
            document = document.replace(tools_marker, fragment + "\n\n" + tools_marker, 1)
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

    if normalized == "services/index.html":
        document = ensure_stylesheet(document, "../assets/services-clinic.css?v=1")
        marker = '<section class="evidence-dashboard-section" aria-labelledby="evidence-dashboard-title">'
        fragment_marker = "services-clinic-note"
        if fragment_marker not in document:
            if document.count(marker) != 1:
                raise RuntimeError("Services evidence-dashboard marker is missing or ambiguous")
            fragment = (FRAGMENTS / "services-integrity-clinic.html").read_text(encoding="utf-8").strip()
            document = document.replace(marker, fragment + "\n\n" + marker, 1)
        return document

    if normalized == "publications/index.html":
        document = ensure_stylesheet(document, "../assets/publication-discovery.css?v=1")
        document = ensure_script(document, "../assets/publication-discovery.js?v=1")
        heading_map = {
            "<h2>Journal articles</h2>": '<h2 id="journal-articles">Journal articles</h2>',
            "<h2>Book chapters</h2>": '<h2 id="book-chapters">Book chapters</h2>',
            "<h2>Working papers &amp; under review</h2>": '<h2 id="working-papers">Working papers &amp; under review</h2>',
            "<h2>Research profiles</h2>": '<h2 id="research-profiles">Research profiles</h2>',
        }
        for marker, replacement in heading_map.items():
            if replacement not in document:
                if document.count(marker) != 1:
                    raise RuntimeError(f"Publication heading is missing or ambiguous: {marker}")
                document = document.replace(marker, replacement, 1)
        marker = '<section>\n  <div class="wrap prose" style="max-width:56em">\n    <h2 id="journal-articles">'
        fragment_marker = '<section class="publication-discovery" aria-labelledby="publication-discovery-title">'
        if fragment_marker not in document:
            if document.count(marker) != 1:
                raise RuntimeError("Publication list marker is missing or ambiguous")
            fragment = (FRAGMENTS / "publication-discovery.html").read_text(encoding="utf-8").strip()
            document = document.replace(marker, fragment + "\n\n" + marker, 1)
        return document

    return document


def composed_paths() -> tuple[str, ...]:
    return ("index.html", "about/index.html", "advisory/index.html", "services/index.html", "publications/index.html")
