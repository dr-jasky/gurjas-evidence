#!/usr/bin/env python3
"""Bridge the governed homepage composition to the institutional design system."""
from __future__ import annotations

import re

CAPABILITY_STYLESHEET_RE = re.compile(
    r'\s*<link rel="stylesheet" href="(?:\./)?assets/capability-metrics\.css\?v=[^"]+">',
    re.IGNORECASE,
)
INSTITUTIONAL_STYLESHEET = "assets/home-institutional.css?v=1"
TOOL_STRUCTURE_STYLESHEET = "assets/home-tool-card-structure.css?v=1"


def ensure_stylesheet(document: str, href: str) -> str:
    """Load one homepage stylesheet once in deterministic order."""
    if href in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Homepage has no closing head element")
    return document.replace(
        "</head>",
        f'<link rel="stylesheet" href="{href}">\n</head>',
        1,
    )


def apply_home_command_bridge(document: str) -> str:
    """Remove superseded capability CSS and load the final homepage layers."""
    document = CAPABILITY_STYLESHEET_RE.sub("", document, count=1)
    document = ensure_stylesheet(document, TOOL_STRUCTURE_STYLESHEET)
    document = ensure_stylesheet(document, INSTITUTIONAL_STYLESHEET)
    return document
