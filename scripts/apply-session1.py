#!/usr/bin/env python3
"""Apply the approved Session 1 truth, privacy and integrity repair.

This migration is intentionally deterministic and idempotent. It is executed once
on the dedicated branch and then removes its own bootstrap files.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TODAY = "2026-07-14"


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        print(f"[skip] {label}: source text not found")
        return text
    return text.replace(old, new, 1)


ANALYTICS_RE = re.compile(
    r"\s*<!-- Analytics: lazy-loaded on first interaction or after 4s \(performance \+ privacy\) -->\s*"
    r"<script>\(function\(\)\{var L=false;.*?</script>\s*",
    re.DOTALL,
)
DRAFT_COMMENT_RE = re.compile(
    r"\s*<!--(?:(?!-->).)*(?:FIRST-HAND|VERIFY WITH DR\. SINGH|TODO BEFORE PUBLISH)(?:(?!-->).)*-->\s*",
    re.IGNORECASE | re.DOTALL,
)

# Remove non-consensual inline analytics from every page, update shared-script
# cache version, and remove known editorial comments globally.
for html_path in ROOT.rglob("*.html"):
    text = html_path.read_text(encoding="utf-8")
    updated = ANALYTICS_RE.sub(
        "\n<!-- Non-essential analytics load only after explicit consent through script.js. -->\n",
        text,
    )
    updated = updated.replace("script.js?v=10", "script.js?v=11")
    updated = DRAFT_COMMENT_RE.sub("\n", updated)
    if updated != text:
        html_path.write_text(updated, encoding="utf-8")

# Public tool-processing claims: distinguish local computation from submitted
# lookups to named public data services.
index_path = ROOT / "index.html"
text = index_path.read_text(encoding="utf-8")
text = text.replace(
    "Doctoral methodology, analysis and publication strategy — plus six free planning tools.",
    "Doctoral methodology, analysis and publication strategy — plus eight free research tools.",
)
text = text.replace(
    "Built on the methods we publish with — each runs entirely in your browser, so your data never leaves your device.",
    "Built on the methods we publish with. Five tools process inputs locally; three query named public research databases only after you submit a search.",
)
index_path.write_text(text, encoding="utf-8")

tools_path = ROOT / "tools/index.html"
text = tools_path.read_text(encoding="utf-8")
text = text.replace(
    "All computation runs in your browser — your data never leaves your device.",
    "Five tools process inputs in your browser. Journal Finder, Predatory Journal Checker and APC Checker send only the search term or ISSN to the named public databases when you press their action button; Gurjas does not receive those queries.",
)
tools_path.write_text(text, encoding="utf-8")

# Journal Finder: keyword-first, with explicit acknowledgement before an
# abstract-length query is sent to OpenAlex.
jf_path = ROOT / "tools/journal-finder/index.html"
text = jf_path.read_text(encoding="utf-8")
text = text.replace(
    "Paste your abstract, title or a few keywords. The finder queries the open OpenAlex database and shows you the journals that actually publish work like yours — ranked by how many matching papers they carry. Then verify any candidate for free before you submit.",
    "Start with a paper title or 5–10 keywords. When you press Find journals, the query is sent to the open OpenAlex database and the results are ranked by matching published papers. Abstract mode is optional and requires an explicit acknowledgement before any abstract text is transmitted.",
)
text = text.replace(
    '<h3 style="margin:0">Describe your paper</h3>\n       <textarea id="q" rows="4" placeholder="Paste your abstract, title, or 5–10 keywords (e.g. financial inclusion, digital payments, urban poverty, India)" style="width:100%;padding:.7rem;border:1px solid var(--line);border-radius:4px;font-size:1rem;font-family:inherit;resize:vertical"></textarea>',
    '<h3 style="margin:0">Start with a title or keywords</h3>\n       <label for="q" style="font-weight:600">Paper title or 5–10 keywords</label>\n       <textarea id="q" rows="4" placeholder="e.g. financial inclusion, digital payments, urban poverty, India" aria-describedby="query-privacy" style="width:100%;padding:.7rem;border:1px solid var(--line);border-radius:4px;font-size:1rem;font-family:inherit;resize:vertical"></textarea>\n       <p id="query-privacy" class="form-note" style="margin:0">Nothing is sent while you type. When you press <strong>Find journals</strong>, this text is sent directly from your browser to OpenAlex for the lookup; Gurjas does not receive or store it.</p>\n       <label style="display:flex;gap:.55rem;align-items:flex-start;font-size:.9rem;line-height:1.5"><input id="abstractConsent" type="checkbox" style="margin-top:.25rem"> <span>I am intentionally submitting an abstract (rather than a short title or keywords) and understand that up to 1,200 characters will be sent to OpenAlex.</span></label>',
)
text = text.replace(
    'var qEl=document.getElementById("q"),goEl=document.getElementById("go"),statusEl=document.getElementById("status"),outEl=document.getElementById("out"),rowsEl=document.getElementById("rows");',
    'var qEl=document.getElementById("q"),abstractConsent=document.getElementById("abstractConsent"),goEl=document.getElementById("go"),statusEl=document.getElementById("status"),outEl=document.getElementById("out"),rowsEl=document.getElementById("rows");',
)
text = text.replace(
    'if(q.length<3){statusEl.textContent="Please enter a few keywords or an abstract.";return;}\n   if(q.length>1200)q=q.slice(0,1200);',
    'if(q.length<3){statusEl.textContent="Please enter a paper title or a few keywords.";qEl.focus();return;}\n   if(q.length>240&&(!abstractConsent||!abstractConsent.checked)){statusEl.textContent="This looks like an abstract. Tick the acknowledgement before sending abstract text to OpenAlex.";if(abstractConsent)abstractConsent.focus();return;}\n   if(q.length>1200)q=q.slice(0,1200);',
)
jf_path.write_text(text, encoding="utf-8")

# Just-in-time disclosures for the other API-powered tools.
pj_path = ROOT / "tools/predatory-journal-checker/index.html"
text = pj_path.read_text(encoding="utf-8")
text = text.replace(
    '      <p id="status" style="margin:0;font-size:.9rem;color:var(--muted)"></p>',
    '      <p class="form-note" style="margin:0">When you press <strong>Search</strong>, the journal name or ISSN is sent from your browser to OpenAlex, Crossref and DOAJ; local reference files are also checked. Gurjas does not receive the query. Your Step 2 answers remain in your browser.</p>\n      <p id="status" style="margin:0;font-size:.9rem;color:var(--muted)" role="status" aria-live="polite"></p>',
    1,
)
text = text.replace(
    "Evidence score (0–100) — a probability-style estimate, not a verdict",
    "Evidence signal score (0–100) — a transparent heuristic, not a probability or verdict",
)
text = text.replace(
    "The score is a probability-style estimate computed from public database signals at the moment of search.",
    "The evidence signal score is a transparent, hand-weighted heuristic computed from public database signals at the moment of search.",
)
text = text.replace(
    "This tool reports verifiable signals and probability-style estimates;",
    "This tool reports verifiable signals and a documented heuristic evidence score;",
)
pj_path.write_text(text, encoding="utf-8")

apc_path = ROOT / "tools/apc-checker/index.html"
text = apc_path.read_text(encoding="utf-8")
text = text.replace(
    '      <p id="status" style="margin:0;font-size:.9rem;color:var(--muted)"></p>',
    '      <p class="form-note" style="margin:0">When you press <strong>Check</strong>, the journal name or ISSN is sent from your browser to OpenAlex and DOAJ. Gurjas does not receive or store the query.</p>\n      <p id="status" style="margin:0;font-size:.9rem;color:var(--muted)" role="status" aria-live="polite"></p>',
    1,
)
apc_path.write_text(text, encoding="utf-8")

# Contact form: restore native constraint validation. The shared script also
# validates before the AJAX request and returns focus to the first invalid field.
contact_path = ROOT / "contact/index.html"
text = contact_path.read_text(encoding="utf-8").replace(
    '<form id="gcContactForm" action="https://formsubmit.co/gurjasevidence@gmail.com" method="POST" novalidate>',
    '<form id="gcContactForm" action="https://formsubmit.co/gurjasevidence@gmail.com" method="POST">',
)
contact_path.write_text(text, encoding="utf-8")

# Privacy policy: name processors, distinguish local and API-powered tools,
# explain consent, and avoid unreviewed legal-compliance claims.
privacy_path = ROOT / "privacy/index.html"
text = privacy_path.read_text(encoding="utf-8")
text = text.replace(
    'Effective 2 July 2026 · Gurjas Evidence and Policy Analytics ("Gurjas", "we")',
    'Effective 14 July 2026 · Gurjas Evidence and Policy Analytics ("Gurjas", "we")',
)
collection_block = re.compile(
    r"    <h2>What this website collects</h2>.*?(?=\n    <h2>Correspondence</h2>)",
    re.DOTALL,
)
replacement = '''    <h2>What this website collects</h2>
    <p>The core website can be read without accepting analytics cookies. Our hosting provider, <strong>GitHub Pages</strong>, and our font provider, <strong>Google Fonts</strong>, may receive ordinary technical request data such as an IP address, browser details and the requested file under their own policies.</p>

    <h2>Analytics and cookie choices</h2>
    <p><strong>Google Analytics 4</strong> and <strong>Microsoft Clarity</strong> are non-essential analytics services. They are loaded only after you choose “Accept analytics” in the cookie notice. If you decline, those services are not loaded. You can reopen Cookie preferences from the site footer and change your choice. We use analytics to understand aggregate page use and interaction patterns; we do not run behavioural advertising or sell personal information.</p>

    <h2>Research-tool queries</h2>
    <p>Five tools perform their calculations locally in your browser. Three tools make a submitted lookup to external research-data services:</p>
    <ul>
      <li><strong>Journal Finder:</strong> sends the title, keywords or—only after explicit acknowledgement—up to 1,200 characters of an abstract to OpenAlex.</li>
      <li><strong>Predatory Journal Checker:</strong> sends the journal name or ISSN to OpenAlex, Crossref and DOAJ and also checks local reference files.</li>
      <li><strong>APC Checker:</strong> sends the journal name or ISSN to OpenAlex and DOAJ.</li>
    </ul>
    <p>These requests go directly from your browser to the named service when you press the relevant action button. Gurjas does not receive or store the search text. Each API-powered tool repeats this disclosure beside its input.</p>

    <h2>Service providers</h2>
    <p>Material website providers are GitHub Pages (hosting), Google Fonts (font delivery), Google Analytics 4 and Microsoft Clarity (consent-based analytics), FormSubmit (contact-form delivery), and OpenAlex, Crossref and DOAJ (submitted research-tool lookups). Their handling of request data is governed by their own terms and privacy policies.</p>
'''
text, count = collection_block.subn(replacement.rstrip(), text, count=1)
if count != 1:
    print("[warn] privacy collection block was not replaced")
text = text.replace(
    "If you email us, we receive your name, email address and the contents of your message. We use this information solely to respond and, where an engagement follows, to deliver it. We do not sell personal information, share it for marketing, or add you to mailing lists without your request.",
    "If you email us or submit the contact form, we receive the details and message you provide. The contact form is delivered through FormSubmit. We use this information to assess and respond to the enquiry and, where an engagement follows, to deliver it. We do not sell personal information, share it for unrelated marketing, or add you to a mailing list without a separate request.",
)
text = text.replace(
    "We handle personal data in the spirit of India's Digital Personal Data Protection Act, 2023 and comparable international norms.",
    "We respond to reasonable access, correction, deletion and contact-preference requests. This policy is an operational disclosure, not a claim that the website has been legally certified for every jurisdiction; professional review should be obtained for each intentionally served market.",
)
privacy_path.write_text(text, encoding="utf-8")

# Published editorial marker: rewrite the passage in neutral, verifiable language
# rather than approving an unverified first-person account.
article_path = ROOT / "insights/how-to-identify-a-predatory-journal/index.html"
text = article_path.read_text(encoding="utf-8")
text = text.replace("What I actually check", "A practical five-minute check")
passage_re = re.compile(
    r"\s*<h2 id=\"first-hand\">A practical five-minute check</h2>\s*"
    r"<p>When a colleague forwards me.*?</p>",
    re.DOTALL,
)
neutral_passage = '''
    <h2 id="first-hand">A practical five-minute check</h2>
    <p>A disciplined check can usually be completed in about five minutes and should not begin on the journal's own website. Open the Web of Science Master Journal List and Scopus directly, search the ISSN, and confirm that any claimed coverage is current rather than discontinued. Then compare the publisher address in the authoritative record with the website or email that approached you, and test two or three recent DOIs to confirm that they resolve to the same publisher. Finally, review the invitation for implausible speed, hidden fees, an incoherent scope or unverifiable metrics. This sequence is a practical screening method, not a guarantee: current status should be confirmed at the primary source on the day of submission.</p>'''
text, count = passage_re.subn(neutral_passage, text, count=1)
if count != 1:
    print("[warn] editorial passage was not rewritten")
text = text.replace('"dateModified":"2026-07-11"', '"dateModified":"2026-07-14"')
text = text.replace("· 11 July 2026 · 14 min read", "· Updated 14 July 2026 · 14 min read")
article_path.write_text(text, encoding="utf-8")

# One source of truth for assistant facts and future progressive migration.
site_facts = {
    "reviewed": TODAY,
    "brand": "Gurjas Evidence and Policy Analytics",
    "toolCount": 8,
    "metrics": {
        "journalArticles": 10,
        "bookChapters": 4,
        "googleScholarCitations": 202,
        "hIndex": 8,
        "i10Index": 8,
        "ssrnTopPercent": "3.2%",
        "snapshotDate": "2026-06",
    },
    "contact": {
        "email": "support@gurjas.org",
        "phoneDisplay": "+91 98772 95825",
        "phoneE164": "+919877295825",
        "responseSla": "usually within two working days",
    },
    "pricing": {
        "summary": "Indicative engagement ranges are published on the Services page; the exact fee is fixed in a written scope.",
        "url": "/services/",
    },
}
write("data/site-facts.json", json.dumps(site_facts, indent=2, ensure_ascii=False))

owner_review = f'''# Session 1 owner review

Reviewed: {TODAY}

## Editorial voice

The published “FIRST-HAND / VERIFY WITH DR. SINGH” marker was removed from the predatory-journal pillar guide. The adjacent passage was rewritten as a neutral, source-checkable five-minute method rather than treating the original first-person account as approved.

Dr. Jaskirat Singh should review the neutral passage. A first-person version should be restored only after he confirms that every described action and role accurately reflects his own experience.

## Operational checks outside code

- Test a real contact-form delivery, autoresponse, spam path and failure path.
- Confirm that the public response-time wording matches actual staffing capacity.
- Obtain privacy/legal review for India and each foreign market intentionally served.
- Inspect browser network activity for the three API-powered tools and for both analytics choices.
'''
write("reviews/session1-owner-review.md", owner_review)

# Shared script replacement: explicit analytics consent, truthful/data-driven
# assistant, accessible dialog behaviour and validated contact submission.
script_path = ROOT / "script.js"
script_text = script_path.read_text(encoding="utf-8")
marker = "/* ═══════════ Gurjas concierge + contact form (2026) ═══════════ */"
if marker not in script_text:
    raise SystemExit("shared script marker not found")
prefix = script_text.split(marker, 1)[0].rstrip()
new_block = r'''/* ═══════════ Privacy consent, guided assistant + contact form (2026) ═══════════ */
(function () {
  "use strict";

  var CONSENT_KEY = "gurjas.analyticsConsent.v1";
  var GA_ID = "G-P95TY2K8F3";
  var CLARITY_ID = "xl7zo5h687";
  var analyticsLoaded = false;

  function consentChoice() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function loadAnalytics() {
    if (analyticsLoaded || consentChoice() !== "granted") return;
    analyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });

    var google = document.createElement("script");
    google.async = true;
    google.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(google);

    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = true; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  function removeConsentPanel() {
    var existing = document.getElementById("gurjas-consent");
    if (existing) existing.remove();
  }

  function showConsentPanel(force) {
    if (!force && consentChoice()) return;
    removeConsentPanel();

    var panel = document.createElement("section");
    panel.id = "gurjas-consent";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "gurjas-consent-title");
    panel.style.cssText = "position:fixed;z-index:10000;left:clamp(12px,3vw,32px);right:clamp(12px,3vw,32px);bottom:clamp(12px,3vw,28px);max-width:760px;margin:auto;background:#fffdf8;color:#172033;border:1px solid #c8b16a;border-radius:8px;box-shadow:0 18px 60px rgba(4,18,38,.25);padding:18px 20px;font:14px/1.55 Archivo,system-ui,sans-serif";
    panel.innerHTML = '<h2 id="gurjas-consent-title" style="font:600 18px/1.25 Fraunces,Georgia,serif;margin:0 0 6px;color:#06264e">Your analytics choice</h2>'
      + '<p style="margin:0 0 14px">The site works without analytics. Google Analytics 4 and Microsoft Clarity load only if you accept. Tool lookups are disclosed beside each tool and are separate from this choice. <a href="/privacy/">Privacy details</a>.</p>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" data-consent="granted" style="border:1px solid #06264e;background:#06264e;color:#fff;border-radius:4px;padding:9px 14px;font-weight:600;cursor:pointer">Accept analytics</button>'
      + '<button type="button" data-consent="denied" style="border:1px solid #687285;background:#fff;color:#172033;border-radius:4px;padding:9px 14px;font-weight:600;cursor:pointer">Decline</button></div>';
    document.body.appendChild(panel);

    panel.addEventListener("click", function (event) {
      var button = event.target.closest("[data-consent]");
      if (!button) return;
      var value = button.getAttribute("data-consent");
      saveChoice(value);
      removeConsentPanel();
      if (value === "granted") loadAnalytics();
    });
    var first = panel.querySelector("button");
    if (force && first) first.focus();
  }

  function addPreferencesControl() {
    var base = document.querySelector(".foot-base");
    if (!base || document.getElementById("gurjas-cookie-preferences")) return;
    var button = document.createElement("button");
    button.id = "gurjas-cookie-preferences";
    button.type = "button";
    button.textContent = "Cookie preferences";
    button.style.cssText = "border:0;background:transparent;color:inherit;text-decoration:underline;font:inherit;padding:0;cursor:pointer";
    button.addEventListener("click", function () { showConsentPanel(true); });
    var p = document.createElement("p"); p.appendChild(button); base.appendChild(p);
  }

  window.GurjasPrivacy = {
    getAnalyticsChoice: consentChoice,
    openPreferences: function () { showConsentPanel(true); }
  };

  if (consentChoice() === "granted") loadAnalytics();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { showConsentPanel(false); addPreferencesControl(); });
  } else {
    showConsentPanel(false); addPreferencesControl();
  }
})();

(function () {
  "use strict";
  var WA = "https://wa.me/919877295825";
  var TEL = "tel:+919877295825";
  var FACTS = {
    toolCount: 8,
    metrics: { journalArticles: 10, bookChapters: 4, googleScholarCitations: 202 },
    contact: { responseSla: "usually within two working days" },
    pricing: { summary: "Indicative engagement ranges are published on the Services page; the exact fee is fixed in a written scope." }
  };

  fetch("/data/site-facts.json", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
    .then(function (data) { FACTS = data; })
    .catch(function () {});

  var fab = document.createElement("button");
  fab.className = "gc-fab"; fab.type = "button";
  fab.setAttribute("aria-label", "Open the Gurjas guided assistant");
  fab.setAttribute("aria-haspopup", "dialog");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = '<span class="dot"></span><span class="lbl">How can I help?</span>';
  document.body.appendChild(fab);

  var panel = document.createElement("div");
  panel.className = "gc-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "gcTitle");
  panel.hidden = true;
  panel.innerHTML = '<div class="gc-head"><div class="av">G</div><div><b id="gcTitle">Gurjas guided assistant</b>'
    + '<small>Site navigation, not live chat</small></div>'
    + '<button class="gc-x" type="button" aria-label="Close guided assistant">&times;</button></div>'
    + '<div class="gc-body" id="gcBody" aria-live="polite"></div>'
    + '<div class="gc-chips" id="gcChips"></div>'
    + '<form class="gc-foot" id="gcForm" autocomplete="off"><label class="sr-only" for="gcIn">Ask about services, tools or publications</label><input id="gcIn" type="text" '
    + 'placeholder="Ask about services, tools, publications…" aria-label="Ask about services, tools or publications">'
    + '<button class="gc-send" type="submit" aria-label="Send question">&#8593;</button></form>'
    + '<div class="gc-foot-note">Automated site guide · for a person, use email or WhatsApp</div>';
  document.body.appendChild(panel);

  var body = panel.querySelector("#gcBody");
  var chipWrap = panel.querySelector("#gcChips");
  var form = panel.querySelector("#gcForm");
  var input = panel.querySelector("#gcIn");
  var closeButton = panel.querySelector(".gc-x");
  var lastFocus = null;

  function bot(html) { var d = document.createElement("div"); d.className = "gc-msg gc-bot"; d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; }
  function user(text) { var d = document.createElement("div"); d.className = "gc-msg gc-user"; d.textContent = text; body.appendChild(d); body.scrollTop = body.scrollHeight; }
  function chips(list) {
    chipWrap.innerHTML = "";
    list.forEach(function (choice) {
      var b = document.createElement("button"); b.className = "gc-chip"; b.type = "button"; b.textContent = choice.t;
      b.addEventListener("click", function () { user(choice.t); choice.r(); });
      chipWrap.appendChild(b);
    });
  }

  var DEFAULT_CHIPS = [
    { t: "Explore services", r: function () { answer("services"); } },
    { t: "Free research tools", r: function () { answer("tools"); } },
    { t: "Check a journal", r: function () { answer("checker"); } },
    { t: "See publications", r: function () { answer("pubs"); } },
    { t: "Pricing guidance", r: function () { answer("price"); } },
    { t: "Contact a person", r: function () { answer("contact"); } }
  ];

  function knowledge() {
    var metrics = FACTS.metrics || {};
    var contact = FACTS.contact || {};
    var pricing = FACTS.pricing || {};
    return {
      services: { k: ["service", "consult", "advisory", "evaluation", "analytics", "naac", "iqac", "doctoral", "ngo", "csr", "help with"], a: 'Gurjas provides research consulting, policy evaluation, impact analytics, institutional (NAAC/IQAC) advisory, doctoral methodology support and NGO/CSR research. See the current scope and indicative ranges on <a href="/services/">Services</a>.' },
      tools: { k: ["tool", "calculator", "sample size", "reliability", "validity", "timeline", "grant", "sem", "free"], a: 'There are ' + (FACTS.toolCount || 8) + ' free tools. Five process inputs locally; Journal Finder, Predatory Journal Checker and APC Checker query named public databases only after you submit a search. Open the <a href="/tools/">Tools hub</a>.' },
      checker: { k: ["predatory", "journal", "checker", "legit", "scopus", "doaj", "fake journal", "verify journal"], a: 'The <a href="/tools/predatory-journal-checker/">Predatory Journal Risk Checker</a> reports evidence signals from public databases and local reference files. It does not maintain a blacklist or issue a definitive verdict.' },
      pubs: { k: ["publication", "paper", "research record", "citation", "scholar", "author", "jaskirat"], a: 'The published record currently lists ' + (metrics.journalArticles || 10) + ' journal articles and ' + (metrics.bookChapters || 4) + ' book chapters, with a snapshot of ' + (metrics.googleScholarCitations || 202) + ' Google Scholar citations. Verify the sources on <a href="/publications/">Publications</a>.' },
      methods: { k: ["method", "sem", "fsqca", "nca", "ardl", "garch", "econometric", "statistic", "analysis", "prisma"], a: 'Methods include SEM/PLS-SEM, fsQCA and NCA, ARDL and GARCH-family econometrics, and PRISMA-style synthesis. See <a href="/methods/">Methodology</a>.' },
      contact: { k: ["contact", "consult", "book", "call", "talk", "reach", "quote", "scope", "hire", "engage", "start"], a: 'Use the <a href="/contact/">structured contact form</a>, email <a href="mailto:support@gurjas.org">support@gurjas.org</a>, or WhatsApp <a href="' + WA + '" rel="noopener">+91 98772 95825</a>. The published response target is ' + (contact.responseSla || "usually within two working days") + '.' },
      whatsapp: { k: ["whatsapp", "wa", "message", "phone", "number", "mobile"], a: 'WhatsApp: <a href="' + WA + '" rel="noopener">+91 98772 95825</a>; telephone: <a href="' + TEL + '">the same number</a>. This assistant is automated and cannot confirm live availability.' },
      price: { k: ["price", "cost", "fee", "charge", "how much", "pricing", "budget"], a: (pricing.summary || "Indicative engagement ranges are published on the Services page; the exact fee is fixed in a written scope.") + ' See <a href="/services/">Services</a>.' },
      about: { k: ["about", "who", "gurjas", "company", "team", "people", "credible", "trust"], a: 'Gurjas Evidence &amp; Policy Analytics is an independent, women-led research practice. Its scholarly credentials are linked to external profiles, while business-delivery evidence is presented separately. See <a href="/about/">About</a> and <a href="/people/">People</a>.' }
    };
  }

  function answer(key) {
    var item = knowledge()[key];
    if (item) setTimeout(function () { bot(item.a); }, 180);
    setTimeout(function () { chips(DEFAULT_CHIPS); }, 200);
  }

  function route(text) {
    var q = text.toLowerCase(); var best = null; var score = 0; var K = knowledge();
    Object.keys(K).forEach(function (key) {
      var s = 0; K[key].k.forEach(function (word) { if (q.indexOf(word) > -1) s += 1; });
      if (s > score) { score = s; best = key; }
    });
    if (best && score > 0) answer(best);
    else setTimeout(function () { bot('I can route you to the right page. Choose a topic below, or contact a person through <a href="/contact/">the form</a> or <a href="' + WA + '" rel="noopener">WhatsApp</a>.'); chips(DEFAULT_CHIPS); }, 180);
  }

  var greeted = false;
  function greet() {
    if (greeted) return; greeted = true;
    bot("Hello. I’m an automated guide to Gurjas services, tools and published evidence—not a live person. What are you looking for?");
    chips(DEFAULT_CHIPS);
  }

  function focusable() {
    return Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function (el) { return !el.hidden; });
  }

  function open() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    panel.classList.add("open");
    fab.style.display = "none";
    fab.setAttribute("aria-expanded", "true");
    greet();
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    panel.classList.remove("open");
    panel.hidden = true;
    fab.style.display = "";
    fab.setAttribute("aria-expanded", "false");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    else fab.focus();
  }

  fab.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  document.addEventListener("keydown", function (event) {
    if (panel.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    var items = focusable(); if (!items.length) return;
    var first = items[0]; var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  form.addEventListener("submit", function (event) { event.preventDefault(); var value = input.value.trim(); if (!value) return; user(value); input.value = ""; route(value); });

  var cf = document.getElementById("gcContactForm");
  if (cf) {
    var status = cf.querySelector(".form-status");
    if (/[?&]sent=1/.test(location.search) && status) {
      status.className = "form-status ok";
      status.textContent = "Thank you — your message has been sent. We usually respond within two working days.";
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
    }

    cf.querySelectorAll("[required]").forEach(function (field) {
      field.addEventListener("invalid", function () { field.setAttribute("aria-invalid", "true"); });
      field.addEventListener("input", function () { if (field.checkValidity()) field.removeAttribute("aria-invalid"); });
      field.addEventListener("change", function () { if (field.checkValidity()) field.removeAttribute("aria-invalid"); });
    });

    cf.addEventListener("submit", function (event) {
      var honey = cf.querySelector('[name="_honey"]');
      if (honey && honey.value) { event.preventDefault(); return; }
      if (!cf.checkValidity()) {
        event.preventDefault();
        cf.reportValidity();
        var invalid = cf.querySelector(":invalid");
        if (invalid) invalid.focus();
        if (status) { status.className = "form-status error"; status.textContent = "Please complete the required fields before sending."; }
        return;
      }

      event.preventDefault();
      var button = cf.querySelector('button[type="submit"]');
      var data = new FormData(cf);
      var old = button.textContent;
      button.disabled = true; button.textContent = "Sending…";
      if (status) { status.className = "form-status"; status.textContent = "Sending securely…"; }

      fetch("https://formsubmit.co/ajax/gurjasevidence@gmail.com", {
        method: "POST", headers: { Accept: "application/json" }, body: data
      }).then(function (response) {
        if (!response.ok) throw new Error("Form service unavailable");
        return response.json();
      }).then(function (result) {
        if (!(result && (result.success === true || result.success === "true"))) throw new Error("Form service rejected request");
        if (status) { status.className = "form-status ok"; status.textContent = "Thank you — your message has been sent. We usually respond within two working days."; }
        cf.reset();
      }).catch(function () {
        if (status) {
          status.className = "form-status error";
          status.innerHTML = 'The form could not be delivered. Please email <a href="mailto:support@gurjas.org">support@gurjas.org</a> or try again shortly.';
        }
      }).finally(function () {
        button.disabled = false; button.textContent = old;
      });
    });
  }
})();'''
script_path.write_text(prefix + "\n\n" + new_block.strip() + "\n", encoding="utf-8")

# Dependency-free quality gate used by GitHub Actions.
quality_script = r'''#!/usr/bin/env python3
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
if "abstractConsent" not in finder or "sent directly from your browser to OpenAlex" not in finder:
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
'''
write("scripts/quality-check.py", quality_script)

# Remove one-off bootstrap files from the final branch diff. The running process
# and workflow remain valid after unlinking.
for bootstrap in ["scripts/apply-session1.py", ".github/workflows/apply-session1.yml"]:
    try:
        (ROOT / bootstrap).unlink()
    except FileNotFoundError:
        pass

print("Session 1 migration applied.")
