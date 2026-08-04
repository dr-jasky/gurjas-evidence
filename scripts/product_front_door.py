#!/usr/bin/env python3
"""Governed homepage product-front-door composition."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "data" / "product-front-door.json"


def load_contract() -> dict:
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    if contract.get("version") != 1:
        raise RuntimeError("Unsupported product-front-door contract version")
    tools = contract.get("tools", [])
    if len(tools) != 11:
        raise RuntimeError("Product front door must register exactly eleven public tools")
    paths = [tool.get("path") for tool in tools]
    if len(set(paths)) != len(paths):
        raise RuntimeError("Product front-door tool paths must be unique")
    return contract


def ensure_stylesheet(document: str, href: str) -> str:
    if href in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Homepage has no closing head element")
    return document.replace("</head>", f'<link rel="stylesheet" href="{href}">\n</head>', 1)


def ensure_script(document: str, src: str) -> str:
    if src in document:
        return document
    if "</head>" not in document:
        raise RuntimeError("Homepage has no closing head element")
    return document.replace("</head>", f'<script src="{src}" defer></script>\n</head>', 1)


def replace_metadata(document: str) -> str:
    title = "Free Research Tools and Reviewed Research Library | Gurjas"
    description = (
        "Start with 11 free research tools and a reviewed Research Library for scholarly publishing, "
        "research design and institutional evidence. No sign-up to start."
    )
    replacements = (
        (r"<title>[^<]*</title>", f"<title>{title}</title>"),
        (r'(<meta property="og:title" content=")[^"]*(">)', rf"\g<1>{title}\g<2>"),
        (r'(<meta name="twitter:title" content=")[^"]*(">)', rf"\g<1>{title}\g<2>"),
        (r'(<meta name="description" content=")[^"]*(">)', rf"\g<1>{description}\g<2>"),
        (r'(<meta property="og:description" content=")[^"]*(">)', rf"\g<1>{description}\g<2>"),
        (r'(<meta name="twitter:description" content=")[^"]*(">)', rf"\g<1>{description}\g<2>"),
    )
    for pattern, replacement in replacements:
        document, count = re.subn(pattern, replacement, document, count=1)
        if count != 1:
            raise RuntimeError(f"Homepage product metadata marker is missing: {pattern}")
    return document


def render_tool_cards(contract: dict) -> str:
    cards: list[str] = []
    for tool in contract["tools"]:
        searchable = " ".join(
            [tool["label"], tool["category"], tool["description"], *tool["keywords"]]
        )
        cards.append(
            '<li class="product-front-door__card" data-product-tool '
            f'data-search-text="{html.escape(searchable, quote=True)}">'
            f'<a href="{html.escape(tool["path"], quote=True)}">'
            f'<span class="product-front-door__category">{html.escape(tool["category"])}</span>'
            f'<strong>{html.escape(tool["label"])}</strong>'
            f'<p>{html.escape(tool["description"])}</p>'
            '<span class="product-front-door__go" aria-hidden="true">Start task →</span>'
            '</a></li>'
        )
    return "".join(cards)


def render_front_door(contract: dict) -> str:
    hero = contract["hero"]
    library = contract["library"]
    trust = "".join(f"<li>{html.escape(item)}</li>" for item in contract["trustItems"])
    pillar_links = "".join(
        f'<a href="{html.escape(pillar["path"], quote=True)}"><span>{html.escape(pillar["label"])}</span><b aria-hidden="true">→</b></a>'
        for pillar in library["activePillars"]
    )
    cards = render_tool_cards(contract)

    return (
        '<section class="product-front-door" aria-labelledby="product-front-door-title" data-product-front-door>'
        '<div class="product-front-door__shell">'
        '<div class="product-front-door__hero">'
        '<div>'
        f'<p class="product-front-door__eyebrow">{html.escape(hero["eyebrow"])}</p>'
        '<h1 id="product-front-door-title">Every research task. <em>One verified toolkit.</em></h1>'
        f'<p class="product-front-door__summary">{html.escape(hero["summary"])}</p>'
        '</div>'
        '<form class="product-front-door__search" role="search" action="tools/" method="get" data-product-search>'
        '<label for="home-task-search">What are you working on?</label>'
        '<div class="product-front-door__search-row">'
        '<input id="home-task-search" name="task" type="search" autocomplete="off" '
        'placeholder="Try ‘check a journal’, ‘sample size’ or ‘NAAC’" data-product-search-input>'
        '<button type="reset">Clear</button>'
        '</div>'
        '<p class="product-front-door__status" id="product-search-status" role="status" aria-live="polite" '
        'data-product-search-status><strong data-product-search-count>11</strong> tools available. Filtering happens only in your browser.</p>'
        '</form>'
        '</div>'
        f'<ul class="product-front-door__trust" aria-label="Why researchers can inspect Gurjas">{trust}</ul>'
        '<div class="product-front-door__tools" role="region" aria-labelledby="product-tools-title">'
        '<div class="product-front-door__tools-head">'
        '<div><p class="product-front-door__kicker">Start the task now</p>'
        '<h2 id="product-tools-title">Eleven tools. No detour.</h2></div>'
        '<p>Choose the decision in front of you. Every tool states its sources, processing, assumptions and decision boundary.</p>'
        '</div>'
        f'<ul class="product-front-door__grid">{cards}</ul>'
        '<p class="product-front-door__empty" hidden data-product-search-empty>No matching tool yet. '
        '<a href="tools/">Browse the complete tools hub</a> or use the Research Library below.</p>'
        '</div>'
        '<div class="product-front-door__library">'
        '<div>'
        f'<p class="product-front-door__kicker">{html.escape(library["publicLabel"])}</p>'
        '<h2>Reviewed knowledge, connected to action.</h2>'
        f'<p>{html.escape(library["summary"])}</p>'
        '</div>'
        '<nav class="product-front-door__library-links" aria-label="Research Library entry points">'
        f'<a href="{html.escape(library["path"], quote=True)}"><span>Browse the Research Library</span><b aria-hidden="true">→</b></a>'
        f'{pillar_links}'
        '</nav>'
        '</div>'
        '<div class="product-front-door__enterprise">'
        '<p><strong>Need institution-wide or study-specific support?</strong> The consultancy remains available as the evidence-intensive pathway.</p>'
        '<a href="services/"><span>Explore Gurjas Services</span><b aria-hidden="true">→</b></a>'
        '</div>'
        '</div>'
        '</section>'
    )


def compose_product_front_door(document: str) -> str:
    contract = load_contract()
    document = ensure_stylesheet(document, "assets/product-front-door.css?v=1")
    document = ensure_script(document, "assets/product-front-door.js?v=1")
    document = replace_metadata(document)

    nav_marker = '<li><a href="tools/">Tools</a></li>'
    nav_replacement = nav_marker + '<li><a href="knowledge/">Research Library</a></li>'
    if '<a href="knowledge/">Research Library</a>' not in document:
        if document.count(nav_marker) != 1:
            raise RuntimeError("Homepage tools navigation marker is missing or ambiguous")
        document = document.replace(nav_marker, nav_replacement, 1)

    front_door = render_front_door(contract)
    hero_pattern = (
        r'<div class="home-hero">[\s\S]*?</div>\s*'
        r'<nav class="home-proof-ticker" aria-label="Practice at a glance">[\s\S]*?</nav>'
    )
    document, count = re.subn(hero_pattern, front_door, document, count=1)
    if count != 1:
        raise RuntimeError("Homepage hero and proof ticker are missing or ambiguous")

    legacy_tools_pattern = (
        r'\s*<section class="home-section home-section--dark" aria-labelledby="h-tools">'
        r'[\s\S]*?</section>\s*(?=<section class="home-section home-section--tint")'
    )
    document, count = re.subn(legacy_tools_pattern, "\n\n", document, count=1)
    if count != 1:
        raise RuntimeError("Legacy homepage tool section is missing or ambiguous")

    return document
