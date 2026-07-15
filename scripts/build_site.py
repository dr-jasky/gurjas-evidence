#!/usr/bin/env python3
"""Build gurjas.org with one authoritative site shell.

Existing page files remain the content source during the low-risk migration.
Their page-specific <head>, <main> and inline tool scripts are preserved, while
copied headers, footers and shared-script tags are replaced by reusable,
data-driven templates. Priority offer pages are generated from one shared
content model and layout. Output remains plain static HTML for GitHub Pages.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "_site"
SITE_DIR = ROOT / "site"
TEMPLATE_DIR = SITE_DIR / "templates"
SITE_DATA = SITE_DIR / "data" / "site.json"
OFFERS_DATA = SITE_DIR / "data" / "offers.json"
FACTS_DATA = ROOT / "data" / "site-facts.json"
INDEXNOW_KEY = "127d4f6734fd4c5b8f7308201fd3d836"

EXCLUDED_TOP_LEVEL = {
    ".git",
    ".github",
    "_site",
    "_templates",
    "node_modules",
    "reviews",
    "scripts",
    "site",
    "tests",
    "operations",
    "__pycache__",
}
PUBLIC_ROOT_FILES = {
    f"{INDEXNOW_KEY}.txt",
    "CNAME",
    "favicon.ico",
    "humans.txt",
    "robots.txt",
    "script.js",
    "site.webmanifest",
    "sitemap.xml",
    "style.css",
}

HEAD_RE = re.compile(r"<head\b[^>]*>(.*?)</head>", re.IGNORECASE | re.DOTALL)
BODY_RE = re.compile(r"<body(?P<attrs>[^>]*)>", re.IGNORECASE)
MAIN_RE = re.compile(r"<main\b[^>]*>.*?</main>", re.IGNORECASE | re.DOTALL)
HEADER_RE = re.compile(r"<header\b[^>]*class=[\"'][^\"']*\bsite-head\b[^\"']*[\"'][^>]*>.*?</header>", re.IGNORECASE | re.DOTALL)
FOOTER_RE = re.compile(r"<footer\b[^>]*class=[\"'][^\"']*\bsite-foot\b[^\"']*[\"'][^>]*>.*?</footer>", re.IGNORECASE | re.DOTALL)
BODY_CLOSE_RE = re.compile(r"</body>", re.IGNORECASE)
SHARED_SCRIPT_RE = re.compile(
    r"<script\b[^>]*src=[\"'][^\"']*script\.js(?:\?[^\"']*)?[\"'][^>]*>\s*</script>",
    re.IGNORECASE | re.DOTALL,
)
STYLE_VERSION_RE = re.compile(r"(style\.css\?v=)[^\"']+", re.IGNORECASE)
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_template(name: str) -> str:
    return (TEMPLATE_DIR / name).read_text(encoding="utf-8")


def source_html_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT)
        if rel.parts[0] in EXCLUDED_TOP_LEVEL:
            continue
        files.append(path)
    return sorted(files)


def root_prefix(rel: Path) -> str:
    depth = len(rel.parent.parts)
    return "../" * depth


def current_section(rel: Path) -> str:
    if rel.name == "404.html" or len(rel.parts) == 1:
        return ""
    return rel.parts[0]


def render_navigation(site: dict[str, Any], root: str, section: str) -> str:
    items: list[str] = []
    guide_control = (
        '<li class="nav-guide-item"><button class="nav-guide" type="button" '
        'aria-haspopup="dialog" aria-expanded="false" aria-controls="gurjas-site-guide" '
        'data-site-guide><span aria-hidden="true"></span>Site guide</button></li>'
    )
    guide_added = False
    for item in site["navigation"]:
        children = item.get("children")
        if children:
            child_sections = {child["section"] for child in children}
            active = section in child_sections
            active_attr = ' aria-current="true"' if active else ""
            subitems = []
            for child in children:
                current = ' aria-current="page"' if section == child["section"] else ""
                subitems.append(
                    f'<li><a href="{root}{html.escape(child["path"])}"{current}>'
                    f'{html.escape(child["label"])}</a></li>'
                )
            items.append(
                '<li class="has-sub">'
                f'<button class="sub-btn" type="button" aria-expanded="false" '
                f'aria-haspopup="true"{active_attr}>{html.escape(item["label"])}</button>'
                f'<ul class="subnav">{"".join(subitems)}</ul></li>'
            )
            continue
        if item.get("cta") and not guide_added:
            items.append(guide_control)
            guide_added = True
        current = ' aria-current="page"' if section == item["section"] else ""
        css = ' class="nav-cta"' if item.get("cta") else ""
        items.append(
            f'<li><a href="{root}{html.escape(item["path"])}"{css}{current}>'
            f'{html.escape(item["label"])}</a></li>'
        )
    if not guide_added:
        items.append(guide_control)
    return "".join(items)


def render_verification_links(site: dict[str, Any], footer: bool = False) -> str:
    links = []
    for profile in site["verificationProfiles"]:
        suffix = "" if footer else " ↗"
        links.append(
            f'<a href="{html.escape(profile["url"], quote=True)}" rel="noopener">'
            f'{html.escape(profile["label"])}{suffix}</a>'
        )
    return ", ".join(links) if footer else "\n        ".join(links)


def render_footer_columns(site: dict[str, Any], root: str) -> str:
    columns = []
    for column in site["footerColumns"]:
        links = "".join(
            f'<li><a href="{root}{html.escape(link["path"])}">{html.escape(link["label"])}</a></li>'
            for link in column["links"]
        )
        columns.append(
            f'<nav aria-label="Footer — {html.escape(column["heading"].lower())}">'
            f'<h2 class="foot-h">{html.escape(column["heading"])}</h2><ul>{links}</ul></nav>'
        )
    return "\n    ".join(columns)


def replace_tokens(template: str, values: dict[str, str]) -> str:
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace(f"[[{key}]]", value)
    leftovers = sorted(set(re.findall(r"\[\[([A-Z0-9_]+)\]\]", rendered)))
    if leftovers:
        raise ValueError(f"Unresolved template tokens: {', '.join(leftovers)}")
    return rendered


def render_header(site: dict[str, Any], root: str, section: str) -> str:
    brand = site["brand"]
    return replace_tokens(
        read_template("header.html"),
        {
            "ROOT": root,
            "BRAND_NAME": html.escape(brand["name"]),
            "BRAND_SHORT": html.escape(brand["shortName"]),
            "BRAND_STRAPLINE": html.escape(brand["strapline"]),
            "NAVIGATION": render_navigation(site, root, section),
            "VERIFICATION_LINKS": render_verification_links(site),
        },
    )


def render_footer(site: dict[str, Any], facts: dict[str, Any], root: str) -> str:
    brand = site["brand"]
    contact = facts["contact"]
    phone_digits = re.sub(r"\D", "", contact["phoneE164"])
    return replace_tokens(
        read_template("footer.html"),
        {
            "ROOT": root,
            "BRAND_NAME": html.escape(brand["name"]),
            "FOOTER_LINE": html.escape(brand["footerLine"]),
            "ENTERPRISE_LINE": html.escape(site["enterpriseLine"]),
            "LOCATION_LINE": html.escape(site["locationLine"]),
            "PHONE_E164": html.escape(contact["phoneE164"], quote=True),
            "PHONE_DISPLAY": html.escape(contact["phoneDisplay"]),
            "PHONE_DIGITS": phone_digits,
            "EMAIL": html.escape(contact["email"]),
            "FOOTER_COLUMNS": render_footer_columns(site, root),
            "YEAR": str(datetime.now(timezone.utc).year),
            "COPYRIGHT": html.escape(site["copyright"]),
            "FOOTER_VERIFICATION_LINKS": render_verification_links(site, footer=True),
        },
    )


def extract_page_scripts(document: str, main_end: int, body_end: int) -> str:
    tail = document[main_end:body_end]
    tail = FOOTER_RE.sub("", tail)
    tail = SHARED_SCRIPT_RE.sub("", tail)
    return tail.strip()


def render_page(path: Path, site: dict[str, Any], facts: dict[str, Any]) -> str:
    document = path.read_text(encoding="utf-8")
    rel = path.relative_to(ROOT)
    head_match = HEAD_RE.search(document)
    body_match = BODY_RE.search(document)
    main_match = MAIN_RE.search(document)
    body_close = BODY_CLOSE_RE.search(document)
    if not all((head_match, body_match, main_match, body_close)):
        raise ValueError(f"{rel}: expected head, body, main and body close tags")
    if not HEADER_RE.search(document) or not FOOTER_RE.search(document):
        raise ValueError(f"{rel}: expected the legacy site header and footer during migration")

    root = root_prefix(rel)
    scripts = extract_page_scripts(document, main_match.end(), body_close.start())
    asset_version = html.escape(str(site["assetVersion"]), quote=True)
    head = STYLE_VERSION_RE.sub(lambda match: f"{match.group(1)}{asset_version}", head_match.group(1).strip())
    values = {
        "HEAD": head,
        "BODY_ATTRIBUTES": body_match.group("attrs"),
        "HEADER": render_header(site, root, current_section(rel)),
        "MAIN": main_match.group(0).strip(),
        "FOOTER": render_footer(site, facts, root),
        "PAGE_SCRIPTS": scripts,
        "ROOT": root,
        "ASSET_VERSION": html.escape(str(site["assetVersion"])),
    }
    return replace_tokens(read_template("base.html"), values).rstrip() + "\n"


def list_items(items: list[str]) -> str:
    return "".join(f"<li>{html.escape(item)}</li>" for item in items)


def render_offer_head(offer: dict[str, Any], root: str, asset_version: str) -> str:
    canonical = f'https://gurjas.org/services/{offer["slug"]}/'
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://gurjas.org/"},
                    {"@type": "ListItem", "position": 2, "name": "Services", "item": "https://gurjas.org/services/"},
                    {"@type": "ListItem", "position": 3, "name": offer["title"], "item": canonical},
                ],
            },
            {
                "@type": "Service",
                "name": offer["title"],
                "serviceType": offer["serviceType"],
                "description": offer["metaDescription"],
                "provider": {"@id": "https://gurjas.org/#org"},
                "areaServed": ["India", "Canada", "Worldwide (remote)"],
                "url": canonical,
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["q"],
                        "acceptedAnswer": {"@type": "Answer", "text": item["a"]},
                    }
                    for item in offer["faq"]
                ],
            },
        ],
    }
    meta_title = html.escape(offer["metaTitle"])
    description = html.escape(offer["metaDescription"], quote=True)
    return "\n".join(
        [
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1">',
            '<!-- Non-essential analytics load only after explicit consent through script.js. -->',
            f"<title>{meta_title}</title>",
            f'<meta name="description" content="{description}">',
            f'<link rel="canonical" href="{canonical}">',
            '<meta name="author" content="Gurjas Evidence and Policy Analytics">',
            '<meta name="robots" content="index, follow, max-image-preview:large">',
            '<meta name="theme-color" content="#041226">',
            '<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="Gurjas Evidence and Policy Analytics">',
            f'<meta property="og:title" content="{meta_title}">',
            f'<meta property="og:description" content="{description}">',
            f'<meta property="og:url" content="{canonical}">',
            '<meta property="og:image" content="https://gurjas.org/assets/og-preview.png">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            '<meta property="og:locale" content="en_IN">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{meta_title}">',
            f'<meta name="twitter:description" content="{description}">',
            '<meta name="twitter:image" content="https://gurjas.org/assets/og-preview.png">',
            f'<link rel="icon" href="{root}favicon.ico" sizes="32x32">',
            f'<link rel="icon" href="{root}assets/favicon.png" type="image/png">',
            f'<link rel="apple-touch-icon" href="{root}assets/apple-touch-icon.png">',
            f'<link rel="manifest" href="{root}site.webmanifest">',
            '<link rel="preconnect" href="https://fonts.googleapis.com">',
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
            '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,320;0,9..144,340;0,9..144,420;0,9..144,450;0,9..144,550;1,9..144,320;1,9..144,380;1,9..144,450&family=Newsreader:ital,wght@1,300..600&family=Spline+Sans+Mono:wght@400;500;700&display=swap">',
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,320;0,9..144,340;0,9..144,420;0,9..144,450;0,9..144,550;1,9..144,320;1,9..144,380;1,9..144,450&family=Newsreader:ital,wght@1,300..600&family=Spline+Sans+Mono:wght@400;500;700&display=swap" media="print" onload="this.media=&#39;all&#39;">',
            '<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,320;0,9..144,340;0,9..144,420;0,9..144,450;0,9..144,550;1,9..144,320;1,9..144,380;1,9..144,450&family=Newsreader:ital,wght@1,300..600&family=Spline+Sans+Mono:wght@400;500;700&display=swap"></noscript>',
            f'<link rel="preload" as="style" href="{root}style.css?v={asset_version}">',
            f'<link rel="stylesheet" href="{root}style.css?v={asset_version}">',
            f'<script type="application/ld+json">{json.dumps(graph, ensure_ascii=False)}</script>',
        ]
    )


def render_offer_main(offer: dict[str, Any], root: str) -> str:
    outcomes = "".join(
        f'<article class="offer-outcome"><span class="offer-num">0{number}</span><p>{html.escape(item)}</p></article>'
        for number, item in enumerate(offer["outcomes"], start=1)
    )
    method = "".join(
        f'<li><h3>{html.escape(step["title"])}</h3><p>{html.escape(step["text"])}</p></li>'
        for step in offer["method"]
    )
    proof = "".join(
        f'<a href="{html.escape(item["path"], quote=True)}">{html.escape(item["label"])}</a>'
        for item in offer["proof"]
    )
    faq = "".join(
        f'<details><summary>{html.escape(item["q"])}</summary><p>{html.escape(item["a"])}</p></details>'
        for item in offer["faq"]
    )
    cta_href = f'{root}contact/?service={quote(offer["slug"])}'
    entry = offer["entryOffer"]
    return replace_tokens(
        read_template("offer-main.html"),
        {
            "ROOT": root,
            "OFFER_EYEBROW": html.escape(offer["eyebrow"]),
            "OFFER_TITLE": html.escape(offer["title"]),
            "OFFER_INTRO": html.escape(offer["intro"]),
            "OFFER_PROBLEM": html.escape(offer["problem"]),
            "OFFER_INACTION": html.escape(offer["inaction"]),
            "FIT_LIST": list_items(offer["for"]),
            "NOT_FIT_LIST": list_items(offer["notFor"]),
            "OUTCOME_CARDS": outcomes,
            "DELIVERABLES_LIST": list_items(offer["deliverables"]),
            "INPUTS_LIST": list_items(offer["inputs"]),
            "METHOD_STEPS": method,
            "ENTRY_NAME": html.escape(entry["name"]),
            "ENTRY_SCOPE": html.escape(entry["scope"]),
            "ENTRY_TIMELINE": html.escape(entry["timeline"]),
            "ENTRY_INVESTMENT": html.escape(entry["investment"]),
            "PRICE_FACTORS_LIST": list_items(offer["priceFactors"]),
            "EXCLUSIONS_LIST": list_items(offer["exclusions"]),
            "PROOF_LINKS": proof,
            "FAQ_ITEMS": faq,
            "CTA_TEXT": html.escape(offer["cta"]),
            "CTA_HREF": html.escape(cta_href, quote=True),
        },
    )


def render_offer_page(offer: dict[str, Any], site: dict[str, Any], facts: dict[str, Any]) -> tuple[Path, str]:
    rel = Path("services") / offer["slug"] / "index.html"
    root = root_prefix(rel)
    values = {
        "HEAD": render_offer_head(offer, root, html.escape(str(site["assetVersion"]), quote=True)),
        "BODY_ATTRIBUTES": ' class="offer"',
        "HEADER": render_header(site, root, "services"),
        "MAIN": render_offer_main(offer, root),
        "FOOTER": render_footer(site, facts, root),
        "PAGE_SCRIPTS": "",
        "ROOT": root,
        "ASSET_VERSION": html.escape(str(site["assetVersion"])),
    }
    return rel, replace_tokens(read_template("base.html"), values).rstrip() + "\n"


def copy_public_files(output: Path) -> None:
    for name in PUBLIC_ROOT_FILES:
        source = ROOT / name
        if source.exists():
            shutil.copy2(source, output / name)

    for source in ROOT.rglob("*"):
        if not source.is_file():
            continue
        rel = source.relative_to(ROOT)
        if rel.parts[0] in EXCLUDED_TOP_LEVEL or len(rel.parts) == 1:
            continue
        if source.suffix.lower() == ".html":
            continue
        destination = output / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    (output / ".nojekyll").write_text("", encoding="utf-8")


def git_last_modified(source: Path, fallback: str) -> str:
    """Return the last content commit date, retaining the reviewed fallback outside Git."""
    try:
        relative = source.relative_to(ROOT)
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", relative.as_posix()],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        candidate = result.stdout.strip()
        if result.returncode == 0 and re.fullmatch(r"\d{4}-\d{2}-\d{2}", candidate):
            return candidate
    except (OSError, ValueError):
        pass
    return fallback


def write_generated_sitemap(output: Path) -> None:
    """Refresh sitemap dates from the actual source history without inventing freshness."""
    source_sitemap = ROOT / "sitemap.xml"
    tree = ET.parse(source_sitemap)
    root = tree.getroot()
    namespace = {"sm": SITEMAP_NS}
    ET.register_namespace("", SITEMAP_NS)

    for entry in root.findall("sm:url", namespace):
        loc = entry.find("sm:loc", namespace)
        lastmod = entry.find("sm:lastmod", namespace)
        if loc is None or not loc.text or lastmod is None or not lastmod.text:
            raise ValueError("Every sitemap URL requires loc and reviewed lastmod values")
        route = urlparse(loc.text.strip()).path
        if route == "/":
            source = ROOT / "index.html"
        else:
            source = ROOT / route.strip("/") / "index.html"
        if not source.exists() and route.startswith("/services/"):
            source = OFFERS_DATA
        if not source.exists():
            raise ValueError(f"Sitemap route {route} has no source page")
        lastmod.text = git_last_modified(source, lastmod.text.strip())

    ET.indent(tree, space="  ")
    tree.write(output / "sitemap.xml", encoding="utf-8", xml_declaration=True)


def build(output: Path, clean: bool) -> int:
    if clean and output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    site = read_json(SITE_DATA)
    facts = read_json(FACTS_DATA)
    offers = read_json(OFFERS_DATA)["offers"]
    pages = source_html_files()
    if len(pages) < 20:
        raise RuntimeError(f"Refusing suspicious build with only {len(pages)} source pages")
    if len(offers) != 4:
        raise RuntimeError(f"Expected four priority offers, found {len(offers)}")

    copy_public_files(output)
    for source in pages:
        rel = source.relative_to(ROOT)
        destination = output / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(render_page(source, site, facts), encoding="utf-8")

    for offer in offers:
        rel, document = render_offer_page(offer, site, facts)
        destination = output / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(document, encoding="utf-8")

    write_generated_sitemap(output)

    total = len(pages) + len(offers)
    print(f"Built {len(pages)} source pages and {len(offers)} generated offer pages into {output.relative_to(ROOT)}")
    return total


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--clean", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    build(output.resolve(), args.clean)
