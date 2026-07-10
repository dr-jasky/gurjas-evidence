#!/usr/bin/env python3
"""
Builds hijacked.json (full 455-entry version) from the official
Retraction Watch Hijacked Journal Checker export.
"""
import json
import re
import openpyxl

def split_issns(raw):
    if not raw:
        return []
    parts = re.split(r'[;,]', str(raw))
    out = []
    for p in parts:
        p = p.strip()
        if re.match(r'^\d{4}-?\d{3}[\dXx]$', p):
            p = p.upper()
            if '-' not in p:
                p = p[:4] + '-' + p[4:]
            out.append(p)
    return out

wb = openpyxl.load_workbook("data/raw/Copy_of_Retraction_Watch_Hijacked_Journals_Checker.xlsx", read_only=True, data_only=True)
ws = wb["Лист1"]

records = []
for row in ws.iter_rows(min_row=3, values_only=True):
    seq, title, h_url, h_issn, orig_title, o_issn, o_url = row[0], row[1], row[2], row[3], row[4], row[5], row[6]
    if not title:
        continue
    records.append({
        "hijackedTitle": str(title).strip(),
        "hijackedUrl": str(h_url).strip() if h_url else "",
        "hijackedIssn": split_issns(h_issn),
        "originalTitle": str(orig_title).strip() if orig_title else "",
        "originalIssn": split_issns(o_issn),
        "originalUrl": str(o_url).strip() if o_url else "",
    })

out = {
    "meta": {
        "source": "Retraction Watch Hijacked Journal Checker (Abalkina / Retraction Watch)",
        "sheet_last_updated": "2026-07-09",
        "fetched": "2026-07-11",
        "coverage": "FULL",
        "rows": len(records),
        "attribution_url": "https://retractionwatch.com/the-retraction-watch-hijacked-journal-checker/",
    },
    "data": records,
}

with open("out/hijacked.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

print(f"Wrote {len(records)} hijacked-journal records (full set) to out/hijacked.json")
