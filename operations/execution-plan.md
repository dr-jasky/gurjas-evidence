# Gurjas execution plan — remaining and new workstreams

Written 20 July 2026. This is the working backlog distilled from the July 2026
platform review. It is written so that any capable agent or developer can pick
up a workstream cold and execute it correctly. Read the two sections below
("How to work in this repo" and "Non-negotiable guardrails") before touching
anything.

Status legend: **READY** = fully specified, start any time. **BLOCKED-OWNER**
= requires data, a decision or an account only Dr. Jaskirat Singh can provide;
do the preparatory repo work only, then stop and ask.

Already shipped (do not redo): P0 tool-credibility corrections (#35), proof
ledger + tool contracts (#36), homepage/services compression (#37), Research
Readiness Triage (#38), Journal Finder v0.3-beta with sample matching papers,
Atom feed, llms.txt, mobile footer accordions, security-headers runbook,
research-page proof-surface cleanup, WS4 (`assets/tool-export.js`, wired into
Research Readiness Triage v1.1), WS5 (`tests/tools/journal-finder.spec.mjs`,
`pnpm test:tools`), WS2 (Reference & DOI Integrity Checker, tenth tool), WS3
(APC Invoice Triage, eleventh tool, with `tests/tools/reference-checker.spec.mjs`
covering WS2), WS9 (embeddable evidence-check badge on the Journal Evidence
Checker). The tool count is now 11 everywhere (`data/site-facts.json`,
`data/proof-ledger.json`, `data/tool-contracts.json`, `scripts/quality-check.py`
pins, `tools/index.html`, `evidence/index.html`) — keep it in sync when adding
a twelfth. WS0 is still blocked: PR #39 (`agent/accessibility-gate`) has not
merged to `main` as of this writing, so `tests/accessibility/audit.mjs` does
not exist on this branch yet; apply WS0's two fixes as a follow-up once it
merges and this branch is rebased onto it.

---

## How to work in this repo

- **Build:** `python scripts/build_site.py --clean` → outputs to `_site/`.
  Then `python scripts/check_build.py` and `python scripts/quality-check.py`.
  All three must pass before every commit. `node --check script.js` for JS.
- **Pages are static source HTML** in their own directories
  (`tools/<slug>/index.html`, etc.). The build replaces each page's header,
  footer and shared script tag with templates from `site/templates/` and data
  from `site/data/site.json`. Tool logic lives inline in each tool page.
- **Asset versioning:** if you change `script.js` or `style.css`, bump
  `assetVersion` in `site/data/site.json` by exactly +1. Do not bump otherwise.
- **JSON style:** `data/tool-contracts.json` and `data/proof-ledger.json` use
  2-space indentation with compact single-line arrays/objects. NEVER round-trip
  these files through `json.dumps` (it reformats everything); make targeted
  string edits and then validate with `python -c "import json;json.load(open(...))"`.
  Keep diffs minimal.
- **Quality gate pins:** `scripts/quality-check.py` asserts exact phrases
  (method versions, required disclosures) inside tool pages. When you bump a
  tool's method version, update the pin in the same commit. Never weaken a pin
  to make a check pass — that is the alarm working.
- **Sync points for any tool change** (all must move together in one commit):
  1. the tool page itself (visible "Method version X · reviewed DATE" line and
     the `SoftwareApplication` JSON-LD `softwareVersion`),
  2. its record in `data/tool-contracts.json` (`methodVersion`,
     `outboundRequests`, `outputs`, `notChecked`, `decisionBoundary`),
  3. the version chip on `evidence/index.html` (`vX · <processing>` card),
  4. the pinned phrase in `scripts/quality-check.py` if it references the tool.
- **New routes** must be added to `sitemap.xml` (with a real `lastmod`) and
  will be validated by `check_build.py`. New top-level public files must be
  added to `PUBLIC_ROOT_FILES` in `scripts/build_site.py`.
- **Visual changes:** CI compares pixel screenshots against the target branch.
  Any intentional visual change fails CI until a human reviews the uploaded
  artifact and applies the `visual-change-approved` label to the PR. Say in
  the PR body exactly which pages change visually and why. Never claim
  "no visual impact" if any rendered pixel changes — including color-only
  changes.
- **Branch/PR flow:** one workstream = one branch = one PR. Small PRs. The
  accessibility gate (PR #39) adds `pnpm test:a11y`; once merged, new
  interactive states you add need audit coverage in
  `tests/accessibility/audit.mjs` (see its `auditDynamicStates` function for
  the pattern).
- **Local browser testing:** Playwright is a devDependency. In the remote
  sandbox, launch with `executablePath: "/opt/pw-browsers/chromium"` if the
  pinned browser build is missing. Serve `_site` with
  `python -m http.server 8000` from inside `_site/`.
- **Footers in source pages are dead weight** (the build replaces them), but
  keep them present — `build_site.py` refuses pages without the legacy
  header/footer markers.

## Non-negotiable guardrails

These are brand-defining. Violating any of them is worse than shipping nothing.

1. **Never fabricate data**: no invented journal records, testimonials, case
   studies, metrics, dates, board activity or official statuses. If a value
   cannot be traced to a named source, the feature shows "not checked" or the
   work stops with a question to the owner.
2. **No composite scores or verdicts** on evidence tools. Outputs are
   source-labelled evidence, gap registers and explicit limitations. Words
   banned from tool outputs: "verdict", "legitimacy score", "probability",
   "guaranteed", "citation-ready", "defensible under reviewer scrutiny".
3. **Every tool states**: method version, review date, named sources, what is
   NOT checked, and the decision it refuses to make (the decision boundary).
4. **Outbound requests are disclosed** next to the control that triggers them,
   recorded in `data/tool-contracts.json`, and sent only after a user action.
   No API keys in client-side code, ever.
5. **No implied affiliation** with NAAC, UGC, Scopus, Crossref, DOAJ or any
   journal. Include a non-affiliation line wherever confusion is plausible.
6. **Absence of evidence is stated as exactly that** — never rendered as
   "safe", "unsafe", zero, or a low score.
7. **Do not build**: AI paper writers, paraphrasers, AI-detection scores,
   guaranteed journal matching, plagiarism checkers, fake chat assistants,
   publication-probability scores.
8. When a requirement conflicts with reality found in the repo, stop and
   report the conflict instead of forcing the requirement through.

---

## WS0 — PR #39 follow-ups (accessibility gate) — STILL BLOCKED (PR #39 not merged yet)

After PR #39 merges (it needs the `visual-change-approved` label because
`assets/accessibility.css` makes justified contrast-only color changes):

1. In `tests/accessibility/audit.mjs`, derive the axe version for the
   Markdown report from `package.json` instead of the hardcoded
   `"Axe core: 4.12.1"` string:
   `const axeVersion = createRequire(import.meta.url)("axe-core/package.json").version;`
2. Harden `dismissConsent`: replace the immediate `isVisible()` check with
   `await decline.waitFor({ state: "visible", timeout: 1500 }).catch(() => null)`
   then click if resolved — removes the race where the consent banner appears
   after the check and contaminates audits non-deterministically.
3. Acceptance: `pnpm test:a11y` passes locally against `_site`; report shows
   the real installed axe version.

## WS1 — UGC-CARE frozen-list lookup — BLOCKED-OWNER (data), then READY

**Why:** high, durable Indian search demand ("is X in UGC-CARE?") with no
clean answer anywhere since discontinuation. The site already owns this topic
editorially (`insights/ugc-care-discontinued/`).

**Owner must supply first:** a CSV snapshot of the final UGC-CARE list
(Group I/II as separate columns or files), with provenance: where it was
obtained, on what date, and a copy of the source document/archive URL. Do NOT
scrape or reconstruct the list from third-party sites — a wrong entry here is
a serious integrity failure. Stop and request the file if absent.

**Build (once data exists):**
- `tools/ugc-care-archive-lookup/index.html`, local-browser processing, data
  embedded as a JS constant or fetched from a same-origin JSON under
  `data/ugc-care-final-list.json` (add source file provenance fields:
  `snapshotDate`, `sourceDescription`, `sourceUrl`, `entries[]` with
  `title`, `issn`, `eissn`, `group`).
- Search by title substring and exact ISSN. Show matched entries with all
  recorded fields.
- Framing is the product. Permanent banner: "The UGC-CARE list was
  discontinued on 11 February 2025 and replaced by Suggestive Parameters.
  This is a historical snapshot as of [snapshotDate]. Presence here confers
  NO current status; any journal advertising 'UGC-CARE approved' today is
  misrepresenting itself." Link the insight article and the UGC public notice.
- Outputs for "not found": "Not present in this snapshot. That is not
  evidence the journal is illegitimate; the list was never exhaustive."
- Name it an **archive** lookup everywhere (page title, H1, nav). Never
  "UGC-CARE checker".
- Sync points per repo rules; add route to sitemap; add tool card to
  `tools/index.html` group 02 and a contract card to `evidence/index.html`;
  add a contract record to `data/tool-contracts.json`
  (`processing: "local-browser"`, `outboundRequests: []`).
- Decision boundary: "Does not establish any current UGC status, which no
  longer exists, and does not assess journal quality."

## WS2 — Reference & DOI Integrity Checker — SHIPPED (2026-07-20)

**What:** paste a reference list → per-reference DOI resolution and Crossref
metadata comparison, including retraction/correction signals. Client-side
only; queries go browser → Crossref after a button press.

**Page:** `tools/reference-integrity-checker/index.html`.

**Input handling:**
- Textarea; split into references on blank lines or single newlines (let the
  user choose via a radio: "one reference per line" / "blank-line separated").
- Cap at 50 references per run; state the cap.
- Extract DOIs with regex `10.\d{4,9}/[^\s"<>]+` (strip trailing
  punctuation `.,;)]`). Classify each reference: `has-doi` / `no-doi`.

**Lookups (Crossref REST, `https://api.crossref.org`):**
- For `has-doi`: `GET /works/{doi}` — compare returned `title`, first author
  family name, and `issued` year against tokens found in the reference text.
  Report per-field: `matches` / `differs` / `not comparable` (never a single
  pass/fail).
- Surface `update-to` entries on the work record — this is where Crossref
  exposes retractions/corrections (Retraction Watch integration). Display as
  "Post-publication updates recorded: [type, date, DOI link]" with severity
  styling for retractions. Absence of updates = "none recorded in Crossref",
  never "not retracted".
- For `no-doi`: single `GET /works?query.bibliographic=<ref>&rows=3` and show
  the top candidates as "possible matches to verify manually" — clearly
  labelled candidates, never auto-assigned.
- Append `mailto=support@gurjas.org` to every request (matches the existing
  OpenAlex pattern). Run lookups sequentially with a ~150 ms gap; show
  per-row progress. Handle 404 (DOI does not resolve in Crossref — say
  exactly that; Crossref is not the only registration agency, note DataCite
  DOIs may legitimately 404 here), 429 (back off, tell the user), network
  failure (retryable row-level state).

**Output table per reference:** input text (truncated), DOI link, resolution
state, title/author/year comparison, updates recorded, and a per-row "what to
do next" line. Export the full result as Markdown via the shared export
pattern (WS4). Include retrieval timestamp and method version.

**Not checked (state on page):** whether the citation is appropriate in
context, DataCite/mEDRA DOIs, page numbers, publisher-site availability.
**Decision boundary:** "Does not certify a reference list as correct or
complete; it reports registry evidence for manual verification."

**Fixtures:** add `tests/tools/reference-checker.spec.mjs` (Playwright,
`page.route` mocks for Crossref): a resolving DOI with matching metadata, a
DOI with a retraction `update-to`, a 404 DOI, a no-DOI reference with
candidates, and a 429. CI must not call the live API — follow the mock
pattern used during the Journal Finder v0.3 verification (route
`https://api.crossref.org/**`).

## WS3 — APC Invoice Triage — SHIPPED (2026-07-20)

**What:** the "I received an invoice — what should I check?" moment. A
structured local questionnaire that produces a discrepancy register, not a
judgement. Extends, does not replace, the Recorded APC Lookup.

**Page:** `tools/apc-invoice-triage/index.html`. Processing: local browser;
the only outbound request is an optional user-triggered Recorded-APC lookup
reusing the exact fetch pattern from `tools/apc-checker/index.html`.

**Inputs (form):** journal name; quoted amount + currency; invoice sender
email domain; payment method requested (card/bank/UPI/crypto/other); was the
paper accepted before the invoice (yes/no/unclear); time between submission
and invoice; does the payee name match the publisher; invoice URL domain vs
journal's official domain (two text fields, compare `hostname` case-insensitively).

**Output — a register, not a score.** For each answered item emit one of:
`CONSISTENT` / `DISCREPANCY` / `COMMON FRAUD PATTERN` / `NOT ANSWERED`, each
with one factual sentence (e.g., crypto or personal-account payment requests
are documented fraud patterns; an invoice before editorial acceptance is a
documented fraud pattern; a quoted amount far from the recorded APC is a
discrepancy to resolve with the publisher — link the Recorded APC Lookup
result if the user ran it). No count, no percentage, no traffic light for the
overall case. End with a fixed next-actions block: verify the domain
independently, contact the publisher via the address on the genuine site,
never pay to personal accounts, report suspected fraud to the institution.
**Decision boundary:** "Does not determine whether an invoice is genuine or
whether the user should pay."
Export via WS4. Sync points, sitemap, tools hub card (group 02),
evidence-page card, contract record.

## WS4 — Universal audit-record export — SHIPPED (2026-07-20)

**What:** every tool result becomes a downloadable, self-describing record —
the mechanism that makes outputs citable and shareable.

- Create `assets/tool-export.js` (loaded only by tool pages that use it, via
  their own `<script src="../../assets/tool-export.js?v=...">` — do NOT grow
  global `script.js`). Non-HTML asset files are copied by the build
  automatically.
- API: `GurjasExport.download({ toolId, toolName, methodVersion, inputs,
  results, limitations, decisionBoundary })` → generates Markdown and JSON
  files. Both must embed: tool URL, method version, ISO timestamp, the user's
  inputs, the outputs, the limitations text, and a SHA-256 hash of the
  canonical JSON payload (via `crypto.subtle.digest`) printed inside the
  Markdown as `Integrity hash (SHA-256 of the JSON record): …`. Trigger
  downloads with Blob + temporary anchor; no network.
- Wire into: Research Readiness Triage (replace/extend its existing export to
  use the shared module), Reliability & Convergent Validity, SEM Planning
  Bounds Explorer, Institutional Evidence Readiness, and all new tools.
  One PR for the module + one tool; follow-up PRs for the rest. Bump each
  converted tool's method version (patch level) and sync points.
- Acceptance: keyboard-only export works; JSON re-parses; hash verifiable by
  `python -c "import hashlib,json,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())"`
  against the canonical JSON file.

## WS5 — Journal Finder deterministic fixtures in CI — SHIPPED (2026-07-20)

The v0.3 repository-exclusion behaviour is verified only manually today.
- Add `tests/tools/journal-finder.spec.mjs` (Playwright + `page.route` on
  `https://api.openalex.org/**`), asserting: (a) sources with
  `type: "repository"` (fixture names: Zenodo, SSRN, arXiv, Research Square,
  OAPEN, Preprints.org) never render; (b) journals without any ISSN never
  render; (c) the sample-papers button renders three mocked works and toggles;
  (d) the API-failure state shows the graceful message; (e) the
  "none passed the checks" empty state renders.
- Add `"test:tools": "node --test tests/tools/"` or a Playwright invocation
  consistent with how `test:visual` is wired in `package.json`; call it from
  `.github/workflows/quality.yml` after the build step (serve `_site` the
  same way the visual step does). CI must never hit the live OpenAlex API.

## WS6 — Proof ledger as a citable dataset — BLOCKED-OWNER (Zenodo account)

Repo part (READY): add a `citation` block to `data/proof-ledger.json`
(`preferredCitation`, `license`, `versioningNote`) and a short "Cite this
ledger" section on `evidence/index.html`. Owner part: create a Zenodo deposit
of the two JSON files with a versioned DOI, then add the DOI to the evidence
page and the ledger itself. Do not mint or invent a DOI; leave a clearly
marked placeholder PR comment and stop.

## WS7 — Demonstration dossier — BLOCKED-OWNER (content decisions)

Structure work only: create `evidence/dossiers/` route scaffolding with ONE
dossier built strictly from the already-public Zenodo replication deposits in
the ledger (Global Findex 10.5281/zenodo.20932393 or AUCR
10.5281/zenodo.20860992). Sections: research question, methodology note, data
dictionary, assumptions log, traceability matrix (question → data → analysis
→ result → claim → limitation), issue register, reproducibility manifest,
limitations. Every factual cell must come from the deposit itself or the
published paper — anything else stays "[owner to supply]" and the page ships
only after the owner fills or removes those markers. Label prominently:
"Demonstration dossier based on a public replication deposit — not a client
engagement."

## WS8 — Quarterly research-integrity brief — BLOCKED-OWNER (editorial)

Repo part: `insights/` template with fixed sections (what changed this
quarter in UGC/NAAC/indexing policy; notable retraction data; tool usage
notes; primary-source links table with retrieval dates). Owner writes the
content. Do not auto-generate the brief's claims.

## WS9 — Embeddable evidence badge — SHIPPED (2026-07-20)

A small static SVG + copy-paste snippet on the Journal Evidence Checker page:
"Checked with the Gurjas Journal Evidence Checker · [date]" linking to the
tool. Hard rules: the badge must never state or imply a result ("verified",
"safe", "legitimate" are banned on the badge), only that the check was
performed. Provide the snippet as plain HTML (no third-party script). Add a
paragraph explaining permitted use.

## WS10 — Security headers — BLOCKED-OWNER (Cloudflare dashboard)

Fully specified in `operations/security-headers.md`. No repo code. Owner
executes Stage 1 immediately; later stages per the runbook. When CSP
report-only goes live, revisit inline tool scripts (the runbook explains the
sequencing).

## WS11 — Double-opt-in updates list — BLOCKED-OWNER (provider choice)

The current subscription flow is mailto-based. Owner must choose a provider
with double opt-in and a privacy posture worth naming (and update
`privacy/index.html` accordingly). Until then, do not add any form that posts
subscriber emails anywhere. Preparatory work allowed: none needed.

---

## Order of execution

WS4, WS5, WS2, WS3 and WS9 shipped 2026-07-20 (see "Already shipped" above).
Remaining order: 1. WS0 the moment PR #39 merges (minutes) → 2. WS6/WS7 repo
scaffolding once the owner is available, then hand back for content → 3. WS1
starts the moment the owner supplies the UGC-CARE snapshot file. WS8/WS10/WS11
are owner-driven; no repo prep is currently pending for them.

When a twelfth tool is added, remember every count that must move together:
`data/site-facts.json` `toolCount`, `data/proof-ledger.json`
`public-tool-inventory`, `data/tool-contracts.json` (schema-version + count
check in `scripts/quality-check.py`), the hardcoded `tool_routes` list in
`scripts/quality-check.py`, `tools/index.html` (H2 count, group `<span>`
counts, hero paragraph), and `evidence/index.html` (`toolCount` fact display
and the new tool's contract card).

---

## Addendum — 21 July 2026 forensic review

A second external review (dated 21 July 2026, scored the site 8.6/10) covered
production behaviour, not just the repository, and proposed six follow-on PRs
(41–46). Every factual claim in it was independently checked against the repo
before acting — two were wrong, most were right. Record both so a future
session doesn't re-litigate them.

**Claim found FALSE — do not "fix" this:** the review states script.js
"contains navigation, animation, tool and interaction enhancements but no
apparent GA4 or Clarity loader." This is incorrect. `script.js` around line
385 (`GA_ID`, `CLARITY_ID`, `loadAnalytics()`) loads both, gated behind
`consentChoice() === "granted"` — exactly matching the privacy policy's claim.
What genuinely does NOT exist is a custom event taxonomy beyond the base
pageview/config call (see WS12 below) — that part of the review's concern is
real even though the premise ("no loader") was not.

**Claim likely explained by deploy lag, not a repo bug:** "200+/202 versus
the current 204+ citation figure." `data/site-facts.json` and every page's
static fallback (`index.html` line ~109) already agree at 204 with no
internal drift. If production still shows an older number, that's because
production hasn't picked up recent merges yet, not a synchronisation bug in
the repo. Re-check after the next Pages deploy before treating this as an
action item.

**Claims confirmed true and already fixed in this pass** (small, zero-new-
facts wording corrections — no owner input needed, already shipped): the
"Assistive, never generative" heading on `services/index.html` contradicted
the FAQ's own description of AI-assisted code drafting/editing — reworded to
"Human-led, disclosed, never substitutive" and linked to the fuller
`governance/#ai` statement. "Correspondence is confidential" on
`contact/index.html` overstated the privacy policy's actual (accurate, more
qualified) disclosure of FormSubmit as a processor — reworded to "treated as
confidential under our published privacy controls." The contact-form
`_autoresponse` hidden field literally invited "datasets, drafts or
institutional guidelines" to be emailed to support@gurjas.org with no
qualification — reworded to explicitly withhold that invitation for
confidential datasets/participant-level records while keeping the
support@gurjas.org route for everything else (a new `quality-check.py` pin
guards against this regressing). "Site guide" renamed to "Find your route"
throughout `script.js` (button label, panel title, close-button aria-label,
footer note) — a pure text change; the `data-site-guide` attribute, panel
id (`#gurjas-site-guide`) and all other selectors used by
`tests/accessibility/audit.mjs` were deliberately left unchanged.

**Claim confirmed true, real but NOT fixed here — flagged for the owner:**
the founder's schema and prose are dramatically thinner than the Principal
Consultant's. `founder` in the Organization JSON-LD graph
(present on every page, e.g. `people/index.html` line 37) is a bare
`{"@type": "Person", "name": "Gurpreet Kaur"}` with no `@id`, `jobTitle`,
`description` or `sameAs`, while Dr. Jaskirat Singh gets a full Person node.
The visible prose on `people/index.html` gives the founder one sentence
("Founder of Gurjas Evidence and Policy Analytics, holding overall
ownership...") versus a multi-line credentialed profile for the Principal
Consultant. This is real and matters for the "women-led" claim's substance —
but fixing it requires real facts about Gurpreet Kaur's operational role,
governance responsibilities and any independently verifiable profile that
only the owner can supply. See WS15 below.

### WS12 — Analytics event taxonomy — READY, substantial scope

The loader exists and is correctly consent-gated (see above); what's missing
is intentional custom events beyond the automatic pageview. Add, gated behind
the same existing consent check, `gtag("event", ...)` calls for:
`service_view`, `service_cta_click`, `contact_form_start`,
`contact_form_submit`, `whatsapp_click`, `email_click`, `tool_start`,
`tool_complete`, `tool_export`, `proof_source_click`. Parameters: service
slug, tool slug, referring page only — never form text, pasted abstracts,
reference lists or calculated tool results (this is a hard guardrail, not a
suggestion; the existing tool pages already promise "Gurjas does not receive"
these inputs and an analytics event must not quietly break that promise).
Centralise the event-firing helper in `script.js` near `loadAnalytics()`
rather than scattering `gtag()` calls inline across every tool page. This
touches most pages in the site (every service, every tool, the contact form,
every proof-source link) — size it as its own PR, not a quick add-on.

### WS13 — Redacted sample deliverables — READY (generic templates, not client work)

The review's "Illustrative structure. No client information." framing makes
this buildable without owner facts: generic methodology-template structures
(Methods Design Decision Memo, Source-to-Claim Traceability Matrix, Impact
Evaluation Indicator Matrix, Research Integrity Risk Register, Reproducibility
and Analysis Audit Pack) that any research-methods consultancy would produce,
not derived from any real engagement. Each needs the explicit cover-page
disclaimer verbatim. Confirm scope/selection with the owner before writing
five of these — offer to build one first as a sample.

### WS14 — Engagement Evidence Library (`/work/`) — BLOCKED-OWNER (real case content)

Three anonymised case narratives (research design recovery, institutional
evidence-readiness diagnostic, impact-evaluation design) per the review's
structure. This cannot be drafted from imagination — an "anonymised" case
that isn't actually derived from real completed work is a fabricated
testimonial by another name, directly against guardrail #1. The owner must
supply the underlying facts (redacted) for each case; only then should this
be drafted. Do the page-scaffolding and template structure without content
if asked to prepare ahead of that input.

### WS15 — Founder profile and Person schema — BLOCKED-OWNER (real biographical facts)

Repo part (READY once facts exist): add `@id`, `jobTitle`, `description` and
`sameAs` to the founder's Person node in every page's JSON-LD graph (mirror
Dr. Jaskirat Singh's node structure exactly); expand the one-sentence prose
on `people/index.html`; link the homepage "women-led" proof item directly to
this section instead of the general About page. Owner part: real facts about
Gurpreet Kaur's operational authority, governance/confidentiality oversight,
client-engagement responsibilities, professional background and any
independently verifiable profile (LinkedIn, professional registration, etc.).
Do not infer or soften-fabricate any of this from the existing one sentence.

### WS16 — Secure contact intake — BLOCKED-OWNER (hosting/infra decision)

The dataset-emailing warning is already fixed (see addendum above). The
larger architecture change — replacing FormSubmit with a first-party endpoint
(Cloudflare Worker or equivalent), Turnstile, a submission reference number,
a dedicated no-index confirmation page, lead-source and budget-band fields —
requires the owner to choose and provision hosting/anti-abuse infrastructure
outside this repo's current GitHub Pages + FormSubmit model. Do not build a
partial version that silently changes where enquiry data goes without the
owner explicitly choosing the destination.

### WS17 — Search authority — BLOCKED-OWNER (account access) + READY (content, gated)

GSC/Bing verification, sitemap inspection, coverage review: needs the owner's
actual Search Console/Webmaster account access — cannot be done from this
repo. The four content clusters (research methods; NAAC/institutional
evidence; impact evaluation; research-integrity governance; 3–5 articles each
under Dr. Jaskirat Singh's byline) are technically writable without owner
facts, but publishing 8–12 substantive expert-voice articles under a named
real person's byline without confirming topic selection first is a scope and
tone decision the owner should make, not one to execute unprompted. Confirm
the topic list and byline/review process before drafting article one.

## Definition of done — every PR

- `python scripts/build_site.py --clean && python scripts/check_build.py &&
  python scripts/quality-check.py` pass; `node --check` on every touched JS
  file; `pnpm test:tools`, `pnpm test:a11y` and `pnpm test:visual` all pass
  (label applied for intentional visual changes, which the PR body
  enumerates). PR #39 merged 2026-07-20; `tests/accessibility/audit.mjs`
  exists on `main` — there is no more "once merged" caveat.
- New/changed tools: all four sync points updated in the same PR; new states
  covered in the a11y audit's dynamic states; fixtures added; no live
  third-party API calls in CI.
- No horizontal overflow at 390 / 768 / 1440 px on touched pages.
- PR body states: what changed, which claims/sources were touched, visual
  impact (precisely), and how it was verified. No model identifiers in
  commits, code or PR text.
