#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
html_files = sorted(ROOT.rglob("*.html"))

forbidden = ["FIRST-HAND", "VERIFY WITH DR. SINGH", "TODO BEFORE PUBLISH"]
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

if errors:
    print("Quality checks failed:")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"Quality checks passed for {len(html_files)} HTML files.")
