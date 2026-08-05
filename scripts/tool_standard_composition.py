#!/usr/bin/env python3
"""Compose one visible governance panel across the eleven registered public tools."""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "data" / "tool-contracts.json"
STANDARD = ROOT / "data" / "tool-interface-standard.json"
PANEL_MARKER = 'data-tool-standard="1"'
STYLESHEET = '<link rel="stylesheet" href="../../assets/tool-standard.css?v=1">'


def tool_standard_paths() -> tuple[str, ...]:
    registry = json.loads(CONTRACTS.read_text(encoding="utf-8"))
    return tuple(sorted(tool["url"].lstrip("/") + "index.html" for tool in registry["tools"]))


def _list(items: list[str]) -> str:
    return "".join(f"<li>{html.escape(item)}</li>" for item in items)


def _sources(items: list[dict[str, str]]) -> str:
    rows = []
    for source in items:
        name = html.escape(source["name"])
        url = html.escape(source["url"], quote=True)
        access = html.escape(source.get("access", "public source"))
        rows.append(f'<li><a href="{url}" rel="noopener">{name}</a><span>{access}</span></li>')
    return "".join(rows)


def _requests(items: list[dict[str, str]]) -> str:
    if not items:
        return "<p>No lookup request leaves the browser.</p>"
    rows = []
    for request in items:
        rows.append(
            "<li><strong>"
            + html.escape(request["recipient"])
            + ":</strong> "
            + html.escape(request["data"])
            + " — triggered by "
            + html.escape(request["trigger"])
            + ".</li>"
        )
    return "<ul>" + "".join(rows) + "</ul>"


def _panel(tool: dict[str, object], standard: dict[str, object]) -> str:
    status = str(tool["status"])
    version_label = "Snapshot" if status == "living-resource" else "Method version"
    maturity = status.replace("-", " ").title()
    return f'''<section class="tool-standard" {PANEL_MARKER} aria-labelledby="tool-standard-title">
  <div class="wrap">
    <div class="tool-standard__head">
      <div><span class="eyebrow">{html.escape(str(standard["publicLabel"]))}</span><h2 id="tool-standard-title">Method, evidence and privacy boundary</h2></div>
      <dl class="tool-standard__meta"><div><dt>Maturity</dt><dd>{html.escape(maturity)}</dd></div><div><dt>{version_label}</dt><dd>{html.escape(str(tool["methodVersion"]))}</dd></div><div><dt>Reviewed</dt><dd>{html.escape(str(tool["reviewed"]))}</dd></div></dl>
    </div>
    <div class="tool-standard__grid">
      <article><h3>Purpose</h3><p>{html.escape(str(tool["purpose"]))}</p><h3>What it returns</h3><ul>{_list(list(tool["outputs"]))}</ul></article>
      <article><h3>Evidence basis</h3><ul class="tool-standard__sources">{_sources(list(tool["sources"]))}</ul><h3>What it does not check</h3><ul>{_list(list(tool["notChecked"]))}</ul></article>
      <article><h3>Privacy and processing</h3><p><strong>Processing:</strong> {html.escape(str(tool["processing"]).replace("-", " "))}.</p><p>{html.escape(str(tool["userDataStorage"]))}</p><div class="tool-standard__requests"><strong>Disclosed outbound requests</strong>{_requests(list(tool["outboundRequests"]))}</div></article>
    </div>
    <div class="tool-standard__boundary"><strong>Decision boundary</strong><p>{html.escape(str(tool["decisionBoundary"]))}</p><p class="note">{html.escape(str(tool["limitations"]))}</p></div>
  </div>
</section>'''


def compose_tool_standard(relative_path: str, source: str) -> str:
    registry = json.loads(CONTRACTS.read_text(encoding="utf-8"))
    standard = json.loads(STANDARD.read_text(encoding="utf-8"))
    by_path = {tool["url"].lstrip("/") + "index.html": tool for tool in registry["tools"]}
    tool = by_path.get(relative_path)
    if not tool:
        return source
    if PANEL_MARKER in source:
        raise RuntimeError(f"{relative_path}: duplicate governed tool-standard panel")
    if "</head>" not in source or "</main>" not in source:
        raise RuntimeError(f"{relative_path}: document boundaries required for tool-standard composition")
    source = source.replace("</head>", STYLESHEET + "\n</head>", 1)
    return source.replace("</main>", _panel(tool, standard) + "\n</main>", 1)
