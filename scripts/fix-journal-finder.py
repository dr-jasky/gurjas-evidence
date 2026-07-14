#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "tools/journal-finder/index.html"
text = path.read_text(encoding="utf-8")

form_pattern = re.compile(
    r'<h3 style="margin:0">Describe your paper</h3>\s*'
    r'<textarea id="q".*?</textarea>',
    re.DOTALL,
)
form_replacement = '''<h3 style="margin:0">Start with a title or keywords</h3>
       <label for="q" style="font-weight:600">Paper title or 5–10 keywords</label>
       <textarea id="q" rows="4" placeholder="e.g. financial inclusion, digital payments, urban poverty, India" aria-describedby="query-privacy" style="width:100%;padding:.7rem;border:1px solid var(--line);border-radius:4px;font-size:1rem;font-family:inherit;resize:vertical"></textarea>
       <p id="query-privacy" class="form-note" style="margin:0">Nothing is sent while you type. When you press <strong>Find journals</strong>, this text is sent directly from your browser to OpenAlex for the lookup; Gurjas does not receive or store it.</p>
       <label style="display:flex;gap:.55rem;align-items:flex-start;font-size:.9rem;line-height:1.5"><input id="abstractConsent" type="checkbox" style="margin-top:.25rem"> <span>I am intentionally submitting an abstract (rather than a short title or keywords) and understand that up to 1,200 characters will be sent to OpenAlex.</span></label>'''
text, count = form_pattern.subn(form_replacement, text, count=1)
if count != 1:
    raise SystemExit("Journal Finder form block was not found")

text = text.replace(
    '<span id="status" style="font-size:.9rem;color:var(--muted)"></span>',
    '<span id="status" style="font-size:.9rem;color:var(--muted)" role="status" aria-live="polite"></span>',
)

validation_pattern = re.compile(
    r'if\(q\.length<3\)\{statusEl\.textContent="Please enter a few keywords or an abstract\.";return;\}\s*'
    r'if\(q\.length>1200\)q=q\.slice\(0,1200\);'
)
validation_replacement = '''if(q.length<3){statusEl.textContent="Please enter a paper title or a few keywords.";qEl.focus();return;}
   if(q.length>240&&(!abstractConsent||!abstractConsent.checked)){statusEl.textContent="This looks like an abstract. Tick the acknowledgement before sending abstract text to OpenAlex.";if(abstractConsent)abstractConsent.focus();return;}
   if(q.length>1200)q=q.slice(0,1200);'''
text, count = validation_pattern.subn(validation_replacement, text, count=1)
if count != 1:
    raise SystemExit("Journal Finder validation block was not found")

path.write_text(text, encoding="utf-8")

quality = ROOT / "scripts/quality-check.py"
qtext = quality.read_text(encoding="utf-8")
qtext = qtext.replace(
    'if "abstractConsent" not in finder or "sent directly from your browser to OpenAlex" not in finder:',
    'if \'id="abstractConsent"\' not in finder or "sent directly from your browser to OpenAlex" not in finder or "q.length>240" not in finder:',
)
quality.write_text(qtext, encoding="utf-8")

for bootstrap in ["scripts/fix-journal-finder.py", ".github/workflows/apply-session1-fix.yml"]:
    try:
        (ROOT / bootstrap).unlink()
    except FileNotFoundError:
        pass

print("Journal Finder privacy controls repaired.")
