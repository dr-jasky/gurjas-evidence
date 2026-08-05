#!/usr/bin/env python3
"""Compose one registry-driven Gurjas Tool Standard panel on every public tool."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS_REGISTRY = ROOT / "data" / "tool-contracts.json"
STANDARD_REGISTRY = ROOT / "data" / "tool-interface-standard.json"
MARKER = 'data-tool-standard="1"'
STYLESHEET = "assets/tool-standard-panel.css?v=1"

MATURITY_LABELS = {
    "production": "Production",
    "beta": "Beta",
    "living-resource": "Living resource",
}

PROCESSING_LABELS = {
    "local-browser": "Local browser only",
    "direct-third-party-requests": "Direct requests to named third parties",
    "direct-third-party-requests plus dated local snapshots": "Named third-party requests plus dated local snapshots",
    "local-browser, with one optional direct-third-party request": "Local browser with one optional named third-party request",
    "static-page": "Static page; no calculation or lookup request",
}


def page_root(relative_path: str) -> str:
    depth = max(0, len(Path(relative_path).parts) - 1)
    return "../" * depth


def load_standard() -> dict:
    standard = json.loads(STANDARD_REGISTRY.read_text(encoding="utf-8"))
    if standard.get("schemaVersion") != "1.0":
        raise RuntimeError("Unsupported Gurjas Tool Standard schema version")
    signals = standard.get("requiredPageSignals", {})
    if not signals.get("standardPanel"):
        raise RuntimeError("Gurjas Tool Standard does not require the shared disclosure panel")
    component = standard.get("interfaceComponent", {})
    if component.get("version") != "1.0":
        raise RuntimeError("Unsupported Gurjas Tool Standard interface component version")
    return standard


def load_contract_map() -> dict[str, dict]:
    standard = load_standard()
    registry = json.loads(CONTRACTS_REGISTRY.read_text(encoding="utf-8"))
    tools = registry.get("tools", [])
    if len(tools) != 11:
        raise RuntimeError("The shared disclosure panel requires exactly eleven governed tools")

    required = tuple(standard.get("requiredContractFields", ()))
    allowed = set(standard.get("allowedMaturity", ()))
    routes: dict[str, dict] = {}

    for tool in tools:
        tool_id = tool.get("id", "")
        missing = [field for field in required if field not in tool]
        if missing:
            raise RuntimeError(f"{tool_id or 'unknown tool'} is missing disclosure fields: {', '.join(missing)}")
        if tool.get("status") not in allowed:
            raise RuntimeError(f"{tool_id} uses an unsupported maturity status")
        route = tool.get("url", "")
        if not re.fullmatch(r"/tools/[a-z0-9-]+/", route):
            raise RuntimeError(f"{tool_id} has an invalid public tool route")
        relative_path = f"{route.lstrip('/')}index.html"
        if relative_path in routes:
            raise RuntimeError(f"Duplicate governed tool route: {relative_path}")
        routes[relative_path] = tool

    return routes


def tool_standard_paths() -> tuple[str, ...]:
    return tuple(sorted(load_contract_map()))


def ensure_stylesheet(document: str, root: str) -> str:
    href = f"{root}{STYLESHEET}"
    if href in document:
        return document
    if document.count("</head>") != 1:
        raise RuntimeError("Governed tool page has missing or ambiguous head close")
    return document.replace("</head>", f'<link rel="stylesheet" href="{href}">\n</head>', 1)


def processing_label(value: str) -> str:
    return PROCESSING_LABELS.get(value, value.replace("-", " ").strip().capitalize())


def external_attributes(url: str) -> str:
    return ' rel="noopener"' if url.startswith("https://") else ""


def render_sources(tool: dict) -> str:
    rows: list[str] = []
    for source in tool["sources"]:
        name = html.escape(source["name"])
        access = html.escape(source["access"])
        url = html.escape(source["url"], quote=True)
        rows.append(
            "<li>"
            f'<a href="{url}"{external_attributes(source["url"])}>{name}</a>'
            f'<span class="tool-standard-panel__source-access">{access}</span>'
            "</li>"
        )
    return "".join(rows)


def render_panel(relative_path: str, tool: dict) -> str:
    standard = load_standard()
    tool_id = tool["id"]
    heading_id = f"tool-standard-{tool_id}"
    status = tool["status"]
    status_label = MATURITY_LABELS[status]
    version_term = "Snapshot" if status == "living-resource" else "Method version"
    component_version = standard["interfaceComponent"]["version"]

    return (
        '<section class="tool-standard-panel" '
        f'data-tool-standard="1" data-tool-standard-version="{html.escape(component_version, quote=True)}" '
        f'data-tool-id="{html.escape(tool_id, quote=True)}" '
        f'data-tool-status="{html.escape(status, quote=True)}" '
        f'aria-labelledby="{heading_id}">'
        '<div class="wrap tool-standard-panel__shell">'
        '<header class="tool-standard-panel__intro">'
        '<span class="eyebrow">Gurjas Tool Standard</span>'
        f'<h2 id="{heading_id}">How to read this tool</h2>'
        f'<p><strong>Purpose:</strong> {html.escape(tool["purpose"])}</p>'
        "</header>"
        '<dl class="tool-standard-panel__facts">'
        '<div><dt>Maturity</dt>'
        f'<dd><span class="tool-standard-panel__status" data-status="{html.escape(status, quote=True)}">'
        f"{html.escape(status_label)}</span></dd></div>"
        f'<div><dt>{version_term}</dt><dd>{html.escape(tool["methodVersion"])}</dd></div>'
        f'<div><dt>Reviewed</dt><dd><time datetime="{html.escape(tool["reviewed"], quote=True)}">'
        f'{html.escape(tool["reviewed"])}</time></dd></div>'
        f'<div><dt>Processing</dt><dd>{html.escape(processing_label(tool["processing"]))}</dd></div>'
        "</dl>"
        '<div class="tool-standard-panel__grid">'
        '<section class="tool-standard-panel__card tool-standard-panel__card--evidence" '
        f'aria-labelledby="{heading_id}-evidence">'
        f'<h3 id="{heading_id}-evidence">Evidence basis</h3>'
        f'<ul>{render_sources(tool)}</ul>'
        "</section>"
        '<section class="tool-standard-panel__card" '
        f'aria-labelledby="{heading_id}-privacy">'
        f'<h3 id="{heading_id}-privacy">Privacy</h3>'
        f'<p>{html.escape(tool["userDataStorage"])}</p>'
        "</section>"
        '<section class="tool-standard-panel__card" '
        f'aria-labelledby="{heading_id}-limitations">'
        f'<h3 id="{heading_id}-limitations">Limitations</h3>'
        f'<p>{html.escape(tool["limitations"])}</p>'
        "</section>"
        '<section class="tool-standard-panel__card tool-standard-panel__card--boundary" '
        f'aria-labelledby="{heading_id}-boundary">'
        f'<h3 id="{heading_id}-boundary">Decision boundary</h3>'
        f'<p>{html.escape(tool["decisionBoundary"])}</p>'
        "</section>"
        "</div>"
        "</div>"
        "</section>"
    )


def assert_tool_standard_panel(relative_path: str, document: str) -> None:
    normalized = relative_path.replace("\\", "/")
    tool = load_contract_map().get(normalized)
    if not tool:
        return

    root = page_root(normalized)
    if document.count(MARKER) != 1:
        raise RuntimeError(f"{normalized}: expected exactly one Gurjas Tool Standard panel")
    if f"{root}{STYLESHEET}" not in document:
        raise RuntimeError(f"{normalized}: shared disclosure stylesheet is missing")
    required_text = (
        tool["purpose"],
        tool["methodVersion"],
        tool["reviewed"],
        tool["userDataStorage"],
        tool["limitations"],
        tool["decisionBoundary"],
    )
    for value in required_text:
        if html.escape(value) not in document:
            raise RuntimeError(f"{normalized}: governed disclosure content is incomplete")
    for source in tool["sources"]:
        if html.escape(source["name"]) not in document:
            raise RuntimeError(f"{normalized}: evidence source disclosure is incomplete")


def compose_tool_standard_panel(relative_path: str, document: str) -> str:
    normalized = relative_path.replace("\\", "/")
    tool = load_contract_map().get(normalized)
    if not tool:
        return document
    if MARKER in document:
        assert_tool_standard_panel(normalized, document)
        return document
    if document.count("</main>") != 1:
        raise RuntimeError(f"Governed tool page has missing or ambiguous main close: {normalized}")

    document = ensure_stylesheet(document, page_root(normalized))
    document = document.replace("</main>", render_panel(normalized, tool) + "\n</main>", 1)
    assert_tool_standard_panel(normalized, document)
    return document
