# GJ-003 — Remaining insight sourcing and certainty audit

Reviewed: **4 August 2026**

The flagship journal guide is governed separately by GJ-002. This register covers the remaining **16 public insight articles** against five controls: source traceability, certainty calibration, time-sensitive policy status, legal/integrity qualification and discovery-copy alignment.

## Outcome

- 4 articles passed without copy correction.
- 10 articles failed the initial review and were corrected in this PR.
- 2 articles retain medium-priority sourcing follow-ups; neither contains an unresolved high-severity certainty finding.

| Article | Initial | Final | Source state |
|---|---:|---:|---|
| `insights/phd-shortcut-longest-route/index.html` | pass | pass | practice-basis-and-limitations |
| `insights/doaj-cope-oaspa-memberships/index.html` | fail | corrected | direct-official-links-added |
| `insights/cloned-hijacked-journals/index.html` | fail | corrected | direct-authoritative-links-added |
| `insights/fake-impact-factors/index.html` | fail | corrected | direct-primary-links-added |
| `insights/published-in-predatory-journal-what-to-do/index.html` | fail | corrected | direct-guidance-links-added |
| `insights/ugc-care-discontinued/index.html` | pass | pass | direct-official-policy-links |
| `insights/phd-publication-requirement-india-2026/index.html` | fail | follow_up_required | named-policy-sources-unlinked |
| `insights/ugc-suggestive-parameters-explained/index.html` | pass | pass | direct-official-policy-links |
| `insights/verify-a-journal-2026/index.html` | fail | corrected | direct-official-policy-links-added |
| `insights/scopus-publication-guide/index.html` | fail | corrected | direct-primary-links-added |
| `insights/scopus-wos-abdc-compared/index.html` | fail | corrected | direct-primary-links-added |
| `insights/journal-quartiles-citescore/index.html` | pass | pass | direct-primary-links |
| `insights/can-a-scopus-journal-be-predatory/index.html` | fail | corrected | direct-primary-links-added |
| `insights/naac-2025-reforms/index.html` | fail | corrected | direct-current-official-links-added |
| `insights/naac-binary-mbgl-2026/index.html` | fail | corrected | direct-current-official-links-added |
| `insights/digital-money-urban-slums/index.html` | fail | follow_up_required | publication-page-link-only |

The machine-readable record is `data/governance/insight-review-registry.json`. The regression test requires all 16 routes, documented corrections for every initial failure and an owner/action for every remaining follow-up.
