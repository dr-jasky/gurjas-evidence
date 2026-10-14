#!/usr/bin/env python3
"""Governed homepage product-front-door and proof-system composition."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "data" / "product-front-door.json"
PROOF_SYSTEM = ROOT / "data" / "home-proof-system.json"


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
    journeys = contract.get("journeys", [])
    registered_ids = {tool["id"] for tool in tools}
    if len(journeys) != 3 or len({j.get("id") for j in journeys}) != 3:
        raise RuntimeError("Evidence Studio requires exactly three distinct starting journeys")
    for journey in journeys:
        if journey.get("toolId") not in registered_ids:
            raise RuntimeError("Evidence Studio journey must start from a registered tool")
        for field in ("question", "intent", "source", "method", "output", "boundary", "libraryPath"):
            if not journey.get(field):
                raise RuntimeError(f"Evidence Studio journey missing {field}")
    featured = [tool for tool in tools if tool.get("featured")]
    if len(featured) != 1:
        raise RuntimeError("Product front door must register exactly one featured tool")
    return contract


def load_proof_system() -> dict:
    proof = json.loads(PROOF_SYSTEM.read_text(encoding="utf-8"))
    if proof.get("version") != 1:
        raise RuntimeError("Unsupported homepage proof-system version")
    if len(proof.get("signals", [])) != 4:
        raise RuntimeError("Homepage proof system must expose exactly four primary signals")
    metrics = proof.get("profile", {}).get("metrics", [])
    if len(metrics) < 6:
        raise RuntimeError("Principal Consultant profile must retain its governed metric record")
    return proof


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


def remove_legacy_capability_stylesheet(document: str) -> str:
    return re.sub(
        r'\s*<link rel="stylesheet" href="(?:\./)?assets/capability-metrics\.css\?v=1">',
        "",
        document,
        count=1,
    )


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


def simplify_home_navigation(document: str) -> str:
    links = (
        '<ul>'
        '<li><a href="about/">About</a></li>'
        '<li><a href="services/">Services</a></li>'
        '<li><a href="tools/">Tools</a></li>'
        '<li><a href="knowledge/">Library</a></li>'
        '<li><a href="insights/">Insights</a></li>'
        '<li><a href="contact/" class="nav-cta">Contact</a></li>'
        '</ul>'
    )
    pattern = (
        r'(<nav id="nav" class="site-nav" aria-label="Primary">\s*)'
        r'<ul>[\s\S]*?</ul>\s*'
        r'(<div class="nav-trust">)'
    )
    document, count = re.subn(pattern, rf"\g<1>{links}\n      \g<2>", document, count=1)
    if count != 1:
        raise RuntimeError("Homepage primary navigation is missing or ambiguous")
    return document


def render_tool_cards(contract: dict) -> str:
    cards: list[str] = []
    for tool in contract["tools"]:
        searchable = " ".join(
            [tool["label"], tool["category"], tool["description"], *tool["keywords"]]
        )
        classes = ["product-front-door__card"]
        if tool.get("featured"):
            classes.append("product-front-door__card--featured")
        cards.append(
            f'<li class="{" ".join(classes)}" data-product-tool '
            f'data-tool-id="{html.escape(tool["id"], quote=True)}" '
            f'data-search-text="{html.escape(searchable, quote=True)}">'
            f'<a href="{html.escape(tool["path"], quote=True)}">'
            f'<span class="product-front-door__category">{html.escape(tool["category"])}</span>'
            f'<strong>{html.escape(tool["label"])}</strong>'
            f'<p>{html.escape(tool["description"])}</p>'
            '<span class="product-front-door__go" aria-hidden="true">Start task →</span>'
            '</a></li>'
        )
    return "".join(cards)


def render_motion(proof: dict) -> str:
    motion = proof["motion"]
    return (
        '<div class="product-front-door__motion" role="img" '
        f'aria-label="{html.escape(motion["ariaLabel"], quote=True)}">'
        f'<span>{html.escape(motion["lead"])}</span>'
        '<span class="product-front-door__motion-line" aria-hidden="true">'
        '<i></i><b></b></span>'
        f'<small>{html.escape(motion["connector"])}</small>'
        f'<em>{html.escape(motion["accent"])}</em>'
        '</div>'
    )


def render_journey_panels(contract: dict) -> tuple[str, str]:
    """A real task -> evidence -> method -> record route, not a simulated result."""
    registered = {tool["id"]: tool for tool in contract["tools"]}
    tabs = []
    panels = []
    for i, journey in enumerate(contract["journeys"]):
        journey_id = html.escape(journey["id"], quote=True)
        tabs.append(
            '<button class="studio-switch" type="button" role="tab" '
            f'id="studio-tab-{journey_id}" aria-controls="studio-panel-{journey_id}" '
            f'aria-selected="{"true" if i == 0 else "false"}" '
            f'tabindex="{"0" if i == 0 else "-1"}" data-studio-tab="{journey_id}">'
            f'<span class="studio-switch__number">{html.escape(journey["number"])}</span>'
            f'{html.escape(journey["shortLabel"])}'
            '</button>'
        )
        tool_path = registered[journey["toolId"]]["path"]
        parts = [
            ("Question", journey["question"]),
            ("Examine", journey["source"]),
            ("Method", journey["method"]),
            ("Record", journey["output"]),
        ]
        trail = "".join(
            f'<div class="studio-trace__item"><span class="studio-trace__idx">0{n}</span>'
            f'<div><b>{html.escape(label)}</b><p>{html.escape(description)}</p></div></div>'
            for n, (label, description) in enumerate(parts, 1)
        )
        panels.append(
            f'<section class="studio-panel" id="studio-panel-{journey_id}" '
            f'role="tabpanel" aria-labelledby="studio-tab-{journey_id}" '
            f'data-studio-panel="{journey_id}"{" hidden" if i else ""}>'
            f'<p class="studio-panel__context">{html.escape(journey["intent"])}</p>'
            f'<h3>{html.escape(journey["question"])}</h3>'
            f'<div class="studio-trace">{trail}</div>'
            f'<p class="studio-panel__boundary"><strong>Decision boundary</strong>'
            f'{html.escape(journey["boundary"])}</p>'
            '<div class="studio-panel__actions">'
            f'<a class="studio-panel__open" href="{html.escape(tool_path, quote=True)}">'
            f'{html.escape(journey["nextLabel"])} <span aria-hidden="true">↗</span></a>'
            f'<a class="studio-panel__read" href="{html.escape(journey["libraryPath"], quote=True)}">'
            f'{html.escape(journey["libraryLabel"])} →</a>'
            '</div></section>'
        )
    return "".join(tabs), "".join(panels)


def render_front_door(contract: dict, proof: dict) -> str:
    """Evidence Studio homepage: editorial front page + task-first decision desk."""
    hero = contract["hero"]
    library = contract["library"]
    tabs, panels = render_journey_panels(contract)
    cards = render_tool_cards(contract)
    trust = "".join(
        f'<li><span class="studio-footprint__dot" aria-hidden="true"></span>{html.escape(item)}</li>'
        for item in contract["trustItems"]
    )
    pillars = "".join(
        f'<a href="{html.escape(pillar["path"], quote=True)}">{html.escape(pillar["label"])} ↗</a>'
        for pillar in library["activePillars"]
    )
    return (
        '<section class="product-front-door studio" aria-labelledby="product-front-door-title" '
        'data-product-front-door>'
        '<div class="studio__shell">'
        '<div class="studio__header">'
        f'<p class="studio__eyebrow">{html.escape(hero["eyebrow"])}</p>'
        '<a href="evidence/" class="studio__verification">Explore our evidence standards <span aria-hidden="true">↗</span></a>'
        '</div>'
        '<div class="studio__intro">'
        '<div class="studio__editorial">'
        '<p class="studio__serial">Independent research practice <span aria-hidden="true">/</span> Patiala · Worldwide</p>'
        f'<h1 id="product-front-door-title">{html.escape(hero["title"])}</h1>'
        f'<p class="studio__statement">{html.escape(hero["summary"])}</p>'
        '<div class="studio__primary-actions">'
        '<a class="studio__primary" href="#evidence-desk">Explore the evidence desk <span aria-hidden="true">↗</span></a>'
        '<a class="studio__secondary" href="services/">Talk through a research problem →</a>'
        '</div>'
        '</div>'
        '<div class="studio__illustration" role="img" aria-label="Illustrative research pathway: question, evidence, method and defensible decision record">'
        '<svg viewBox="0 0 520 460" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">'
        '<defs><linearGradient id="studio-curve" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dab974"/><stop offset="1" stop-color="#8ca4b6"/></linearGradient></defs>'
        '<circle cx="260" cy="230" r="174" class="studio-orbit" />'
        '<circle cx="260" cy="230" r="116" class="studio-orbit studio-orbit--inner" />'
        '<path d="M94 299C132 139 305 96 426 167M96 301C230 365 316 346 424 169" class="studio-curve" />'
        '<path d="M146 260L260 152 374 260 260 365Z" class="studio-rhombus"/>'
        '<path d="M146 260H374M260 152V365" class="studio-rhombus-line"/>'
        '<circle cx="146" cy="260" r="7" class="studio-node"/><circle cx="260" cy="152" r="7" class="studio-node"/>'
        '<circle cx="374" cy="260" r="7" class="studio-node"/><circle cx="260" cy="365" r="7" class="studio-node"/>'
        '<text x="260" y="215" text-anchor="middle" class="studio-svg-overline">EVIDENCE</text>'
        '<text x="260" y="244" text-anchor="middle" class="studio-svg-title">GURJAS</text>'
        '<text x="260" y="265" text-anchor="middle" class="studio-svg-small">SOURCE → REASON → RECORD</text>'
        '<text x="72" y="278" class="studio-svg-label">01 / ASK</text>'
        '<text x="260" y="106" text-anchor="middle" class="studio-svg-label">02 / VERIFY</text>'
        '<text x="391" y="278" class="studio-svg-label">03 / ANALYSE</text>'
        '<text x="260" y="410" text-anchor="middle" class="studio-svg-label">04 / DOCUMENT</text>'
        '</svg>'
        '<p class="studio__illustration-caption">A decision is only as strong as the evidence you can trace.</p>'
        '</div>'
        '</div>'
        f'<ul class="studio-footprint" aria-label="Practice principles">{trust}</ul>'
        '<div class="studio-workbench" id="evidence-desk">'
        '<div class="studio-workbench__head">'
        '<div><p class="studio__section-label">01 / Evidence Desk</p>'
        '<h2>Begin with the decision.<br><em>Not a sales pitch.</em></h2></div>'
        '<p>Explore three concrete questions using existing Gurjas tools. '
        'The pathway explains what gets examined—and what the tool cannot decide.</p>'
        '</div>'
        '<div class="studio-workbench__surface" data-studio-workbench>'
        '<div class="studio-workbench__rail">'
        '<p class="studio-workbench__rail-label">Choose a research moment</p>'
        f'<div class="studio-workbench__tabs" role="tablist" aria-label="Research pathways">{tabs}</div>'
        '<p class="studio-workbench__rail-note">Illustrative workflow, not a completed assessment. '
        'No personal data or research question is sent by this interface.</p>'
        '</div>'
        f'<div class="studio-workbench__panels">{panels}</div>'
        '</div></div>'
        '<div class="studio-directory" id="research-tools">'
        '<div class="studio-directory__intro">'
        '<div><p class="studio__section-label">02 / Research instruments</p>'
        '<h2>Useful instruments. <em>No gatekeeping.</em></h2></div>'
        '<a href="tools/">View the complete tools hub ↗</a>'
        '</div>'
        '<form class="studio-directory__search" action="tools/" method="get" role="search" data-product-search>'
        '<label for="home-task-search">Find a tool by research task</label>'
        '<div class="studio-directory__search-control">'
        '<input id="home-task-search" name="task" type="search" autocomplete="off" '
        'placeholder="Try journal, references, SEM, NAAC…" data-product-search-input>'
        '<button type="submit">Find tool ↗</button>'
        '<button type="reset">Clear</button></div>'
        '<p class="studio-directory__status" id="product-search-status" role="status" aria-live="polite" '
        'data-product-search-status><strong data-product-search-count>11</strong> tools available. '
        'Filtering stays in your browser.</p></form>'
        '<details class="studio-directory__details" data-studio-directory>'
        '<summary>Browse all 11 research tools <span aria-hidden="true">＋</span></summary>'
        f'<ul class="studio-directory__list">{cards}</ul>'
        '<p class="product-front-door__empty" hidden data-product-search-empty>'
        'No matching tool. <a href="tools/">Browse the tools hub</a>.</p>'
        '</details></div>'
        '<div class="studio-library">'
        '<div><p class="studio__section-label">03 / Knowledge behind the method</p>'
        '<h2>Read the sources.<br><em>Question the assumptions.</em></h2>'
        f'<p>{html.escape(library["summary"])}</p></div>'
        '<div class="studio-library__links">'
        f'<a href="{html.escape(library["path"], quote=True)}">Explore the Research Library <span aria-hidden="true">↗</span></a>'
        f'{pillars}'
        '<a href="evidence/">Inspect the Proof Ledger ↗</a>'
        '</div>'
        '</div>'
        '<div class="studio-endpoint"><span>Need a second pair of eyes on the evidence?</span>'
        '<a href="services/">Explore scoped research and institutional advisory →</a></div>'
        '</div></section>'
    )

def signal_icon(name: str) -> str:
    icons = {
        "institution": (
            '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 19h34M11 19v18m9-18v18m8-18v18m9-18v18M7 38h34M24 7l17 8H7l17-8Z"/></svg>'
        ),
        "network": (
            '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="12" cy="13" r="5"/><circle cx="36" cy="13" r="5"/><circle cx="24" cy="36" r="5"/><path d="m16 16 6 15m10-15-6 15M17 13h14"/></svg>'
        ),
        "award": (
            '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="19" r="11"/><path d="m17 28-3 13 10-5 10 5-3-13M19 19l3 3 7-7"/></svg>'
        ),
        "system": (
            '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="8" width="34" height="10" rx="2"/><rect x="7" y="23" width="34" height="17" rx="2"/><path d="M13 13h1m5 0h1m-7 17h10m-10 5h18"/></svg>'
        ),
    }
    if name not in icons:
        raise RuntimeError(f"Unsupported proof-system icon: {name}")
    return icons[name]


def render_signal(signal: dict) -> str:
    return (
        f'<a class="home-proof-signal" href="{html.escape(signal["path"], quote=True)}" '
        f'data-proof-signal="{html.escape(signal["id"], quote=True)}">'
        f'<span class="home-proof-signal__icon">{signal_icon(signal["icon"])}</span>'
        '<span class="home-proof-signal__copy">'
        f'<span class="home-proof-signal__label">{html.escape(signal["label"])}</span>'
        f'<strong>{html.escape(signal["title"])}</strong>'
        f'<small>{html.escape(signal["detail"])}</small>'
        f'<em>{html.escape(signal["classification"])}</em>'
        '</span>'
        '<b aria-hidden="true">↗</b>'
        '</a>'
    )


def render_profile_metric(metric: dict) -> str:
    return (
        '<div>'
        f'<dt data-fact="{html.escape(metric["factPath"], quote=True)}">{html.escape(metric["fallback"])}</dt>'
        f'<dd>{html.escape(metric["label"])}</dd>'
        '</div>'
    )


def render_experience_metric(item: dict) -> str:
    fact_paths = " ".join(
        f'data-proof-fact-{index + 1}="{html.escape(path, quote=True)}"'
        for index, path in enumerate(item["factPaths"])
    )
    return (
        f'<article class="home-principal-profile__experience-card" {fact_paths}>'
        f'<strong>{html.escape(item["value"])}</strong>'
        f'<span>{html.escape(item["label"])}</span>'
        f'<small><b>Boundary:</b> {html.escape(item["boundary"])}</small>'
        '</article>'
    )


def render_proof_system(proof: dict) -> str:
    section = proof["section"]
    profile = proof["profile"]
    signals = "".join(render_signal(signal) for signal in proof["signals"])
    roles = "".join(f"<li>{html.escape(role)}</li>" for role in profile["roles"])
    metrics = "".join(render_profile_metric(metric) for metric in profile["metrics"])
    experience = "".join(render_experience_metric(item) for item in profile["experience"])

    return (
        '<div class="home-proof-system" role="region" aria-labelledby="home-proof-system-title" data-home-proof-system>'
        '<div class="home-proof-system__head">'
        '<div>'
        f'<p class="home-kicker">{html.escape(section["eyebrow"])}</p>'
        f'<h2 class="home-h2" id="home-proof-system-title">{html.escape(section["title"])}</h2>'
        '</div>'
        f'<p>{html.escape(section["summary"])}</p>'
        '</div>'
        f'<div class="home-proof-system__signals">{signals}</div>'
        '<details class="home-principal-profile">'
        '<summary>'
        '<span class="home-principal-profile__summary-icon" aria-hidden="true">'
        '<svg viewBox="0 0 48 48"><circle cx="24" cy="15" r="8"/><path d="M10 40c1-10 6-15 14-15s13 5 14 15M36 8h5m-2.5-2.5v5"/></svg>'
        '</span>'
        '<span class="home-principal-profile__summary-copy">'
        f'<small>{html.escape(profile["eyebrow"])}</small>'
        f'<strong>{html.escape(profile["title"])}</strong>'
        f'<em>{html.escape(profile["hint"])}</em>'
        '</span>'
        '<span class="home-principal-profile__summary-toggle" aria-hidden="true"></span>'
        '</summary>'
        '<div class="home-principal-profile__body">'
        f'<ul class="home-principal-profile__roles" aria-label="Selected Principal Consultant credentials">{roles}</ul>'
        f'<dl class="home-principal-profile__metrics">{metrics}</dl>'
        f'<div class="home-principal-profile__experience">{experience}</div>'
        f'<p class="home-principal-profile__note">{html.escape(profile["note"])}</p>'
        '<div class="home-principal-profile__links">'
        f'<a href="{html.escape(profile["profilePath"], quote=True)}">Review the full profile and external sources →</a>'
        f'<a href="{html.escape(profile["evidencePath"], quote=True)}">Inspect the Gurjas Proof Ledger →</a>'
        '</div>'
        '</div>'
        '</details>'
        '</div>'
    )


def replace_capability_proof(document: str, proof: dict) -> str:
    pattern = (
        r'\s*<div class="home-capability" role="region" aria-labelledby="h-capability">'
        r'[\s\S]*?<p class="home-academic-note">[\s\S]*?</p>\s*</div>\s*</div>'
    )
    replacement = "\n\n" + render_proof_system(proof)
    document, count = re.subn(pattern, replacement, document, count=1)
    if count != 1:
        raise RuntimeError("Legacy homepage capability block is missing or ambiguous")
    return document


def compose_product_front_door(document: str) -> str:
    contract = load_contract()
    proof = load_proof_system()
    document = remove_legacy_capability_stylesheet(document)
    # Legacy stylesheet stays for shared non-home rules until visual parity is approved.
    document = ensure_stylesheet(document, "assets/product-front-door.css?v=2")
    document = ensure_stylesheet(document, "assets/home-proof-refinement.css?v=1")
    document = ensure_script(document, "assets/evidence-studio-home.js?v=1")
    document = replace_metadata(document)
    document = simplify_home_navigation(document)

    front_door = render_front_door(contract, proof)
    hero_pattern = (
        r'<div class="home-hero">[\s\S]*?</div>\s*'
        r'<nav class="home-proof-ticker" aria-label="Practice at a glance">[\s\S]*?</nav>'
    )
    document, count = re.subn(hero_pattern, front_door, document, count=1)
    if count != 1:
        raise RuntimeError("Homepage hero and proof ticker are missing or ambiguous")

    document = replace_capability_proof(document, proof)

    legacy_tools_pattern = (
        r'\s*<section class="home-section home-section--dark" aria-labelledby="h-tools">'
        r'[\s\S]*?</section>\s*(?=<section class="home-section home-section--tint")'
    )
    document, count = re.subn(legacy_tools_pattern, "\n\n", document, count=1)
    if count != 1:
        raise RuntimeError("Legacy homepage tool section is missing or ambiguous")

    return document
