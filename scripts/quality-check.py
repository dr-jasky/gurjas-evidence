#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
html_files = sorted(
    path for path in ROOT.rglob("*.html")
    if "_site" not in path.relative_to(ROOT).parts
)

# Block actual drafting/verification markers, not legitimate section anchors such
# as id="first-hand". First-person passages are handled through owner sign-off.
forbidden = [
    "FIRST-HAND / VERIFY",
    "VERIFY WITH DR. SINGH",
    "TODO BEFORE PUBLISH",
]
privacy_regressions = [
    "each runs entirely in your browser, so your data never leaves your device",
    "All computation runs in your browser — your data never leaves your device",
]

for path in html_files:
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(ROOT)
    for phrase in forbidden:
        if phrase.lower() in text.lower():
            errors.append(f"{rel}: forbidden editorial marker: {phrase}")
    for phrase in privacy_regressions:
        if phrase in text:
            errors.append(f"{rel}: obsolete blanket privacy claim")
    if "googletagmanager.com/gtag/js" in text or "clarity.ms/tag/" in text:
        errors.append(f"{rel}: analytics must not load inline before consent")
    if " novalidate" in text:
        errors.append(f"{rel}: novalidate bypasses native form validation")
    if len(re.findall(r'<link\s+rel=["\']canonical["\']', text, re.I)) > 1:
        errors.append(f"{rel}: duplicate canonical link")
    for match in re.finditer(r'<script\s+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', text, re.I | re.S):
        try:
            json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            errors.append(f"{rel}: malformed JSON-LD: {exc}")

script = (ROOT / "script.js").read_text(encoding="utf-8")
for required in ["cf.checkValidity()", "cf.reportValidity()", 'panel.hidden = true', 'aria-modal', "gurjas.analyticsConsent.v1"]:
    if required not in script:
        errors.append(f"script.js: missing required integrity control: {required}")

finder = (ROOT / "tools/journal-finder/index.html").read_text(encoding="utf-8")
if 'id="abstractConsent"' not in finder or "sent directly from your browser to OpenAlex" not in finder or "q.length>240" not in finder:
    errors.append("Journal Finder: abstract acknowledgement/disclosure missing")

try:
    facts = json.loads((ROOT / "data/site-facts.json").read_text(encoding="utf-8"))
    if facts.get("toolCount") != 8:
        errors.append("site-facts.json: toolCount must be 8")
except Exception as exc:
    errors.append(f"site-facts.json: invalid: {exc}")

expected_offers = {
    "research-integrity",
    "naac-evidence-readiness",
    "impact-evaluation",
    "research-methods",
}
try:
    offer_data = json.loads((ROOT / "site/data/offers.json").read_text(encoding="utf-8"))
    offers = offer_data.get("offers", [])
    found_slugs = {offer.get("slug") for offer in offers if isinstance(offer, dict)}
    if len(offers) != 4 or found_slugs != expected_offers:
        errors.append(f"offers.json: expected exactly four approved offers, found {sorted(str(slug) for slug in found_slugs)}")
    for offer in offers:
        slug = str(offer.get("slug", "unknown"))
        for key in ["title", "metaDescription", "problem", "inaction", "cta", "subject"]:
            if not str(offer.get(key, "")).strip():
                errors.append(f"offers.json: {slug} missing {key}")
        entry = offer.get("entryOffer", {})
        for key in ["name", "scope", "timeline", "investment"]:
            if not isinstance(entry, dict) or not str(entry.get(key, "")).strip():
                errors.append(f"offers.json: {slug} missing entryOffer.{key}")
        for key in ["for", "notFor", "outcomes", "deliverables", "inputs", "method", "priceFactors", "exclusions", "proof", "faq"]:
            if not isinstance(offer.get(key), list) or not offer.get(key):
                errors.append(f"offers.json: {slug} requires non-empty {key}")
        serialized = json.dumps(offer, ensure_ascii=False).lower()
        for phrase in ["we guarantee", "guaranteed outcome", "100% success"]:
            if phrase in serialized:
                errors.append(f"offers.json: {slug} contains prohibited claim: {phrase}")
except Exception as exc:
    errors.append(f"offers.json: invalid: {exc}")

homepage = (ROOT / "index.html").read_text(encoding="utf-8")
services = (ROOT / "services/index.html").read_text(encoding="utf-8")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
pages_workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
for slug in sorted(expected_offers):
    route = f"services/{slug}/"
    if route not in homepage:
        errors.append(f"index.html: missing one-click route to {route}")
    if f'href="{slug}/"' not in services:
        errors.append(f"services/index.html: missing priority offer card for {slug}")
    if f"https://gurjas.org/{route}" not in sitemap:
        errors.append(f"sitemap.xml: missing priority offer {route}")
    if f'"/{route}"' not in pages_workflow:
        errors.append(f"pages.yml: deployment smoke test missing /{route}")

if "offers.css" in homepage or "offers.css" in services:
    errors.append("homepage/services: use the shared visual system; do not load a detached offer stylesheet")
if (ROOT / "offers.css").exists():
    errors.append("offers.css: detached offer visual systems are prohibited")
if homepage.count('id="h-caps"') != 1:
    errors.append("index.html: commercial pathway section must appear exactly once")
if not (ROOT / "reviews/session3-visual-contract.md").exists():
    errors.append("session3: visual contract is missing")

if errors:
    print("Quality checks failed:")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"Quality checks passed for {len(html_files)} HTML files and four priority offers.")
