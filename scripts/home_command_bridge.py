#!/usr/bin/env python3
"""Bridge the governed homepage composition to the structural command-centre design."""
from __future__ import annotations

import re

CAPABILITY_STYLESHEET_RE = re.compile(
    r'\s*<link rel="stylesheet" href="(?:\./)?assets/capability-metrics\.css\?v=[^"]+">',
    re.IGNORECASE,
)
COMMAND_STYLESHEET = "assets/home-command-centre-live.css?v=2"


def apply_home_command_bridge(document: str) -> str:
    """Remove the superseded capability bundle and load the live generated-home design."""
    document = CAPABILITY_STYLESHEET_RE.sub("", document, count=1)
    if COMMAND_STYLESHEET in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Homepage has no closing head element")
    return document.replace(
        "</head>",
        f'<link rel="stylesheet" href="{COMMAND_STYLESHEET}">\n</head>',
        1,
    )
