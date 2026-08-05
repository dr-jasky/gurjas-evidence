#!/usr/bin/env python3
"""Submit canonical Gurjas sitemap URLs to IndexNow after production deploys.

The script uses only the Python standard library, validates that every submitted
URL belongs to gurjas.org, verifies the deployed ownership key, and exits
non-zero when the endpoint does not accept the request. It is intentionally run
against the live sitemap so search engines are notified only after the
corresponding production pages are available.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

HOST = "gurjas.org"
DEFAULT_SITEMAP = "https://gurjas.org/sitemap.xml"
# This IndexNow participant accepts the deployed ownership key and shares
# accepted notifications with the IndexNow network. The generic endpoint has
# returned UserForbiddedToAccessSite for this otherwise valid deployment.
DEFAULT_ENDPOINT = "https://search.seznam.cz/indexnow"
DEFAULT_KEY = "127d4f6734fd4c5b8f7308201fd3d836"
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def fetch_bytes(url: str, attempts: int = 5, delay_seconds: float = 4.0) -> bytes:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "GurjasSearchDiscovery/1.0 (+https://gurjas.org/)"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status != 200:
                    raise RuntimeError(f"GET {url} returned HTTP {response.status}")
                return response.read()
        except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            last_error = exc
            if attempt < attempts:
                time.sleep(delay_seconds * attempt)
    raise RuntimeError(f"Unable to fetch {url}: {last_error}")


def verify_key(key: str) -> str:
    key_location = f"https://{HOST}/{key}.txt"
    deployed = fetch_bytes(key_location, attempts=8, delay_seconds=5.0).decode(
        "utf-8", errors="strict"
    ).strip()
    if deployed != key:
        raise ValueError(
            f"IndexNow ownership key mismatch at {key_location}: "
            "refusing to submit URLs"
        )
    return key_location


def sitemap_urls(xml_bytes: bytes) -> list[str]:
    root = ET.fromstring(xml_bytes)
    urls: list[str] = []
    for location in root.findall("sm:url/sm:loc", SITEMAP_NS):
        value = (location.text or "").strip()
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.netloc != HOST:
            raise ValueError(f"Refusing non-canonical sitemap URL: {value}")
        if parsed.query or parsed.fragment:
            raise ValueError(f"Refusing URL with query or fragment: {value}")
        urls.append(value)
    if not urls:
        raise ValueError("The live sitemap contained no canonical URLs")
    return sorted(set(urls))


def submit(endpoint: str, key: str, key_location: str, urls: list[str]) -> int:
    payload = json.dumps(
        {
            "host": HOST,
            "key": key,
            "keyLocation": key_location,
            "urlList": urls,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "GurjasSearchDiscovery/1.0 (+https://gurjas.org/)",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status = response.status
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"IndexNow rejected the submission: HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"IndexNow submission failed: {exc}") from exc

    if status not in {200, 202}:
        raise RuntimeError(f"Unexpected IndexNow response: HTTP {status}")
    return status


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sitemap", default=DEFAULT_SITEMAP)
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    parser.add_argument("--key", default=DEFAULT_KEY)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    key_location = verify_key(args.key)
    print(f"Verified IndexNow ownership key at {key_location}")
    urls = sitemap_urls(fetch_bytes(args.sitemap))
    print(f"Validated {len(urls)} canonical URLs from {args.sitemap}")
    if args.dry_run:
        for url in urls:
            print(url)
        return 0

    status = submit(args.endpoint, args.key, key_location, urls)
    print(f"IndexNow accepted {len(urls)} URLs with HTTP {status}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError, UnicodeDecodeError, ET.ParseError) as exc:
        print(f"search-discovery error: {exc}", file=sys.stderr)
        raise SystemExit(1)
