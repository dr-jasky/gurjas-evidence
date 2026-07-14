#!/usr/bin/env python3
"""Validate the generated static site without network access."""
from __future__ import annotations

import hashlib
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"
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
    "__pycache__",
}
MAIN_RE = re.compile(r"<main\b[^>]*>.*?</main>", re.IGNORECASE | re.DOTALL)
CANONICAL_RE = re.compile(
    r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
UNRESOLVED_TOKEN_RE = re.compile(r"\[\[[A-Z0-9_]+\]\]")


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


def check() -> list[str]:
    errors: list[str] = []
    pages = source_pages()
    if not OUTPUT.exists():
        return ["_site does not exist; run scripts/build_site.py first"]

    built_pages = sorted(OUTPUT.rglob("*.html"))
    expected_rel = {page.relative_to(ROOT) for page in pages}
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

        parser = ReferenceParser()
        parser.feed(built_text)
        for tag, reference in parser.references:
            target = expected_file_for_url(reference, built)
            if target is not None and not target.exists():
                errors.append(f"{rel}: broken local {tag} reference {reference!r}")

    sitemap = OUTPUT / "sitemap.xml"
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
                target = expected_file_for_url(parsed.path, OUTPUT / "index.html")
                if target is not None and not target.exists():
                    errors.append(f"sitemap route has no generated file: {parsed.path}")
        except ET.ParseError as exc:
            errors.append(f"sitemap.xml is malformed: {exc}")

    for required in ["CNAME", ".nojekyll", "style.css", "script.js", "robots.txt", "site.webmanifest"]:
        if not (OUTPUT / required).exists():
            errors.append(f"required public file missing: {required}")

    return errors


if __name__ == "__main__":
    failures = check()
    if failures:
        print("Build checks failed:")
        for failure in failures:
            print(" -", failure)
        sys.exit(1)
    print(f"Build checks passed for {len(source_pages())} stable routes.")
