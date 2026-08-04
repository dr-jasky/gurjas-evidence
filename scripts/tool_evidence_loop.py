#!/usr/bin/env python3
"""Compose reciprocal Research Library evidence panels on supported tools."""
from __future__ import annotations

import html
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIBRARY_REGISTRY = ROOT / "data" / "library-entries.json"
MARKER = 'class="tool-evidence-loop"'


def page_root(relative_path: str) -> str:
    depth = max(0, len(Path(relative_path).parts) - 1)
    return "../" * depth


def load_bridge_map() -> dict[str, list[dict]]:
    registry = json.loads(LIBRARY_REGISTRY.read_text(encoding="utf-8"))
    if registry.get("version") != 1:
        raise RuntimeError("Unsupported Research Library registry version")

    grouped: dict[str, list[dict]] = defaultdict(list)
    seen_ids: set[str] = set()
    for entry in registry.get("entries", []):
        entry_id = entry.get("id", "")
        title = entry.get("title", "")
        library_path = entry.get("path", "")
        destination = entry.get("relatedTool", "")
        entry_type = entry.get("type", "")
        version = entry.get("version", "")
        pillar = entry.get("pillar", "")
        reviewed = entry.get("reviewed", "")
        source_count = entry.get("sourceCount")

        if not entry_id or entry_id in seen_ids:
            raise RuntimeError(f"Invalid or duplicate Library entry id: {entry_id}")
        seen_ids.add(entry_id)
        if not title or not entry_type or not version or not pillar or not reviewed:
            raise RuntimeError(f"Incomplete evidence bridge metadata: {entry_id}")
        if not library_path.startswith("knowledge/library/") or not library_path.endswith("/"):
            raise RuntimeError(f"Invalid Library entry path: {library_path}")
        if not destination or not destination.endswith("/"):
            raise RuntimeError(f"Invalid related tool/resource route: {destination}")
        if not isinstance(source_count, int) or source_count < 1:
            raise RuntimeError(f"Invalid source count for Library entry: {entry_id}")

        route = f"{destination}index.html"
        grouped[route].append(entry)

    return dict(grouped)


def tool_evidence_paths() -> tuple[str, ...]:
    return tuple(sorted(load_bridge_map()))


def ensure_stylesheet(document: str, root: str) -> str:
    href = f"{root}assets/tool-evidence-loop.css?v=1"
    if href in document:
        return document
    if document.count("</head>") != 1:
        raise RuntimeError("Evidence-linked page has missing or ambiguous head close")
    return document.replace("</head>", f'<link rel="stylesheet" href="{href}">\n</head>', 1)


def render_panel(relative_path: str, entries: list[dict]) -> str:
    root = page_root(relative_path)
    cards: list[str] = []
    for entry in entries:
        pillar_label = entry["pillar"].replace("-", " ").title()
        source_label = "1 cited source" if entry["sourceCount"] == 1 else f'{entry["sourceCount"]} cited sources'
        cards.append(
            '<li><a class="tool-evidence-loop__card" '
            f'href="{html.escape(root + entry["path"], quote=True)}">'
            '<span class="tool-evidence-loop__meta">'
            f'<span>{html.escape(pillar_label)}</span>'
            f'<span>{html.escape(entry["type"])} · v{html.escape(entry["version"])}</span>'
            '</span>'
            f'<strong>{html.escape(entry["title"])}</strong>'
            f'<p>{html.escape(source_label)} · reviewed {html.escape(entry["reviewed"])}</p>'
            '<em>Read the evidence note →</em>'
            '</a></li>'
        )

    count = len(entries)
    evidence_word = "entry" if count == 1 else "entries"
    return (
        '<section class="tool-evidence-loop" aria-labelledby="tool-evidence-loop-title">'
        '<div class="wrap tool-evidence-loop__shell">'
        '<div class="tool-evidence-loop__intro">'
        '<span class="eyebrow">Evidence behind this tool</span>'
        '<h2 id="tool-evidence-loop-title">Use the result. Check the reasoning.</h2>'
        '<p>This interface is a decision aid—not an automatic verdict. '
        f'The {count} linked Library {evidence_word} explain the source workflow, assumptions '
        'and boundary conditions that should travel with the result.</p>'
        '</div>'
        '<nav aria-label="Research Library evidence supporting this tool">'
        f'<ul class="tool-evidence-loop__grid">{"".join(cards)}</ul>'
        '</nav>'
        '<aside class="tool-evidence-loop__boundary" aria-label="Decision boundary">'
        '<strong>Decision boundary</strong>'
        '<p>Recheck current source records, preserve the inputs and assumptions you used, '
        'and document any professional judgement. A tool output does not by itself establish '
        'quality, validity, eligibility, acceptance or institutional approval.</p>'
        '</aside>'
        '</div></section>'
    )


def compose_tool_evidence_loop(relative_path: str, document: str) -> str:
    normalized = relative_path.replace("\\", "/")
    entries = load_bridge_map().get(normalized)
    if not entries:
        return document
    if MARKER in document:
        return document
    if document.count("</main>") != 1:
        raise RuntimeError(f"Evidence-linked page has missing or ambiguous main close: {normalized}")
    document = ensure_stylesheet(document, page_root(normalized))
    panel = render_panel(normalized, entries)
    return document.replace("</main>", panel + "\n</main>", 1)
