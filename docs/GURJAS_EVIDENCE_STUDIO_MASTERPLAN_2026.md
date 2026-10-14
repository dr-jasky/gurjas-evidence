# Gurjas Evidence Studio — world-class product and design masterplan

**Design review:** 15 October 2026 · **Status:** strategic blueprint and phased implementation contract · **Primary owner:** Gurjas Evidence and Policy Analytics  
**Repository:** https://github.com/dr-jasky/gurjas-evidence · **Redesign draft:** PR #126 · **Source-freshness remediation:** PR #127  
**Positioning:** *Where consequential research decisions become traceable evidence.*

## 1. The challenge

Gurjas already has functioning research tools, public-beta workflows, a governed Research Library, documented research outputs, people with verifiable academic records, and a Proof Ledger. Those are legitimate sources of differentiation. Its former homepage was nevertheless organised like generic agency/SaaS marketing: a generic promise, a large search that merely filtered eleven named tools, a wall of capability cards, proof counters and audience cards.

**Thesis:** the brand should be recognised through a repeated *inspectable research interaction*, not by a fashionable gradient or another AI-generated illustration.

The goal is ambitious positioning, not a financial valuation, revenue or traffic claim.

## 2. Exemplar reverse engineering: principles, never copied IP

| Benchmark | Best element of the experience | Gurjas translation | Trap to avoid |
| --- | --- | --- | --- |
| [Linear](https://linear.app/) | Real product shown prominently, navigational discipline, polished micro-interaction | Show genuine decision workflows in the first viewport, consistent keyboard states and purposeful fast UI | Product theatre that is not functional |
| [Stripe](https://stripe.com/) | Explains complex infrastructure with UI examples and precise hierarchy | Explain scholarly work through evidence-to-output examples, not promises | Aggressive sales-page aesthetics or fake dashboards |
| [Our World in Data](https://ourworldindata.org/homepage-redesign) | Source-forward diagrams, research-led story, searchable and reusable data | Named data sources, dates, caveats, exports, reproducible outputs and browsable topic routes | Unlicensed reuse of Grapher code or third-party data |
| [Elicit](https://support.elicit.com/en/articles/14757543-getting-started-with-elicit-which-workflow-should-i-use) | Differentiated workflows for agent, report and systematic review | Separate scholarly investigation, journal integrity, research readiness and institutional decisions | Generic chatbot used as a substitute for structured review |
| [Scite](https://scite.ai/features) | Context around citations and verifiable evidence | Expand DOI/reference integrity to claim-level source trails where legally and technically supported | Claiming to infer support/contradiction from citations without licensed full text and validated models |
| [ResearchRabbit](https://www.researchrabbit.ai/) | Explore connections in scholarly literature | Build an optional OpenAlex-informed network explorer, with links, metadata limits, zero invented edges | Distracting 3D network with no useful navigation |
| [Nielsen Norman Group](https://www.nngroup.com/articles/homepage-design-principles/) | Show concrete examples and clear next actions | First viewport contains a real task and task-specific destination; validate with external participant testing | Measure only aesthetics instead of task success |

None of these companies has licensed Gurjas to copy its proprietary code, datasets, UI or trademark assets. Implement original features under appropriate licences and API terms.

## 3. Signature brand system

**Voice:** measured, investigative, editorial, human. Specific nouns, evidenced verbs, short research-focused copy. Never “revolutionise research with AI”, “guaranteed publication”, “verified by AI” or fabricated case studies.

**Visual system:** one dark ink foundation, warm institutional paper, restrained brass, pale blue-grey, Fraunces-led editorial headlines and Archivo functional labels. A fine rules/annotations motif represents research traceability rather than stock particles or generic floating gradients. Design should look like a refined research atlas crossed with a professional workbench. Aim for selective signature SVG diagrams, no auto-playing 3D for decoration.

**Interaction grammar:** question → evidence source → method/assumptions → observable output → uncertainty/boundary → export/next action. Every major tool should share these stages where appropriate. Keep dates visible, not behind “more”.

**Accessibility/performance constraints:** semantic links/buttons, keyboard and screen-reader support, reduced motion, 320 px reflow, no horizontal overflow, functional no-JavaScript fallbacks, useful alt text, lazy media, font discipline, predictable focus, no fabricated loading indicators.

## 4. Information architecture (target)

### Public discovery
- **Evidence Desk** — the homepage. Immediate journal, design and institutional pathways with actual links. The current PR implements its first version.
- **Research Library** — browsable, human-reviewed and dated explanations by problem, discipline, method and evidence status.
- **Research instruments** — catalogue with task search, dependencies, limitations, version/date and reproducible example outputs.
- **Evidence Atlas** — linked view of research questions, decisions, sources, codebooks, DOI deposits, supporting methods and caveats. First release can be a static authored graph, later searchable.
- **Expert practice** — clear scopes and examples for independent scholars, institutions and NGOs; no ghostwriting, false authorship, accreditation or journal guarantees.

### Future workspaces (only when infrastructure is ready)
- **Literature Navigator:** OpenAlex metadata search and DOI source trails. Do not label text as verified from abstracts alone; link primary records and show source limitations.
- **Method Protocol Builder:** locally create a defensible methods memo with decisions, alternatives, assumptions, exclusions and next steps; Markdown/JSON export.
- **Citation Check Lab:** link existing DOI tool, retraction/correction signals where officially exposed, unresolved references and reviewer checklist; avoid invented inference.
- **Institution Evidence Room:** local-first mapping of statements to files and custodians, gap status, exportable traceability table. Secure server storage only after privacy/security review.
- **Research Grant Register:** date-stamped primary-source announcement pointers, expiration checks and conditional official-link validation; no speculative open badges.
- **Research Services Clinic:** diagnostic request with bounded scope, accessibility and transparent privacy. Never collect sensitive raw datasets in a form.

## 5. Example complete journeys

### Scholar approaching submission
1. Home asks “Is the target journal what it claims to be?”
2. User opens actual Journal Evidence Checker and enters journal/ISSN.
3. Tool distinguishes **registry evidence, website signals, unknowns and historical snapshots**; no binary legitimacy verdict.
4. Export journal-decision log, link evidence guidance, and only then show an option for specialist review.
5. Measure completed check and export, not just click to “Tools”.

### Doctoral methods repair
1. User starts Research Readiness Triage.
2. Classifies design, measurement, sampling and evidence-control gaps.
3. Gets a transparent gap register with assumptions and missing next controls.
4. Can continue into relevant method guide, SEM planning explorer and methods advisory.
5. Avoid the claim that a heuristic score is statistical validation.

### University evidence team
1. User selects an accreditation or integrity question.
2. Evidence Pathway Navigator maps claim → responsible custodian → source → dated verification → gap.
3. Generates a local-only traceability pack with missing-data flags.
4. Team can request a scoped diagnostic, with clear data-handling agreements.

### NGO/CSR evaluator
1. Choose an evaluation question and timeframe.
2. Select likely evidence forms and design families.
3. Display explicit attribution/selection limitations.
4. Export an indicator matrix, not a promise of impact.

## 6. Differentiation and sustainable growth

**Brand moat:** source-to-claim provenance, evidence limitations, practical tools and actual applied research methodology; not model branding or an enormous fabricated database.

**Distribution:** useful free tools, substantively revised source-linked research guides, reusable ethically licensed diagrams, indexed canonical pages, internal topic-to-tool-to-service links, seasonal research calendars and practitioner-facing explainers. Periodic user testing with scholars, IQAC leaders and NGO evaluators determines priority.

**Revenue hypotheses (not confirmed offers):** scoped methodology diagnostics, journal integrity advisory, research QA reviews, institutional evidence audits, evaluation design, technical training and retained research support. Public pricing only after verified cost and service policy; no guarantee-of-outcome products.

**Metrics (privacy-safe and consented):**
- task launch and successful completion separated;
- source-panel open and evidence trail inspected;
- meaningful exported output;
- returning sessions among consenting visitors;
- Library → tool → service handoff;
- successfully delivered qualified enquiries;
- performance, error rates, accessibility regressions and perceived comprehension.
Never capture research prompts, uploads or personally identifying free text in analytics.

## 7. Delivery programme: six independent stages

| Stage | Milestone | Scope | Exit gate |
| --- | --- | --- | --- |
| 0 — Trust | repair stale claims & CI | funder dates, aged source facts, tests, provenance | factual review logged; build passes |
| 1 — Identity | distinctive first viewport | Evidence Studio editorial hero, real tasks, responsive visual system | 320–1440 px, keyboard, no JS, screenshots and owner approval |
| 2 — Utility | enhance tools & Library | standard tool output panel, sample, provenance, export; content linking | 3 completed useful end-to-end journeys |
| 3 — Workbench | real protocols | decision-record builder, reference/evidence checklist, local exports | deterministic test fixtures, validated assumptions |
| 4 — Institutional | scoped evidence room | custodian/evidence mapping, secure optional persistence | privacy/legal/security review and pilot |
| 5 — Growth | defensible discovery | topic hubs, distribution experiments, structured data, content refresh | credible engagement and enquiry improvements, not vanity clicks |

## 8. Engineering: retain working infrastructure first

The site is currently generated by Python into GitHub Pages. Do not add a Next.js/React/3D framework just to make a static homepage appear current. Preserve `scripts/build_site.py`, shared templates, contracts and canonical paths while users evaluate the first stage.

For interactive workflows, use modular local JS. When real authenticated workspaces, AI document processing or protected persistence become necessary, introduce serverless endpoints behind a documented API contract with origin validation, rate limits, access control, encrypted storage, explicit data retention and deletion. No secret API keys in client-side JavaScript. Label experimental predictions and models.

Data contracts to version: `tool`, `source`, `sourceRetrievedAt`, `methodVersion`, `inputScope`, `assumptions`, `limits`, `outputs`, `lastReviewedAt`, `nextReviewDueAt`. Do not display “Live”, “Verified” or “Current” unless the actual data supports that label. Build fails on expired source reviews and invalid tool records.

## 9. Design and evidence acceptance review

Review before any public merge:
1. Can a first-time researcher understand what Gurjas uniquely does within five seconds?
2. Is there at least one genuinely useful, reproducible interaction on the first path?
3. Does every important factual or quantitative assertion link to a traceable source?
4. Are tool limitations and currentness visible where a decision may be affected?
5. Is the interface equally clear at 320, 390, 768, 1024 and 1440 px?
6. Does screen-reader/keyboard access work without guessing?
7. Are no-JS and unsupported-browser states readable?
8. Does the page use the *single* authoritative stylesheet rather than an expanding tower of contradictory overrides?
9. Were screenshots compared before a visual approval label was applied?
10. Are SEO, security, form-delivery, analytics-consent and page-speed checks still effective?
11. Would a visitor encounter any unsubstantiated testimonials, affiliations, author metrics or AI evaluation claims?
12. Could the first page have been generated by replacing the logo on a generic AI SaaS template? If yes, reject the design.

## 10. Release decisions

- PR #126 introduces the Evidence Studio first screen and original workbench. No production merge before explicit owner visual approval.
- PR #127 is a separate source-truth and clock-compliance remediation for the grant tracker. Do not weaken CI as a shortcut.
- After both are independently green and accepted, build Stage 2 through narrow, tested PRs. Avoid repeating the wholesale PR #120 / PR #121 rollback cycle.
