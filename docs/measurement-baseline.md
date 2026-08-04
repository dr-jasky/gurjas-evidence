# Gurjas privacy-safe measurement baseline

**Version:** 1  
**Status:** Baseline only  
**Reviewed:** 5 August 2026

## Purpose

This baseline answers one operational question: do people move from Gurjas research discovery into evidence reading, practical use and legitimate service demand?

It is not a visitor-profiling system. It does not read or transmit names, email addresses, phone numbers, organisation names, free-text enquiries, research inputs, uploaded material, document content or tool results.

## Journey stages

1. **Discovery** — a consented visit reaches the Research Library or arrives through an attributable campaign.
2. **Evidence** — a visitor reads a governed Library entry or opens the evidence behind a tool.
3. **Practical use** — a visitor reaches a tool or resource and initiates a recognised action such as checking, calculating, assessing, generating, searching or planning.
4. **Output** — a visitor copies, prints or downloads a planning output.
5. **Service handoff** — a visitor intentionally moves toward contact, telephone, email or another approved assistance channel.
6. **Qualified enquiry** — the contact service confirms successful delivery. A submit attempt alone is never counted as success.

## Core questions

### Library to tool

`library_entry_view → library_to_practical → tool_action`

This indicates whether evidence pages lead to practical use. Report the number of entry views, practical-route clicks and recognised tool actions separately before calculating any rate.

### Tool to evidence

`tool_view → tool_evidence_open → library_entry_view`

This indicates whether tool users inspect the reasoning, assumptions and boundary conditions behind an output.

### Utility to enquiry

`tool_view or library_entry_view → service_handoff → contact_form_success`

This indicates whether public research utilities create legitimate service demand. A contact-page visit, form focus or submit attempt is not a successful enquiry.

## Privacy and event governance

- Analytics remains disabled until the visitor grants consent.
- Only named events are accepted.
- Each event has a strict parameter allowlist.
- Paths are reduced to same-origin pathnames; query strings are excluded.
- Slugs and campaign tags must be short machine-readable tokens.
- Email-like, sentence-like and unknown values are discarded.
- No event reads form fields, research inputs, uploaded content or tool outputs.
- Existing consent withdrawal continues to stop measurement.

## Baseline reporting

Use a complete, fixed reporting window before publishing conversion rates. During the first window, report:

- consented Library index and entry views;
- consented tool views and recognised actions;
- evidence-panel opens and Library-to-practical clicks;
- output exports by type;
- service handoffs by route and kind;
- successfully delivered enquiries by non-personal service slug.

Keep event counts and consented-session rates separate. Missing events cannot be interpreted as absence of demand because some visitors will decline analytics.

## Decisions this baseline should inform

The baseline can support decisions about which Library areas to expand, which tools deserve deeper development, where users need clearer evidence explanations and which public utilities create genuine service interest. It must not be used to infer an individual's identity, research topic, institutional affiliation or likelihood of purchasing a service.
