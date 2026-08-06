#!/usr/bin/env python3
"""Bridge governed homepage output to the live command-centre presentation."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCT_CONTRACT = ROOT / "data" / "product-front-door.json"
CAPABILITY_STYLESHEET_RE = re.compile(
    r'\s*<link rel="stylesheet" href="(?:\./)?assets/capability-metrics\.css\?v=[^"]+">',
    re.IGNORECASE,
)
COMMAND_STYLESHEET = "assets/home-command-centre-live.css?v=2"
TOOL_STRUCTURE_STYLESHEET = "assets/home-tool-card-structure.css?v=1"


def ensure_stylesheet(document: str, href: str) -> str:
    """Load one stylesheet once, preserving deterministic stylesheet order."""
    if href in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Homepage has no closing head element")
    return document.replace(
        "</head>",
        f'<link rel="stylesheet" href="{href}">\n</head>',
        1,
    )


def load_featured_tool() -> dict[str, str]:
    """Return the single contract-declared featured tool."""
    contract = json.loads(PRODUCT_CONTRACT.read_text(encoding="utf-8"))
    featured = [tool for tool in contract.get("tools", []) if tool.get("featured")]
    if len(featured) != 1:
        raise RuntimeError(
            "Product front door must register exactly one featured homepage tool"
        )
    tool = featured[0]
    tool_id = tool.get("id")
    path = tool.get("path")
    if not isinstance(tool_id, str) or not tool_id:
        raise RuntimeError("Featured homepage tool is missing a stable id")
    if not isinstance(path, str) or not path:
        raise RuntimeError("Featured homepage tool is missing a path")
    return {"id": tool_id, "path": path}


def mark_featured_tool(document: str) -> str:
    """Add an explicit, contract-driven class to the generated featured card."""
    tool = load_featured_tool()
    marker = (
        'class="product-front-door__card product-front-door__card--featured" '
        f'data-tool-id="{tool["id"]}"'
    )
    if marker in document:
        return document

    pattern = re.compile(
        r'<li class="product-front-door__card"(?P<attributes>[^>]*)>'
        rf'(?=<a href="{re.escape(tool["path"])}">)'
    )
    replacement = (
        '<li class="product-front-door__card product-front-door__card--featured" '
        rf'data-tool-id="{tool["id"]}"\g<attributes>>'
    )
    document, count = pattern.subn(replacement, document, count=1)
    if count != 1:
        raise RuntimeError(
            "Featured homepage tool card is missing or ambiguous in generated output"
        )
    return document


def apply_home_command_bridge(document: str) -> str:
    """Apply governed card hierarchy and load the live homepage style layers."""
    document = CAPABILITY_STYLESHEET_RE.sub("", document, count=1)
    document = mark_featured_tool(document)
    document = ensure_stylesheet(document, COMMAND_STYLESHEET)
    document = ensure_stylesheet(document, TOOL_STRUCTURE_STYLESHEET)
    return document
