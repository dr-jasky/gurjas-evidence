#!/usr/bin/env python3
"""Homepage-only placement for the governed site-guide control."""
from __future__ import annotations


STYLESHEET = "assets/home-nav-compact.css?v=1"


def ensure_stylesheet(document: str) -> str:
    if STYLESHEET in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Homepage has no closing head element")
    return document.replace(
        "</head>",
        f'<link rel="stylesheet" href="{STYLESHEET}">\n</head>',
        1,
    )


def restore_compact_site_guide(document: str) -> str:
    """Restore one accessible guide trigger outside the six-link homepage list."""
    count = document.count("data-site-guide")
    if count == 1:
        return ensure_stylesheet(document)
    if count != 0:
        raise RuntimeError("Homepage site-guide control is duplicated")

    marker = '<div class="nav-trust">'
    if document.count(marker) != 1:
        raise RuntimeError("Homepage navigation trust marker is missing or ambiguous")

    guide = (
        '<button class="nav-guide nav-guide--compact" type="button" '
        'aria-haspopup="dialog" aria-expanded="false" '
        'aria-controls="gurjas-site-guide" data-site-guide '
        'aria-label="Find your route">'
        '<span class="nav-guide__glyph" aria-hidden="true">↗</span>'
        '</button>'
    )
    document = document.replace(marker, guide + "\n      " + marker, 1)
    return ensure_stylesheet(document)
