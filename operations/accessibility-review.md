# Accessibility review and release gate

## Purpose

Accessibility is treated as a release-control system, not a one-time compliance claim. Automated checks prevent common regressions; manual review covers interaction and assistive-technology questions that automation cannot settle.

## Automated pull-request gate

The `Site quality` workflow builds the generated site, serves it locally and runs `tests/accessibility/audit.mjs` with pinned `axe-core`.

The audit covers:

- every canonical route in the generated sitemap;
- the generated 404 page;
- desktop at 1440 × 1100;
- mobile at 390 × 844;
- reduced-motion mode;
- the open Site Guide dialog;
- the cookie-preferences panel;
- both Services evidence views and the Delivery engagement stage;
- a completed SEM planning result;
- a completed Research Readiness Triage result.

The rule set is limited to WCAG 2.0, 2.1 and 2.2 Level A and AA tags. A pull request fails when axe reports any **serious** or **critical** violation. Minor and moderate violations remain visible in the report and should be reviewed rather than silently ignored.

Each run uploads:

- `accessibility-review/axe-results.json` — route-, viewport- and state-level findings with selectors and failure summaries;
- `accessibility-review/summary.md` — release-oriented summary;
- the normal visual, baseline and diff evidence.

Infrastructure failure must never be interpreted as a clean result. A page-load failure, missing browser, missing axe bundle or audit exception fails the workflow.

## Manual release review

Automated results do not establish complete WCAG conformance. Before substantial interface releases, review at minimum:

1. Complete primary journeys using only the keyboard, including menus, dialogs, tabs, forms, tools, copy controls and print/export actions.
2. Confirm visible focus is never hidden behind sticky navigation, dialogs or cookie controls.
3. Test VoiceOver with Safari on iOS and macOS, and NVDA with a current Chromium browser when available.
4. Verify page structure through landmarks and heading navigation rather than only visual reading order.
5. Test browser zoom at 200% and text-only zoom where supported.
6. Test narrow reflow at 320 CSS pixels without two-dimensional scrolling except for genuine data tables.
7. Check forced-colours or high-contrast mode, including selected tabs, validation states and focus indicators.
8. Confirm instructions do not depend only on colour, position, shape or animation.
9. Review error identification, recovery guidance and focus movement after invalid submission.
10. Review cognitive load: label clarity, sentence length, repeated controls, page length and decision density.

Record the reviewer, date, routes, devices, assistive technologies, unresolved findings and accepted limitations in the pull request or its review artifact.

## Finding triage

- **Critical:** blocks a core task or exposes content incorrectly to assistive technology. Do not merge.
- **Serious:** creates a substantial barrier in a common path. Do not merge.
- **Moderate:** fix in the current pull request unless the remediation risk is greater than the defect; otherwise open a dated issue with an owner.
- **Minor:** repair opportunistically and prevent recurrence when a stable rule is available.
- **Incomplete:** requires human judgment. Never classify it as passed without review.

Do not suppress an axe rule merely to make CI green. A suppression requires a written false-positive explanation, the smallest possible selector scope, an owner and a review date.

## Maintenance

- Keep `axe-core` pinned in `package.json` and `pnpm-lock.yaml`.
- Review axe minor releases quarterly because new rules may correctly reveal previously undetected barriers.
- Add dynamic-state coverage whenever a new dialog, tab set, form result, validation state or interactive tool is introduced.
- Retain the serious/critical release threshold unless a stricter gate is adopted after the existing moderate backlog is reviewed.
- Re-run the workflow manually against live production after changes to Cloudflare, fonts, headers or third-party delivery behaviour.
