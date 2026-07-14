#!/usr/bin/env python3
"""Validate the generated static site without network access."""
from __future__ import annotations

import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"
OFFERS_DATA = ROOT / "site" / "data" / "offers.json"
EXCLUDED_TOP_LEVEL = {
    ".git",
    ".github",
    "_site",
    "_templates",
    "reviews",
    "scripts",
    "site",
    "operations",
    "__pycache__",
}
MAIN_RE = re.compile(r"<main\b[^>]*>.*?</main>", re.IGNORECASE | re.DOTALL)
CANONICAL_RE = re.compile(
    r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
JSONLD_RE = re.compile(
    r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)
UNRESOLVED_TOKEN_RE = re.compile(r"\[\[[A-Z0-9_]+\]\]")
REQUIRED_OFFER_KEYS = {
    "slug",
    "serviceType",
    "eyebrow",
    "title",
    "metaTitle",
    "metaDescription",
    "intro",
    "problem",
    "inaction",
    "for",
    "notFor",
    "outcomes",
    "deliverables",
    "inputs",
    "method",
    "entryOffer",
    "priceFactors",
    "exclusions",
    "proof",
    "faq",
    "cta",
    "subject",
}


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag in {"a", "link"} and values.get("href"):
            self.references.append((tag, values["href"] or ""))
        if tag in {"img", "script", "source"} and values.get("src"):
            self.references.append((tag, values["src"] or ""))


def source_pages() -> list[Path]:
    pages = []
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT)
        if rel.parts[0] in EXCLUDED_TOP_LEVEL:
            continue
        pages.append(path)
    return sorted(pages)


def load_offers() -> list[dict[str, object]]:
    data = json.loads(OFFERS_DATA.read_text(encoding="utf-8"))
    return data.get("offers", [])


def offer_routes() -> set[Path]:
    return {Path("services") / str(offer["slug"]) / "index.html" for offer in load_offers()}


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def route_for(rel: Path) -> str:
    if rel.name == "index.html":
        parent = rel.parent.as_posix()
        return "/" if parent == "." else f"/{parent}/"
    return f"/{rel.as_posix()}"


def expected_file_for_url(url_path: str, base_file: Path) -> Path | None:
    parsed = urlparse(url_path)
    if parsed.scheme or parsed.netloc or url_path.startswith("//"):
        return None
    path = unquote(parsed.path)
    if not path:
        return None
    if path.startswith("/"):
        candidate = OUTPUT / path.lstrip("/")
    else:
        candidate = base_file.parent / path
    try:
        candidate = candidate.resolve()
        candidate.relative_to(OUTPUT.resolve())
    except (ValueError, OSError):
        return Path("__outside_output__")
    if path.endswith("/"):
        return candidate / "index.html"
    if candidate.exists():
        return candidate
    if not candidate.suffix:
        return candidate / "index.html"
    return candidate


def check_offer_data() -> list[str]:
    errors: list[str] = []
    offers = load_offers()
    if len(offers) != 4:
        errors.append(f"Expected four priority offers, found {len(offers)}")
        return errors

    slugs: set[str] = set()
    titles: set[str] = set()
    ctas: set[str] = set()
    for index, offer in enumerate(offers, start=1):
        missing = REQUIRED_OFFER_KEYS - set(offer)
        if missing:
            errors.append(f"Offer {index} missing fields: {', '.join(sorted(missing))}")
            continue
        slug = str(offer["slug"])
        title = str(offer["title"])
        cta = str(offer["cta"])
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            errors.append(f"Offer slug is not URL-safe: {slug}")
        if slug in slugs:
            errors.append(f"Duplicate offer slug: {slug}")
        if title in titles:
            errors.append(f"Duplicate offer title: {title}")
        if cta in ctas:
            errors.append(f"Duplicate primary CTA: {cta}")
        slugs.add(slug)
        titles.add(title)
        ctas.add(cta)

        entry = offer.get("entryOffer", {})
        for key in ("name", "scope", "timeline", "investment"):
            if not isinstance(entry, dict) or not str(entry.get(key, "")).strip():
                errors.append(f"{slug}: entryOffer.{key} is required")
        for key in ("for", "notFor", "outcomes", "deliverables", "inputs", "method", "priceFactors", "exclusions", "proof", "faq"):
            value = offer.get(key)
            if not isinstance(value, list) or not value:
                errors.append(f"{slug}: {key} must be a non-empty list")

        serialized = json.dumps(offer, ensure_ascii=False).lower()
        for banned in ("we guarantee", "guaranteed outcome", "100% success"):
            if banned in serialized:
                errors.append(f"{slug}: prohibited outcome claim: {banned}")
    return errors


def check() -> list[str]:
    errors: list[str] = check_offer_data()
    pages = source_pages()
    generated_offers = offer_routes()
    if not OUTPUT.exists():
        return errors + ["_site does not exist; run scripts/build_site.py first"]

    built_pages = sorted(OUTPUT.rglob("*.html"))
    expected_rel = {page.relative_to(ROOT) for page in pages} | generated_offers
    built_rel = {page.relative_to(OUTPUT) for page in built_pages}
    if expected_rel != built_rel:
        missing = sorted(expected_rel - built_rel)
        extra = sorted(built_rel - expected_rel)
        if missing:
            errors.append("Missing generated routes: " + ", ".join(map(str, missing)))
        if extra:
            errors.append("Unexpected generated routes: " + ", ".join(map(str, extra)))

    for source in pages:
        rel = source.relative_to(ROOT)
        built = OUTPUT / rel
        if not built.exists():
            continue
        source_text = source.read_text(encoding="utf-8")
        built_text = built.read_text(encoding="utf-8")
        source_main = MAIN_RE.search(source_text)
        built_main = MAIN_RE.search(built_text)
        if not source_main or not built_main:
            errors.append(f"{rel}: source or output is missing <main>")
            continue
        if sha(source_main.group(0).strip()) != sha(built_main.group(0).strip()):
            errors.append(f"{rel}: page-specific <main> content changed during build")

    for built in built_pages:
        rel = built.relative_to(OUTPUT)
        built_text = built.read_text(encoding="utf-8")
        if built_text.count('data-site-system="header"') != 1:
            errors.append(f"{rel}: generated shared header missing or duplicated")
        if built_text.count('data-site-system="footer"') != 1:
            errors.append(f"{rel}: generated shared footer missing or duplicated")
        if built_text.count("script.js?v=") != 1:
            errors.append(f"{rel}: shared script reference missing or duplicated")
        if UNRESOLVED_TOKEN_RE.search(built_text):
            errors.append(f"{rel}: unresolved template token")

        if rel.name != "404.html":
            canonical = CANONICAL_RE.search(built_text)
            if not canonical:
                errors.append(f"{rel}: canonical URL missing")
            else:
                parsed = urlparse(canonical.group(1))
                expected_route = route_for(rel)
                if parsed.scheme != "https" or parsed.netloc != "gurjas.org" or parsed.path != expected_route:
                    errors.append(
                        f"{rel}: canonical {canonical.group(1)!r} does not match https://gurjas.org{expected_route}"
                    )

        for block in JSONLD_RE.findall(built_text):
            try:
                json.loads(block)
            except json.JSONDecodeError as exc:
                errors.append(f"{rel}: malformed JSON-LD: {exc}")

        parser = ReferenceParser()
        parser.feed(built_text)
        for tag, reference in parser.references:
            target = expected_file_for_url(reference, built)
            if target is not None and not target.exists():
                errors.append(f"{rel}: broken local {tag} reference {reference!r}")

    for rel in generated_offers:
        path = OUTPUT / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for marker in (
            'class="offer-page"',
            "The buyer problem",
            "Good fit",
            "Not a fit",
            "Exact deliverables",
            "Client inputs",
            "Indicative investment",
            "Ethical boundaries",
            "Questions to settle before a fit call",
        ):
            if marker not in text:
                errors.append(f"{rel}: missing required offer section {marker!r}")
        if "offers.css?v=" not in text:
            errors.append(f"{rel}: offer stylesheet missing")
        if '"@type": "Service"' not in text or '"@type": "FAQPage"' not in text:
            errors.append(f"{rel}: Service or FAQ schema missing")

    sitemap = OUTPUT / "sitemap.xml"
    sitemap_paths: set[str] = set()
    if not sitemap.exists():
        errors.append("sitemap.xml missing from build")
    else:
        try:
            root = ET.parse(sitemap).getroot()
            namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            for loc in root.findall("sm:url/sm:loc", namespace):
                if not loc.text:
                    continue
                parsed = urlparse(loc.text.strip())
                if parsed.scheme != "https" or parsed.netloc != "gurjas.org":
                    errors.append(f"sitemap contains non-canonical host: {loc.text}")
                    continue
                sitemap_paths.add(parsed.path)
                target = expected_file_for_url(parsed.path, OUTPUT / "index.html")
                if target is not None and not target.exists():
                    errors.append(f"sitemap route has no generated file: {parsed.path}")
        except ET.ParseError as exc:
            errors.append(f"sitemap.xml is malformed: {exc}")

    for rel in generated_offers:
        route = route_for(rel)
        if route not in sitemap_paths:
            errors.append(f"Priority offer missing from sitemap: {route}")

    for required in ["CNAME", ".nojekyll", "style.css", "offers.css", "script.js", "robots.txt", "site.webmanifest"]:
        if not (OUTPUT / required).exists():
            errors.append(f"required public file missing: {required}")

    for source_only in ["site", "scripts", "reviews", "operations"]:
        if (OUTPUT / source_only).exists():
            errors.append(f"source-only directory leaked into public artifact: {source_only}")

    return errors


if __name__ == "__main__":
    failures = check()
    if failures:
        print("Build checks failed:")
        for failure in failures:
            print(" -", failure)
        sys.exit(1)
    print(f"Build checks passed for {len(source_pages())} source routes and {len(offer_routes())} generated offer routes.")
