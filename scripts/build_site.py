#!/usr/bin/env python3
"""Build gurjas.org with one authoritative site shell.

The current page files remain the content source during the low-risk migration.
Their page-specific <head>, <main> and inline tool scripts are preserved, while
copied headers, footers and shared-script tags are replaced by reusable,
data-driven templates. Output remains plain static HTML for GitHub Pages.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "_site"
SITE_DIR = ROOT / "site"
TEMPLATE_DIR = SITE_DIR / "templates"
SITE_DATA = SITE_DIR / "data" / "site.json"
FACTS_DATA = ROOT / "data" / "site-facts.json"

EXCLUDED_TOP_LEVEL = {
    ".git",
    ".github",
    "_site",
    "_templates",
    "reviews",
    "scripts",
    "site",
    "__pycache__",
}
PUBLIC_ROOT_FILES = {
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
        current = ' aria-current="page"' if section == item["section"] else ""
        css = ' class="nav-cta"' if item.get("cta") else ""
        items.append(
            f'<li><a href="{root}{html.escape(item["path"])}"{css}{current}>'
            f'{html.escape(item["label"])}</a></li>'
        )
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
    values = {
        "HEAD": head_match.group(1).strip(),
        "BODY_ATTRIBUTES": body_match.group("attrs"),
        "HEADER": render_header(site, root, current_section(rel)),
        "MAIN": main_match.group(0).strip(),
        "FOOTER": render_footer(site, facts, root),
        "PAGE_SCRIPTS": scripts,
        "ROOT": root,
        "ASSET_VERSION": html.escape(str(site["assetVersion"])),
    }
    return replace_tokens(read_template("base.html"), values).rstrip() + "\n"


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


def build(output: Path, clean: bool) -> int:
    if clean and output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    site = read_json(SITE_DATA)
    facts = read_json(FACTS_DATA)
    pages = source_html_files()
    if len(pages) < 20:
        raise RuntimeError(f"Refusing suspicious build with only {len(pages)} source pages")

    copy_public_files(output)
    for source in pages:
        rel = source.relative_to(ROOT)
        destination = output / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(render_page(source, site, facts), encoding="utf-8")

    print(f"Built {len(pages)} HTML pages into {output.relative_to(ROOT)}")
    return len(pages)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--clean", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    build(output.resolve(), args.clean)
