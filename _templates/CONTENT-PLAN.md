# Gurjas — Content & SEO Working Plan (internal, not published)

Source strategy: *The Gurjas Growth Blueprint* (Fable). This memo is the operating
version, adjusted to the real repo state. Kept in `_templates/` (Jekyll-ignored).

## Locked decisions
- **1a — Positioning:** Gurpreet Kaur stays as the *registered proprietor* in Organization
  schema (legal fact). **Dr. Jaskirat Singh is the public author/expert** on every article
  (byline + Person schema + ORCID/Scholar/WoS). Future: convert to Pvt Ltd when it grows.
- **2a — Foundation first:** schema audit, reusable template, disclaimers, sitemap.
- **3a — Expert voice:** agent drafts first-hand passages in Dr. Singh's voice from sourced
  facts, clearly marked `FIRST-HAND / VERIFY WITH DR. SINGH`; he edits before publish.
- **4a — Deep & publish-ready** per session (fewer pieces, each finished).

## Non-negotiable rules
1. Zero risk. Every claim traces to a credible/official source (UGC notices, Scopus/Elsevier,
   Clarivate/WoS, ABDC, DOAJ, Retraction Watch). Cite in the `.src` line.
2. **No journal names** in prose. Patterns over naming; point to third-party registers.
3. Responsible accuracy disclaimer wherever data is compiled/fetched.
4. Verify every date/count twice against the primary source.
5. Contact form + chatbot FormSubmit endpoints stay on the gmail address (delivery reliability);
   all *visible* contact = support@gurjas.org.

## Status
- [x] Visible email → support@gurjas.org (form endpoints kept on gmail); fixed 2 broken people/ links
- [x] Article schema — already present on all 3 insights articles
- [x] FAQPage schema — already present on /faq/
- [x] Reference-data disclaimer added to Predatory Journal Checker
- [x] Reusable article template (`_templates/article-template.html`)
- [x] Pillar 1 page live: insights/how-to-identify-a-predatory-journal/ (~2,950 wds, FAQ schema, wired to hub + checker + clusters).
- [x] Cluster: insights/cloned-hijacked-journals/ (~1,360 wds)
- [x] Cluster: insights/published-in-predatory-journal-what-to-do/ (~1,150 wds)
- [x] Cluster: insights/fake-impact-factors/ (~1,140 wds)
- [x] Cluster: insights/can-a-scopus-journal-be-predatory/ (~1,120 wds)
- [ ] Pillar 1 remaining clusters (12 red-flag emails; DOAJ/COPE/OASPA memberships; Beall's list 2026)
- [x] Pillar 2 page live: insights/ugc-care-discontinued/ (~1,930 wds, FAQ schema, wired to hub + Pillar 1 + verify cluster + checker).
- [x] Cluster: insights/ugc-suggestive-parameters-explained/ (~1,600 wds; 8 criteria plain-English; 35-vs-36 flagged honestly; UGC notice cited)
- [x] robots.txt: explicitly welcomes AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, CCBot, Applebot) for GEO
- [x] Predatory Journal Checker promoted to featured first card on /tools/ (card-feature CSS; style.css bumped v10->v11 site-wide)
- [ ] Pillar 2 clusters remaining (how to choose now; PhD requirement 2026; institutional policy; UGC-CARE-approved red flag; ONOS; frozen 1,474 list)

## Manual steps for Dr. Singh (cannot be done from code)
- Bing Webmaster Tools: verify gurjas.org (import from Google Search Console) + submit sitemap. Bing feeds ChatGPT web search — high GEO value.
- Google Search Console: submit/refresh sitemap after this push.
- Optional: IndexNow key file + ping for instant Bing indexing (needs a publish-time ping; revisit if we add GitHub Actions).
- [ ] Checker polish; Journal Finder by Scope; APC checker
- [ ] Pillar 3 + Pillar 4 + remaining clusters
- [ ] Hub-and-spoke internal linking; Insights hub grouping; final schema validation

## Existing articles (do not duplicate)
- `insights/verify-a-journal-2026/` — verifying a journal post-CARE (cluster; ~1,400 wds)
- `insights/naac-binary-mbgl-2026/` — NAAC binary/MBGL (cluster)
- `insights/digital-money-urban-slums/` — research piece

## Pillar & cluster map (titles are working; no journal names anywhere)
**Pillar 1 — Identifying a predatory or cloned journal (target: how to check if a journal is predatory)**
- cloned/hijacked journals: how the scam works, how to spot it
- fake impact factors (SJIF/GIF/ICV) vs. the real metric
- can a Scopus-indexed journal still be predatory?
- 12 red flags in a predatory invitation email
- DOAJ / COPE / OASPA: what each membership guarantees
- Beall's List in 2026: what it is, where it is, its limits
- what to do if you already published in a predatory journal

**Pillar 2 — UGC-CARE is discontinued: publishing in India in 2026 (target: UGC CARE list discontinued what now)**
- the 8 criteria / suggestive parameters, in plain English
- how to choose a journal now there is no CARE list
- do you still need to publish for a PhD in India in 2026?
- how your university sets its own journal policy now
- "UGC-CARE approved" claims are now a red flag
- One Nation One Subscription (ONOS): what scholars get
- the frozen 1,474-journal reference list: what it means

**Pillar 3 — Scopus publication guide (target: how to publish in a Scopus indexed journal)**
- verify a journal is really Scopus-indexed (step by step)
- the Scopus discontinued sources list: check before you submit
- Q1–Q4 quartiles and CiteScore, demystified
- Scopus vs Web of Science vs ABDC: which matters for you
- understanding APCs: what to pay and not pay
- from thesis chapter to journal article: the ethical workflow
- responding to peer review: a reviewing editor's guide (first-hand)

**Pillar 4 — NAAC 2025 reforms: binary & MBGL for IQAC teams (target: NAAC binary accreditation 2026)**
- binary vs MBGL levels; DVV process; DCF 2025 readiness;
  how research output feeds accreditation; documentation checklist
- NOTE: MBGL level thresholds still being finalised — write with that caveat.

## Key sourced facts (verify against primary source each time before publishing)
- UGC discontinued CARE list w.e.f. **11 Feb 2025**; Suggestive Parameters approved at the
  **595th UGC meeting, 24 June 2025**; notified **16 July 2025**. **8 criteria**; sub-parameter
  count reported as **35 (official Annexure-I) vs 36 (secondary)** — note the discrepancy, cite the notice.
- Frozen reference list of **1,474 journals** (as on 10 Feb 2025) — reference only, no endorsement.
- Retraction Watch Hijacked Journal Checker: **450+ entries** as of mid-2026.
- Beall's List taken offline **Jan 2017**.
- Data files in checker: Scopus source list (edition 2026-07, ~74,368 entries), ABDC (~4,599),
  hijacked register (~455).

## Session roadmap
1. (done) Foundation — schema/template/disclaimer/sitemap
2. Pillar 1 + 2–3 clusters, publish-ready, wired to checker
3. Pillar 2 + 2–3 clusters
4. Checker polish + Journal Finder + APC checker
5. Pillar 3 + clusters  [Pillar 3 page DONE: insights/scopus-publication-guide/ ~1,900 wds]
6. Pillar 4 + clusters
7. Internal-linking hub-and-spoke, Insights hub grouping, CTAs, schema validation pass

---

## WHAT'S LEFT PER FABLE (status as of 12 Jul 2026)

### DONE
- Tech foundation: Article/FAQ/Org/Person/Breadcrumb schema; robots.txt welcomes AI crawlers; sitemap maintained; canonical/OG already present.
- Email -> support@gurjas.org (form endpoints kept on gmail).
- Reusable article template + this content plan.
- Pillar 1 (predatory/cloned) + clusters: cloned-hijacked, fake-impact-factors, published-in-predatory, can-a-scopus, verify-a-journal.
- Pillar 2 (UGC-CARE) + cluster: ugc-suggestive-parameters-explained.
- Pillar 3 (Scopus publication guide).
- Checker featured #1 on /tools/ and homepage.
- Insights hub + homepage reorganised into pillar-grouped linkable sections.
- 11 insights articles live on main.

### LEFT — I can build in code
Content (Fable target ~28-30; at 11):
- Pillar 4: NAAC — promote existing naac article into a full pillar + clusters (binary vs MBGL, DVV process, DCF 2025 readiness, research output -> accreditation, documentation checklist).
- Pillar 1 clusters left: DOAJ/COPE/OASPA memberships; Beall's list in 2026; the 12 red-flag invitation-email cluster. (Cloned "case study" deferred — defamation caution.)
- Pillar 2 clusters left: how to choose a journal now; PhD publication requirement 2026; institutional journal policy; ONOS explained; the frozen 1,474 list (standalone).
- Pillar 3 clusters left: verify Scopus step-by-step; Scopus discontinued list; Q1-Q4 & CiteScore; Scopus vs WoS vs ABDC; APCs deep-dive; thesis -> article; responding to peer review.
Tools (Fable D): Journal Finder by Scope; APC "should I pay this?" checker; Predatory-Risk self-check scorecard.
Technical (Fable E): Service schema on /services/; optional Python build script + GitHub Action (auto sitemap/schema/link-check); programmatic "is [journal] Scopus-indexed" pilot (factual-only, legal caution, later).
Conversion (Fable H): "Free Journal Fit Audit" lead-magnet flow; pricing-page transparency; CTA consistency pass.
Measurement (Fable I): embed GA4 + Microsoft Clarity snippets (need IDs) + event tracking on tool completions/CTAs.

### DONE (12 Jul 2026, continued)
- IndexNow: key file at site root + GitHub Action (`.github/workflows/indexnow.yml`) pings api.indexnow.org with all sitemap URLs on every push to main. Fixes Bing "discovered but not crawled" delay.
- Service schema added to /services/ (6 Service entries, provider -> Organization, text matches visible service-line headings).
- Library outreach plan built: `_templates/LIBRARY-OUTREACH.md` — verified Tier 1 (has existing predatory-journals LibGuide) + Tier 2 (India, no guide, gap-fill pitch) targets, two ready-to-send pitch emails, contact-finding method, cadence. Only IIM Bangalore verified as an existing Indian LibGuide; other Indian targets are cold gap-fill outreach.
- AdSense: decided against — recommended against display ads (trust conflict + low yield vs. consulting funnel); no code change needed.
- Pricing transparency: /services/ now shows a "Typical engagement range" per service line (soft framing, not a price list; researched against real India market bands, positioned below full-service/ghostwriting competitors since Gurjas is advisory-only). Tiered where scope varies materially: Institutional Advisory (documentation-only vs. full SSR + peer-visit support, per Dr. Singh's confirmation he attends peer visits and can prepare the SSR), Doctoral Support (synopsis stage vs. pre-submission/thesis-level), NGO & CSR (small NGO vs. mid-sized CSR). FAQ's existing "indicative bands are published on our Services page" claim is now accurate.

### LEFT — only Dr. Singh can do (off-site / account-based)
- Edit the first-hand "what I actually check" passages in all articles (E-E-A-T).
- Google Search Console: verify + submit sitemap. Bing Webmaster: verify + submit (ChatGPT visibility).
- Create GA4 + Clarity accounts and give me the IDs to embed.
- Google Business Profile decision (service-area business) — only if genuine in-person/service-area contact.
- University-library / LibGuides backlink outreach; digital PR pitches; HARO/Qwoted; LinkedIn/ResearchGate repurposing; YouTube walkthroughs; Quora/Reddit/WhatsApp/Telegram distribution; Scam-Alert newsletter; Wikipedia citations.
- Paid ads: deferred per plan until organic authority exists.
