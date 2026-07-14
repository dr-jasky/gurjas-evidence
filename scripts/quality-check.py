#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
html_files = sorted(ROOT.rglob("*.html"))

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
    if "case study coming soon" in text.lower():
        errors.append(f"{rel}: unpublished placeholder must not be presented as proof")
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


def load_object(path: str) -> dict[str, Any]:
    value = json.loads((ROOT / path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("top-level value must be an object")
    return value


# Session 4 proof governance: empty collections are allowed, but anything marked
# for publication must be fully evidenced and permissioned.
try:
    case_data = load_object("site/data/case-studies.json")
    cases = case_data.get("cases", [])
    if not isinstance(cases, list):
        errors.append("case-studies.json: cases must be a list")
        cases = []
    for case in cases:
        if not isinstance(case, dict) or not case.get("publish"):
            continue
        slug = str(case.get("slug", "unknown"))
        for key in ["slug", "title", "origin", "identityMode", "clientType", "dateStart", "dateEnd", "context", "problem", "role", "baseline", "outcome", "outcomeTimeframe"]:
            if not str(case.get(key, "")).strip():
                errors.append(f"case-studies.json: published case {slug} missing {key}")
        if case.get("origin") not in case_data.get("allowedOrigins", []):
            errors.append(f"case-studies.json: published case {slug} has invalid origin")
        if case.get("identityMode") not in case_data.get("allowedIdentityModes", []):
            errors.append(f"case-studies.json: published case {slug} has invalid identityMode")
        for key in ["method", "deliverables", "limitations"]:
            if not isinstance(case.get(key), list) or not case.get(key):
                errors.append(f"case-studies.json: published case {slug} requires non-empty {key}")
        permission = case.get("permission", {})
        if not isinstance(permission, dict) or permission.get("status") != "approved":
            errors.append(f"case-studies.json: published case {slug} lacks approved permission")
        else:
            for key in ["permissionDate", "evidenceLocation", "approvedPublicWording"]:
                if not str(permission.get(key, "")).strip():
                    errors.append(f"case-studies.json: published case {slug} missing permission.{key}")
        if case.get("identityMode") == "named" and not str(case.get("clientName", "")).strip():
            errors.append(f"case-studies.json: named case {slug} missing clientName")
        if case.get("identityMode") == "anonymised" and not str(case.get("anonymisationRationale", "")).strip():
            errors.append(f"case-studies.json: anonymised case {slug} missing rationale")
except Exception as exc:
    errors.append(f"case-studies.json: invalid: {exc}")

try:
    testimonial_data = load_object("site/data/testimonials.json")
    testimonials = testimonial_data.get("testimonials", [])
    if not isinstance(testimonials, list):
        errors.append("testimonials.json: testimonials must be a list")
        testimonials = []
    for item in testimonials:
        if not isinstance(item, dict) or not item.get("publish"):
            continue
        item_id = str(item.get("id", "unknown"))
        for key in ["id", "caseSlug", "quote", "attributionLevel", "permissionDate", "evidenceLocation", "reviewOrExpiryDate"]:
            if not str(item.get(key, "")).strip():
                errors.append(f"testimonials.json: published testimonial {item_id} missing {key}")
        if item.get("attributionLevel") not in testimonial_data.get("allowedAttributionLevels", []):
            errors.append(f"testimonials.json: published testimonial {item_id} has invalid attributionLevel")
except Exception as exc:
    errors.append(f"testimonials.json: invalid: {exc}")

try:
    evidence_data = load_object("site/data/evidence-library.json")
    samples = evidence_data.get("samples", [])
    if not isinstance(samples, list):
        errors.append("evidence-library.json: samples must be a list")
        samples = []
    for sample in samples:
        if not isinstance(sample, dict) or not sample.get("publish"):
            continue
        sample_id = str(sample.get("id", "unknown"))
        for key in ["id", "slug", "title", "sampleType", "purpose", "sourceFile", "relatedOffer"]:
            if not str(sample.get(key, "")).strip():
                errors.append(f"evidence-library.json: published sample {sample_id} missing {key}")
        if sample.get("sampleType") not in evidence_data.get("allowedSampleTypes", []):
            errors.append(f"evidence-library.json: published sample {sample_id} has invalid sampleType")
        redaction = sample.get("redaction", {})
        permission = sample.get("permission", {})
        if not isinstance(redaction, dict) or redaction.get("reviewed") is not True or not str(redaction.get("reviewDate", "")).strip():
            errors.append(f"evidence-library.json: published sample {sample_id} lacks redaction review")
        if not isinstance(permission, dict) or permission.get("status") != "approved" or not str(permission.get("permissionDate", "")).strip() or not str(permission.get("evidenceLocation", "")).strip():
            errors.append(f"evidence-library.json: published sample {sample_id} lacks publication permission")
        if sample.get("sourceChecked") is not True:
            errors.append(f"evidence-library.json: published sample {sample_id} was not checked against its source")
except Exception as exc:
    errors.append(f"evidence-library.json: invalid: {exc}")

for required_template in ["site/templates/case-study-main.html", "site/templates/evidence-sample-main.html"]:
    if not (ROOT / required_template).exists():
        errors.append(f"missing proof template: {required_template}")

homepage = (ROOT / "index.html").read_text(encoding="utf-8")
services = (ROOT / "services/index.html").read_text(encoding="utf-8")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
pages_workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
site_data_text = (ROOT / "site/data/site.json").read_text(encoding="utf-8")
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

if "offers.css?v=" not in homepage or "offers.css?v=" not in services:
    errors.append("homepage/services: priority offer stylesheet must be loaded")

editorial = (ROOT / "editorial-policy/index.html").read_text(encoding="utf-8")
for required in ["Correction contact", "Last reviewed:", "Use of AI", "Conflicts", "source hierarchy"]:
    if required.lower() not in editorial.lower():
        errors.append(f"editorial policy missing required section: {required}")
if "https://gurjas.org/editorial-policy/" not in sitemap:
    errors.append("sitemap.xml: missing editorial policy")
if '"/editorial-policy/"' not in pages_workflow:
    errors.append("pages.yml: deployment smoke test missing /editorial-policy/")
if '"path": "editorial-policy/"' not in site_data_text:
    errors.append("site.json: footer must link the editorial policy")

if errors:
    print("Quality checks failed:")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"Quality checks passed for {len(html_files)} HTML files, four priority offers and governed proof data.")
