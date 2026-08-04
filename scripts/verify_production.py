#!/usr/bin/env python3
"""Verify that the deployed Gurjas site matches an expected source commit."""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

PRODUCTION_ORIGIN = "https://gurjas.org"
EXPECTED_NAVIGATION = (
    ("About", "/about/"),
    ("Services", "/services/"),
    ("Tools", "/tools/"),
    ("Library", "/knowledge/"),
    ("Insights", "/insights/"),
    ("Contact", "/contact/"),
)
PRIORITY_ROUTES = (
    ("/", "Where policy meets proof."),
    ("/services/", None),
    ("/services/research-integrity/", None),
    ("/services/naac-evidence-readiness/", None),
    ("/services/impact-evaluation/", None),
    ("/services/research-methods/", None),
    ("/knowledge/", "Answers that show their evidence."),
    ("/knowledge/library/doi-record-verification/", "How to verify a DOI record"),
    ("/knowledge/library/journal-indexing-verification/", "How to verify a journal"),
    ("/tools/", "Transparent research tools"),
    ("/tools/reference-integrity-checker/", "Evidence behind this tool"),
    ("/contact/", None),
    ("/privacy/", None),
)
SITEMAP_ROUTES = (
    "https://gurjas.org/",
    "https://gurjas.org/services/research-integrity/",
    "https://gurjas.org/services/naac-evidence-readiness/",
    "https://gurjas.org/services/impact-evaluation/",
    "https://gurjas.org/services/research-methods/",
    "https://gurjas.org/knowledge/",
    "https://gurjas.org/knowledge/library/doi-record-verification/",
    "https://gurjas.org/tools/reference-integrity-checker/",
    "https://gurjas.org/contact/",
)


@dataclass
class Check:
    name: str
    status: str
    detail: str
    url: str


class SiteDocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.has_main = False
        self.has_header = False
        self.has_footer = False
        self.canonical: str | None = None
        self.site_guide_count = 0
        self.nav_depth = 0
        self.nav_li_count = 0
        self.nav_links: list[tuple[str, str, str]] = []
        self._active_nav_href: str | None = None
        self._active_nav_class = ""
        self._active_nav_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if tag == "main":
            self.has_main = True
        if values.get("data-site-system") == "header":
            self.has_header = True
        if values.get("data-site-system") == "footer":
            self.has_footer = True
        if "data-site-guide" in values:
            self.site_guide_count += 1
        if tag == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonical = values.get("href") or None

        if tag == "nav" and values.get("id") == "nav":
            self.nav_depth = 1
        elif tag == "nav" and self.nav_depth:
            self.nav_depth += 1

        if self.nav_depth and tag == "li":
            self.nav_li_count += 1
        if self.nav_depth and tag == "a":
            self._active_nav_href = values.get("href", "")
            self._active_nav_class = values.get("class", "")
            self._active_nav_text = []

    def handle_data(self, data: str) -> None:
        if self._active_nav_href is not None:
            self._active_nav_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._active_nav_href is not None:
            label = " ".join("".join(self._active_nav_text).split())
            self.nav_links.append((label, self._active_nav_href, self._active_nav_class))
            self._active_nav_href = None
            self._active_nav_class = ""
            self._active_nav_text = []
        if tag == "nav" and self.nav_depth:
            self.nav_depth -= 1


def cache_busted(url: str, token: str) -> str:
    parts = urlsplit(url)
    query = parse_qsl(parts.query, keep_blank_values=True)
    query.append(("audit", token[:12]))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def fetch_text(url: str, token: str, timeout: int) -> tuple[str, dict[str, str], str]:
    request = Request(
        cache_busted(url, token),
        headers={
            "Accept": "text/html,application/json,application/xml,text/plain;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": "Gurjas-Production-Audit/1.0",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8", errors="replace")
        headers = {key.lower(): value for key, value in response.headers.items()}
        return body, headers, response.geturl()


def add_check(checks: list[Check], name: str, passed: bool, detail: str, url: str) -> None:
    checks.append(Check(name=name, status="passed" if passed else "failed", detail=detail, url=url))


def normalized_path(base: str, href: str) -> str:
    path = urlsplit(urljoin(base, href)).path
    if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
        path += "/"
    return path


def audit_html_route(
    checks: list[Check],
    base_url: str,
    canonical_origin: str,
    route: str,
    required_phrase: str | None,
    token: str,
    timeout: int,
) -> None:
    url = urljoin(base_url, route.lstrip("/")) if route != "/" else base_url
    body, headers, final_url = fetch_text(url, token, timeout)
    parser = SiteDocumentParser()
    parser.feed(body)

    expected_canonical = canonical_origin.rstrip("/") + route
    add_check(checks, f"{route} final transport", urlsplit(final_url).scheme in {"http", "https"}, final_url, url)
    add_check(checks, f"{route} main landmark", parser.has_main, "<main> present", url)
    add_check(checks, f"{route} shared header", parser.has_header, "authoritative header marker present", url)
    add_check(checks, f"{route} shared footer", parser.has_footer, "authoritative footer marker present", url)
    add_check(
        checks,
        f"{route} canonical",
        parser.canonical == expected_canonical,
        f"expected {expected_canonical}; found {parser.canonical}",
        url,
    )
    robots_header = headers.get("x-robots-tag", "")
    indexable = "noindex" not in robots_header.lower()
    add_check(
        checks,
        f"{route} indexability header",
        indexable,
        "no x-robots-tag header" if indexable and not robots_header else (
            robots_header if indexable else f"Unexpected noindex header: {robots_header}"
        ),
        url,
    )
    add_check(checks, f"{route} route helper", parser.site_guide_count == 1, f"count={parser.site_guide_count}", url)
    add_check(checks, f"{route} primary item count", parser.nav_li_count == 6, f"count={parser.nav_li_count}", url)
    add_check(checks, f"{route} obsolete dropdown", "Our Work" not in body, "no obsolete Our Work label", url)

    labels = [label for label, _, _ in parser.nav_links]
    paths = [normalized_path(expected_canonical, href) for _, href, _ in parser.nav_links]
    add_check(
        checks,
        f"{route} navigation labels",
        labels == [label for label, _ in EXPECTED_NAVIGATION],
        f"found {labels}",
        url,
    )
    add_check(
        checks,
        f"{route} navigation paths",
        paths == [path for _, path in EXPECTED_NAVIGATION],
        f"found {paths}",
        url,
    )
    contact_classes = [classes for label, _, classes in parser.nav_links if label == "Contact"]
    add_check(
        checks,
        f"{route} contact action",
        len(contact_classes) == 1 and "nav-cta" in contact_classes[0].split(),
        f"classes={contact_classes}",
        url,
    )
    if required_phrase:
        add_check(
            checks,
            f"{route} release signature",
            required_phrase in body,
            f"required phrase: {required_phrase}",
            url,
        )


def audit_once(base_url: str, canonical_origin: str, expected_sha: str, timeout: int) -> list[Check]:
    checks: list[Check] = []
    release_url = urljoin(base_url, "release.json")
    try:
        release_body, release_headers, final_url = fetch_text(release_url, expected_sha, timeout)
        release = json.loads(release_body)
        actual_sha = str(release.get("sourceCommit", ""))
        add_check(checks, "release manifest transport", urlsplit(final_url).scheme in {"http", "https"}, final_url, release_url)
        add_check(checks, "release manifest schema", release.get("schemaVersion") == 1, f"schemaVersion={release.get('schemaVersion')}", release_url)
        add_check(checks, "release manifest site", release.get("site") == "https://gurjas.org/", f"site={release.get('site')}", release_url)
        add_check(checks, "exact deployed commit", actual_sha == expected_sha, f"expected {expected_sha}; found {actual_sha}", release_url)
        cache_evidence = (
            "no-store" in release_headers.get("cache-control", "").lower()
            or bool(release_headers.get("etag"))
            or bool(release_headers.get("last-modified"))
        )
        add_check(
            checks,
            "release manifest cache evidence",
            cache_evidence,
            (
                f"cache-control={release_headers.get('cache-control', '')}; "
                f"etag={release_headers.get('etag', '')}; "
                f"last-modified={release_headers.get('last-modified', '')}"
            ),
            release_url,
        )
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        add_check(checks, "release manifest", False, f"{type(exc).__name__}: {exc}", release_url)

    for route, phrase in PRIORITY_ROUTES:
        try:
            audit_html_route(checks, base_url, canonical_origin, route, phrase, expected_sha, timeout)
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            url = urljoin(base_url, route.lstrip("/")) if route != "/" else base_url
            add_check(checks, f"{route} fetch", False, f"{type(exc).__name__}: {exc}", url)

    robots_url = urljoin(base_url, "robots.txt")
    try:
        robots, _, _ = fetch_text(robots_url, expected_sha, timeout)
        for line in ("User-agent: *", "Allow: /", "Sitemap: https://gurjas.org/sitemap.xml"):
            add_check(checks, f"robots {line}", line in robots, line, robots_url)
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        add_check(checks, "robots fetch", False, f"{type(exc).__name__}: {exc}", robots_url)

    sitemap_url = urljoin(base_url, "sitemap.xml")
    try:
        sitemap, _, _ = fetch_text(sitemap_url, expected_sha, timeout)
        add_check(checks, "sitemap format", "<urlset" in sitemap and "<lastmod>" in sitemap, "urlset and lastmod present", sitemap_url)
        for required in SITEMAP_ROUTES:
            add_check(checks, f"sitemap route {required}", required in sitemap, required, sitemap_url)
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        add_check(checks, "sitemap fetch", False, f"{type(exc).__name__}: {exc}", sitemap_url)

    return checks


def failed(checks: Iterable[Check]) -> list[Check]:
    return [check for check in checks if check.status == "failed"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="https://gurjas.org/", help="Deployed site root")
    parser.add_argument("--canonical-origin", default=PRODUCTION_ORIGIN, help="Expected canonical origin")
    parser.add_argument("--expected-sha", required=True, help="Exact 40-character source commit SHA")
    parser.add_argument("--report", type=Path, default=Path("production-audit.json"))
    parser.add_argument("--attempts", type=int, default=8)
    parser.add_argument("--delay", type=float, default=5.0)
    parser.add_argument("--timeout", type=int, default=30)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    expected_sha = args.expected_sha.strip().lower()
    if not re.fullmatch(r"[0-9a-f]{40}", expected_sha):
        print("--expected-sha must be a full 40-character hexadecimal commit SHA", file=sys.stderr)
        return 2
    if args.attempts < 1:
        print("--attempts must be at least 1", file=sys.stderr)
        return 2

    base_url = args.base_url.rstrip("/") + "/"
    canonical_origin = args.canonical_origin.rstrip("/")
    final_checks: list[Check] = []
    attempts_used = 0

    for attempt in range(1, args.attempts + 1):
        attempts_used = attempt
        final_checks = audit_once(base_url, canonical_origin, expected_sha, args.timeout)
        failures = failed(final_checks)
        if not failures:
            break
        if attempt < args.attempts:
            print(f"Production audit attempt {attempt} found {len(failures)} failure(s); retrying in {args.delay:g}s")
            time.sleep(args.delay)

    failures = failed(final_checks)
    actual_commit = "unknown"
    for check in final_checks:
        if check.name == "exact deployed commit":
            match = re.search(r"found ([0-9a-f]{40})", check.detail)
            if match:
                actual_commit = match.group(1)

    report = {
        "schemaVersion": 1,
        "auditedAt": datetime.now(timezone.utc).isoformat(),
        "baseUrl": base_url,
        "canonicalOrigin": canonical_origin,
        "expectedCommit": expected_sha,
        "actualCommit": actual_commit,
        "attemptsUsed": attempts_used,
        "status": "failed" if failures else "passed",
        "checks": [asdict(check) for check in final_checks],
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    if failures:
        print(f"Production audit failed with {len(failures)} issue(s):", file=sys.stderr)
        for check in failures:
            print(f"- {check.name}: {check.detail} ({check.url})", file=sys.stderr)
        return 1

    print(
        f"Production audit passed for {len(PRIORITY_ROUTES)} priority routes; "
        f"deployed commit {expected_sha} is exact."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
