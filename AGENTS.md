# Gurjas website implementation guardrails

These instructions apply to every change in this repository.

## Preserve the visual identity

- Treat the current production homepage as the reference design.
- Keep the existing navy, restrained gold, cream and tinted section rhythm.
- Reuse the shared Fraunces, Newsreader, Archivo and Spline Sans Mono typography.
- Prefer editorial rules, generous whitespace and restrained motion over generic SaaS cards.
- Use the shared `style.css`; do not create a page-specific visual system or detached theme stylesheet.
- New public sections must look native beside the homepage at desktop and mobile widths.
- Preserve reduced-motion behaviour, keyboard focus, semantic headings and no-JavaScript readability.

## Protect credibility

- Do not invent clients, outcomes, testimonials, affiliations, awards, prices or legal conclusions.
- Put questions requiring owner confirmation in a review checklist, never in published HTML comments.
- Keep repeated facts in structured data and ensure schema matches visible content.
- Preserve canonical URLs unless a reviewed redirect plan exists.

## Delivery discipline

- Work on a dedicated branch and keep each pull request narrowly scoped.
- Build and run all quality checks before proposing a merge.
- Include desktop and mobile visual evidence, a diff summary and a rollback note in every public-design PR.
- Never push directly to `main` or merge without owner approval.
