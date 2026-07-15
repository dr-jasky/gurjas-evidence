#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
INDEXNOW_KEY = "127d4f6734fd4c5b8f7308201fd3d836"
EXCLUDED_TOP_LEVEL = {
    "_site",
    "node_modules",
    "tests",
}
html_files = sorted(
    path
    for path in ROOT.rglob("*.html")
    if path.relative_to(ROOT).parts[0] not in EXCLUDED_TOP_LEVEL
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
    if "gmail.com" in text.lower():
        errors.append(f"{rel}: public infrastructure must use the gurjas.org domain, not Gmail")
    if len(re.findall(r'<link\s+rel=["\']canonical["\']', text, re.I)) > 1:
        errors.append(f"{rel}: duplicate canonical link")
    for match in re.finditer(r'<script\s+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', text, re.I | re.S):
        try:
            json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            errors.append(f"{rel}: malformed JSON-LD: {exc}")

script = (ROOT / "script.js").read_text(encoding="utf-8")
if "gmail.com" in script.lower():
    errors.append("script.js: public infrastructure must use the gurjas.org domain, not Gmail")
if 'https://formsubmit.co/ajax/support@gurjas.org' not in script:
    errors.append("script.js: AJAX contact delivery must target support@gurjas.org")
for required in [
    "cf.checkValidity()",
    "cf.reportValidity()",
    'panel.hidden = true',
    'panel.setAttribute("role", "dialog")',
    'panel.setAttribute("aria-modal", "true")',
    'panel.setAttribute("role", "region")',
    'panel.setAttribute("aria-describedby", "gurjas-consent-desc")',
    "gurjas.analyticsConsent.v1",
    'document.querySelector("[data-site-guide]")',
    'base.querySelector("[data-cookie-preferences]")',
    'btn.textContent = open ? "Close" : "Menu"',
    'window.matchMedia("(min-width: 961px)")',
    'document.querySelectorAll("[data-fact]")',
]:
    if required not in script:
        errors.append(f"script.js: missing required integrity control: {required}")

style = (ROOT / "style.css").read_text(encoding="utf-8")
if "gcpulse" in style or ".gc-fab" in style:
    errors.append("style.css: the site guide must not use a pulsing floating launcher")
if ".gc-panel[hidden]{display:none}" not in style:
    errors.append("style.css: the hidden site-guide panel must be removed from display")
if "@keyframes home-sweep" in style or "animation:home-sweep" in style:
    errors.append("style.css: hero CTA sheen must be interaction-only, not continuously animated")

footer_template = (ROOT / "site/templates/footer.html").read_text(encoding="utf-8")
if footer_template.count("data-cookie-preferences") != 1 or footer_template.count('id="gurjas-cookie-preferences"') != 1:
    errors.append("footer template: cookie-preferences control must appear exactly once")

contact_page = (ROOT / "contact/index.html").read_text(encoding="utf-8")
if 'action="https://formsubmit.co/support@gurjas.org"' not in contact_page:
    errors.append("contact page: form delivery must target support@gurjas.org")
if "send it to support@gurjas.org" not in contact_page:
    errors.append("contact page: automated response must route follow-up material to support@gurjas.org")

header_template = (ROOT / "site/templates/header.html").read_text(encoding="utf-8")
for required in ['class="nav-btn" type="button"', 'aria-label="Open primary navigation"']:
    if required not in header_template:
        errors.append(f"header template: mobile navigation is missing state control: {required}")

consent_start = script.find("function showConsentPanel")
consent_end = script.find("function addPreferencesControl", consent_start)
if consent_start < 0 or consent_end < 0:
    errors.append("script.js: consent control functions are missing")
elif 'aria-modal' in script[consent_start:consent_end]:
    errors.append("script.js: consent notice must not claim modal behavior without a focus trap")

finder = (ROOT / "tools/journal-finder/index.html").read_text(encoding="utf-8")
if 'id="abstractConsent"' not in finder or "sent directly from your browser to OpenAlex" not in finder or "q.length>240" not in finder:
    errors.append("Journal Finder: abstract acknowledgement/disclosure missing")

try:
    facts = json.loads((ROOT / "data/site-facts.json").read_text(encoding="utf-8"))
    if facts.get("toolCount") != 8:
        errors.append("site-facts.json: toolCount must be 8")
    reviewed = date.fromisoformat(str(facts.get("reviewed", "")))
    age = (date.today() - reviewed).days
    if age < 0 or age > 100:
        errors.append(f"site-facts.json: evidence snapshot is {age} days old; review at least quarterly")
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
indexnow_workflow = (ROOT / ".github/workflows/indexnow.yml").read_text(encoding="utf-8")
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

indexnow_key_file = ROOT / f"{INDEXNOW_KEY}.txt"
if not indexnow_key_file.exists() or indexnow_key_file.read_text(encoding="utf-8").strip() != INDEXNOW_KEY:
    errors.append("IndexNow: ownership file is missing or does not contain the configured key")
for required in [
    'workflows: ["Deploy generated site to Pages"]',
    "github.event.workflow_run.conclusion == 'success'",
    "KEY_LOCATION",
    "SITEMAP_URL",
    'INDEXNOW_ENDPOINT="https://search.seznam.cz/indexnow"',
]:
    if required not in indexnow_workflow:
        errors.append(f"IndexNow workflow: missing deployment-order control: {required}")

doctoral_insight_route = "insights/phd-shortcut-longest-route/"
doctoral_insight = ROOT / doctoral_insight_route / "index.html"
if not doctoral_insight.exists():
    errors.append(f"{doctoral_insight_route}: approved doctoral recovery insight is missing")
else:
    doctoral_text = doctoral_insight.read_text(encoding="utf-8")
    for required in [
        "It is not a client case study",
        "does not identify any scholar, institution, supervisor or provider",
        "We do not fabricate data",
        "services/research-methods/",
        "tools/predatory-journal-checker/",
    ]:
        if required not in doctoral_text:
            errors.append(f"{doctoral_insight_route}: missing integrity or routing statement: {required}")
    if doctoral_insight_route not in (ROOT / "insights/index.html").read_text(encoding="utf-8"):
        errors.append(f"insights/index.html: missing route to {doctoral_insight_route}")
    if f"https://gurjas.org/{doctoral_insight_route}" not in sitemap:
        errors.append(f"sitemap.xml: missing {doctoral_insight_route}")

if errors:
    print("Quality checks failed:")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"Quality checks passed for {len(html_files)} HTML files and four priority offers.")
