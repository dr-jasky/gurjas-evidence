# PR #82 — Interactive Decision Tools

**Status:** Implementation contract  
**Branch:** `product/interactive-decision-tools`  
**Target:** `main`  
**Release principle:** Build transparent decision support, not opaque recommendation widgets.

## 1. Purpose

This release will turn the Gurjas knowledge foundation into three connected, evidence-governed decision products:

1. **Research Design Selector**
2. **Journal Evaluation Workflow**
3. **Evidence Pathway Navigator**

The tools must help researchers and institutions move from a stated problem to a defensible next step while preserving the inputs, assumptions, rules, uncertainties, exclusions and sources behind the result.

This is not a volume-content release and not a generic collection of calculators. Each tool must behave as a transparent decision workflow that can be inspected, printed and reused.

## 2. Product outcomes

A successful release will allow a visitor to:

- describe a research, publication or institutional evidence problem;
- answer a short sequence of meaningful questions;
- see why particular routes are included or excluded;
- understand assumptions and unresolved uncertainties;
- follow links into the relevant Gurjas knowledge, methods, resources, services and tools;
- produce a structured decision record suitable for discussion with a supervisor, editor, research office, library, funder or institutional decision-maker;
- restart or revise the workflow without losing clarity about what changed.

The output must never be presented as guaranteed, exhaustive, legally determinative or a substitute for human expert judgment.

## 3. Shared governed decision record

All three tools must produce the same top-level record shape:

```yaml
question:
context:
user_inputs:
rules_applied:
sources_used:
assumptions:
uncertainties:
excluded_options:
recommended_next_steps:
generated_at:
tool_version:
```

### Required behaviour

- `question` records the decision the user is trying to make.
- `context` records the use case, stage and material constraints.
- `user_inputs` preserves only the information explicitly supplied in the workflow.
- `rules_applied` names the deterministic rules that influenced the result.
- `sources_used` links to relevant Gurjas evidence pages or clearly identified external sources where appropriate.
- `assumptions` separates inferred operating assumptions from user statements.
- `uncertainties` records missing information, unresolved conflicts and limitations.
- `excluded_options` explains which routes were screened out and why.
- `recommended_next_steps` gives sequenced, actionable steps rather than a single unexplained verdict.
- `generated_at` is created at runtime and is not used to imply editorial review.
- `tool_version` must map to a versioned tool manifest in the repository.

The record must be viewable in the interface and available through a print-friendly output. A privacy-preserving JSON export may be included if it can be implemented without server-side storage.

## 4. Tool A — Research Design Selector

### Core question

> What research design and methodological route best fit the stated question, evidence needs, constraints and decision context?

### Minimum input domains

- purpose of the study;
- type of research question;
- exploratory, descriptive, explanatory, predictive, evaluative or causal intent;
- unit and level of analysis;
- availability and quality of existing data;
- ability to collect primary data;
- time structure: cross-sectional, repeated, longitudinal or event-based;
- need for comparison, counterfactual or attribution;
- qualitative, quantitative or mixed evidence needs;
- population access and feasible sampling frame;
- measurement maturity;
- ethical, institutional and operational constraints.

### Output expectations

The tool should produce a ranked or grouped design route, not a single magical answer. Depending on the inputs, the output may point toward:

- exploratory qualitative design;
- case study;
- survey or cross-sectional observational design;
- longitudinal or panel design;
- experimental or quasi-experimental route;
- mixed-methods design;
- programme or impact-evaluation pathway;
- secondary-data or evidence-synthesis route;
- design work that must occur before analysis is defensible.

The output must identify:

- the strongest-fit route;
- viable alternatives;
- excluded designs and the reason for exclusion;
- missing prerequisites;
- measurement, sampling and analysis implications;
- links to relevant Gurjas methods, tools and resources.

### Safety and integrity rules

- Never imply that a design is valid merely because the user has data.
- Flag when the research question, measurement model or sampling frame is too immature for analysis.
- Distinguish prediction from explanation and causal attribution.
- Do not recommend complex methods solely because they appear advanced.
- Surface feasibility conflicts instead of silently resolving them.

## 5. Tool B — Journal Evaluation Workflow

### Core question

> What level of confidence is justified before submitting to, paying, citing or relying on this journal?

### Minimum input domains

- journal title and supplied URL;
- ISSN information where available;
- publisher identity;
- indexing claims;
- editorial-board claims;
- peer-review description;
- fees and payment timing;
- contact information and domain consistency;
- archiving and preservation claims;
- ethics, corrections and retraction policies;
- DOI and article-level traceability;
- solicitation behaviour;
- evidence of cloning, hijacking or identity mismatch;
- user purpose: submission, payment, citation, institutional listing or retrospective assessment.

### Output expectations

The workflow must produce an evidence status rather than a simplistic safe/unsafe label. Suggested statuses:

- **Evidence supports further consideration**
- **Proceed only after resolving specified gaps**
- **Material integrity concerns identified**
- **Identity or verification failure — stop and verify independently**
- **Insufficient evidence for a responsible conclusion**

The output must include:

- checks completed;
- checks not completed;
- evidence supplied by the user versus evidence independently linked by Gurjas;
- contradictions or mismatches;
- high-risk signals;
- limitations of index inclusion as a quality proxy;
- next verification actions;
- links to the journal-assessment checklist, predatory-journal guidance, cloned-journal guidance, reference-integrity tools and relevant external registries.

### Safety and integrity rules

- Never create or maintain an unsupported blacklist.
- Never treat Scopus, Web of Science, DOAJ, COPE, OASPA or any single database as conclusive by itself.
- Never fabricate a live verification result.
- Clearly label checks that require the user to visit an external registry.
- Distinguish absence of evidence from evidence of misconduct.
- Use cautious language where a legal or reputational allegation could arise.

## 6. Tool C — Evidence Pathway Navigator

### Core question

> What evidence workflow should an institution follow to move from its current gap to a defensible decision, report, evaluation or governance output?

### Intended users

- universities and colleges;
- research and development cells;
- IQAC and accreditation teams;
- libraries and scholarly-communication units;
- NGOs and foundations;
- CSR and programme teams;
- government and public-policy units;
- grantmakers and evaluation units.

### Minimum input domains

- institutional type;
- decision or obligation at stake;
- current evidence gap;
- intended output;
- audience and authority level;
- deadline and decision horizon;
- available data and documentation;
- ownership and accountability;
- privacy, ethics or governance constraints;
- need for verification, synthesis, design, measurement, evaluation, reporting or policy support;
- whether internal capability exists or external support is required.

### Output expectations

The navigator must produce a staged pathway such as:

1. define the decision and evidence standard;
2. inventory available evidence;
3. identify missing or unreliable evidence;
4. select the appropriate verification, research, evaluation or synthesis route;
5. assign ownership and governance checks;
6. produce the required output;
7. document limitations and review status;
8. determine whether expert or institutional support is required.

The output must link to the appropriate Gurjas knowledge pillar, method, resource, service or tool without converting every pathway into a sales funnel.

### Safety and integrity rules

- Separate accreditation evidence from research evidence and programme-evaluation evidence.
- Do not infer institutional compliance.
- Do not imply that possession of documents proves quality, impact or validity.
- Surface governance, ownership and review responsibilities.
- Identify when the requested output cannot be responsibly produced from existing evidence.

## 7. Shared interaction architecture

Each tool should follow the same recognisable flow:

1. **Define the decision** — what is being decided and for whom.
2. **Describe the context** — stage, constraints and evidence environment.
3. **Answer focused questions** — progressively disclose only relevant questions.
4. **Review inputs** — allow correction before generation.
5. **Generate the decision record** — show rules, assumptions and uncertainties.
6. **Explore alternatives** — explain excluded and secondary routes.
7. **Take the next step** — link into governed Gurjas material.
8. **Print or export** — preserve the record without sending data to Gurjas.

### UX principles

- calm, editorial and professional;
- no gamification, celebratory scoring or manipulative urgency;
- no opaque progress tricks;
- keyboard-first operation;
- clear back, revise, reset and restart controls;
- no loss of user input when moving between adjacent steps;
- plain-language explanations beside technical terms;
- responsive layouts that remain usable at narrow widths;
- reduced-motion support;
- explicit result limitations;
- no account required.

## 8. Proposed routes

- `/tools/research-design-selector/`
- `/tools/journal-evaluation-workflow/`
- `/tools/evidence-pathway-navigator/`

The Tools hub must introduce the three products as connected decision workflows. Relevant Knowledge Hub and resource pages must provide meaningful inbound links so none of the routes are orphaned.

All routes must be registered in the sitemap and content graph before release.

## 9. Proposed repository structure

The exact implementation may evolve, but the release should converge on a shared architecture similar to:

```text
assets/
  decision-tools.css
  decision-tools.js

data/
  decision-tools-manifest.json
  research-design-rules.json
  journal-evaluation-rules.json
  evidence-pathway-rules.json

tools/
  research-design-selector/index.html
  journal-evaluation-workflow/index.html
  evidence-pathway-navigator/index.html

tests/
  decision-tools/
    decision-record.spec.mjs
    research-design-selector.spec.mjs
    journal-evaluation-workflow.spec.mjs
    evidence-pathway-navigator.spec.mjs
```

Shared code must handle state, validation, decision-record rendering, print/export behaviour and accessibility. Tool-specific rule files must remain readable enough for editorial review.

## 10. Rule-engine requirements

- Deterministic and inspectable.
- Rules must have stable identifiers.
- Each applied rule must be traceable into the generated record.
- Rule priority and conflict handling must be explicit.
- No hidden remote model call.
- No silent collection or transmission of user inputs.
- No recommendation may appear without a named rule or documented editorial mapping.
- Rule files must support versioning and review dates.
- Conflicting inputs must create an uncertainty or clarification state rather than an arbitrary result.

## 11. Privacy and data handling

Version 1 must be static-first and browser-local.

- Do not transmit workflow answers to a server.
- Do not place sensitive answers in query strings.
- Do not persist inputs beyond the active session unless the user explicitly downloads a local record.
- Do not add analytics events containing free-text or decision inputs.
- Explain local processing in the interface.
- Avoid collecting names, emails, unpublished findings, confidential institutional data or identifiable participant information.

## 12. Evidence and editorial governance

Every tool must have:

- a named version;
- an editorial purpose statement;
- a reviewed date;
- a change log entry for material rule changes;
- documented limitations;
- links to the underlying Gurjas guidance used by the workflow;
- conservative wording around uncertainty;
- a human-review trigger for high-stakes, ambiguous or institution-specific situations.

Content volume must not grow faster than governance. It is acceptable to launch with fewer, stronger rules if those rules are transparent and defensible.

## 13. Accessibility requirements

Before release, all three tools must demonstrate:

- valid semantic landmarks and heading order;
- fully associated labels, instructions and error messages;
- keyboard access to every control and result action;
- visible focus states;
- no colour-only meaning;
- adequate contrast in default, focus, error and selected states;
- live-region announcements only where necessary and non-disruptive;
- preserved state when validation errors occur;
- correct use of fieldsets and legends for grouped decisions;
- usable print output;
- no horizontal overflow at supported mobile widths;
- successful Axe checks across initial, partially completed, validation-error and result states.

## 14. Testing and release gates

### Deterministic product tests

Each tool needs fixtures covering:

- a straightforward valid route;
- incomplete evidence;
- contradictory inputs;
- high-risk or stop condition;
- alternative route;
- reset and revision behaviour;
- stable decision-record generation;
- expected excluded options;
- no unsupported recommendation.

### Repository gates

The release cannot merge until:

- JavaScript and Python syntax checks pass;
- source integrity checks pass;
- the static build is deterministic;
- generated HTML validates;
- local links and canonicals validate;
- all three routes are represented in the sitemap;
- content-graph references are valid;
- no indexable route is orphaned;
- accessibility checks pass across representative states and viewports;
- performance budgets remain within current site limits;
- security checks confirm no unsafe injection path from user-controlled inputs;
- print/export output has been manually reviewed;
- visual artifacts have been reviewed and `visual-change-approved` is applied only after that review;
- a production smoke test confirms all three live routes after deployment.

## 15. Delivery sequence

### PR #82A — Shared decision framework

- decision-record schema;
- tool manifest and versioning;
- shared state and validation model;
- common layout, result and print components;
- fixture-driven tests.

### PR #82B — Research Design Selector

- governed question flow;
- inspectable design rules;
- alternative and exclusion logic;
- links to methods, resources and relevant tools.

### PR #82C — Journal Evaluation Workflow

- evidence-check workflow;
- identity and verification stop states;
- careful risk-language model;
- links to relevant internal guidance and external verification routes.

### PR #82D — Evidence Pathway Navigator

- institutional context model;
- staged evidence pathways;
- ownership, governance and expert-support triggers;
- links to institutional pathways and services.

### PR #82E — Integration and release hardening

- Tools hub integration;
- Knowledge Hub and resource inbound links;
- sitemap and content graph;
- full responsive and accessibility review;
- performance, security, export and production-smoke gates.

These phases may be implemented as commits within one product PR or as tightly controlled sub-branches, but the public release must remain cohesive.

## 16. Explicit non-goals

This release will not include:

- user accounts;
- subscriptions or payments;
- server-side storage of answers;
- a general-purpose AI chatbot;
- automated browsing presented as verified evidence;
- black-box scoring;
- fabricated journal assessments;
- accreditation or compliance certification;
- legal, medical or financial determinations;
- 3D interfaces;
- heavy animation;
- content added solely to increase page count or search keywords.

## 17. Definition of done

PR #82 is complete only when the three tools operate as a coherent evidence decision system rather than three unrelated forms.

A user must be able to understand:

- what the tool asked;
- what they answered;
- which rules affected the result;
- what assumptions were introduced;
- what remains uncertain;
- why some options were excluded;
- what to do next;
- which evidence or Gurjas resource supports that next step.

The final result must reinforce Gurjas as a governed evidence operating system: transparent, calm, inspectable and useful to real research and institutional decisions.
