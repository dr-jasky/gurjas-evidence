#!/usr/bin/env python3
"""Apply the final institutional homepage structure after governed front-door composition."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "data" / "product-front-door.json"


def load_institutional_contract() -> dict:
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    if contract.get("version") != 1:
        raise RuntimeError("Unsupported product-front-door contract version")
    for key in ("hero", "search", "toolsIntro"):
        if not isinstance(contract.get(key), dict):
            raise RuntimeError(f"Homepage institutional contract is missing {key}")
    required = {
        "hero": ("eyebrow", "title", "summary"),
        "search": ("label", "placeholder"),
        "toolsIntro": ("eyebrow", "title", "summary", "cta"),
    }
    for group, fields in required.items():
        for field in fields:
            if not str(contract[group].get(field, "")).strip():
                raise RuntimeError(f"Homepage institutional contract is missing {group}.{field}")
    return contract


def replace_once(document: str, old: str, new: str, label: str) -> str:
    count = document.count(old)
    if count != 1:
        raise RuntimeError(f"Homepage institutional marker is missing or ambiguous: {label} ({count})")
    return document.replace(old, new, 1)


def remove_motion(document: str) -> str:
    pattern = re.compile(
        r'<div class="product-front-door__motion" role="img"[\s\S]*?</div>',
        re.IGNORECASE,
    )
    document, count = pattern.subn("", document, count=1)
    if count != 1:
        raise RuntimeError("Homepage proof-motion marker is missing or ambiguous")
    return document


def remove_audience_icons(document: str) -> str:
    pattern = re.compile(r'<span class="icn" aria-hidden="true">[^<]*</span>')
    document, count = pattern.subn("", document)
    if count != 3:
        raise RuntimeError(f"Homepage audience icon count drifted; expected 3, found {count}")
    return document


def remove_legacy_inline_styles(document: str) -> str:
    replacements = (
        ('<div class="home-head" style="margin-bottom:32px">', '<div class="home-head">', "audience heading style"),
        ('<div style="margin-bottom:clamp(32px,5vw,52px);max-width:44em">', '<div class="home-process-head">', "process heading style"),
        ('<div style="max-width:44em;margin-bottom:clamp(32px,5vw,52px)">', '<div class="home-ethics-head">', "ethics heading style"),
        ('<h2 class="home-h2" id="h-ethics" style="font-size:clamp(36px,5vw,56px)">', '<h2 class="home-h2" id="h-ethics">', "ethics heading size"),
    )
    for old, new, label in replacements:
        document = replace_once(document, old, new, label)
    return document


def apply_home_institutional_composition(document: str) -> str:
    """Replace template-era presentation markers with governed institutional structure."""
    contract = load_institutional_contract()
    hero = contract["hero"]
    search = contract["search"]
    tools = contract["toolsIntro"]

    document = remove_motion(document)
    document = replace_once(
        document,
        '<h1 id="product-front-door-title">Every research task. <em>One verified toolkit.</em></h1>',
        f'<h1 id="product-front-door-title">{html.escape(hero["title"])}</h1>',
        "hero title",
    )
    document = replace_once(
        document,
        '<label for="home-task-search">What are you working on?</label>',
        f'<label for="home-task-search">{html.escape(search["label"])}</label>',
        "search label",
    )
    document = replace_once(
        document,
        'placeholder="Try ‘check a journal’, ‘sample size’ or ‘NAAC’" data-product-search-input>',
        f'placeholder="{html.escape(search["placeholder"], quote=True)}" data-product-search-input>',
        "search placeholder",
    )
    document = replace_once(
        document,
        '<div><p class="product-front-door__kicker">Start the task now</p><h2 id="product-tools-title">Eleven tools. No detour.</h2></div>',
        '<div>'
        f'<p class="product-front-door__kicker">{html.escape(tools["eyebrow"])}</p>'
        f'<h2 id="product-tools-title">{html.escape(tools["title"])}</h2>'
        '</div>',
        "tools heading",
    )
    document = replace_once(
        document,
        '<p>Choose the decision in front of you. Every tool states its sources, processing, assumptions and decision boundary.</p>',
        f'<p>{html.escape(tools["summary"])}</p>',
        "tools summary",
    )

    cta_old = 'Start task →'
    cta_count = document.count(cta_old)
    if cta_count != 11:
        raise RuntimeError(f"Homepage tool CTA count drifted; expected 11, found {cta_count}")
    document = document.replace(cta_old, html.escape(tools["cta"]))

    document = remove_audience_icons(document)
    document = remove_legacy_inline_styles(document)
    return document
