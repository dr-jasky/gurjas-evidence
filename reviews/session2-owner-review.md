# Session 2 owner review

Reviewed: 2026-07-14

## What this session changes

The site now has a dependency-free static build system with one authoritative header, footer and base layout. Existing page-specific metadata, main content and inline tool code are preserved verbatim in the generated output, and every public route remains in the same location.

This pull request does **not** change the GitHub Pages source setting. The live site therefore remains on the existing branch-deployed files until the generated artifact has been inspected and an explicit deployment switch is approved.

## Required review before deployment switch

- Download the `gurjas-static-site` artifact from the successful **Site quality** workflow.
- Preview the artifact locally and compare the homepage, one standard page, one insight article, the contact form and all eight tools at desktop and mobile widths.
- Confirm the shared header, active navigation, footer, cookie preferences control and relative asset paths on root, one-level and two-level routes.
- Confirm that all existing canonical URLs remain unchanged.
- Confirm that source-only directories (`site/`, `scripts/`, `reviews/`, `_templates/`) are absent from the generated public artifact.
- Approve a separate deployment change only after the visual and functional review passes.

## Deliberate migration boundary

The copied legacy header and footer blocks remain in the page source files for now, but the builder ignores them. This avoids a risky all-at-once content migration and keeps the current branch-based live deployment working. New shared-shell changes must be made in `site/templates/` and `site/data/site.json`, not repeated across page files.
