# gurjas.org — website

This repository contains the source for [gurjas.org](https://gurjas.org). Production is a static GitHub Pages site: plain HTML, one shared `style.css`, one shared `script.js`, and no client-side framework.

## Site system

The build is intentionally dependency-free and runs with Python 3.12 or newer.

- Existing page files remain the page-content source during the migration.
- `site/templates/base.html`, `header.html` and `footer.html` are the authoritative shared layouts.
- `site/data/site.json` contains navigation, footer and organisation shell data.
- `data/site-facts.json` contains volatile public facts such as tool count, metrics, contact details and response wording.
- `scripts/build_site.py` preserves every page-specific `<head>`, `<main>` and inline tool script while replacing duplicated headers, footers and shared-script references.
- The generated site is written to `_site/` with the same public paths and canonical URLs.
- `scripts/check_build.py` verifies route parity, main-content parity, canonicals, sitemap targets, required public files and local links.

The legacy header and footer copies inside page files are ignored by the generated output. They remain temporarily as a low-risk migration boundary, but production is generated from the reusable templates.

## Build and preview

```bash
python scripts/build_site.py --clean
python scripts/check_build.py
python -m http.server --directory _site 8000
```

Then open `http://localhost:8000/`.

## Editing

For page-specific copy, metadata or tool code, edit the relevant existing `index.html`. For navigation, footer, organisation shell copy or shared asset versioning, edit `site/data/site.json` or the templates instead of changing every page.

Any pull request to `main` runs the **Site quality** workflow. It checks JavaScript and Python syntax, source integrity, builds the entire site, regression-tests the output and uploads the generated `_site` directory as a short-lived review artifact.

The workflow also validates generated pages with the Nu HTML Checker and runs a deterministic visual comparison against the live production site. It covers the homepage, Services, People, Tools, Contact and the flagship journal-integrity article at desktop, tablet and mobile sizes. Unexpected differences and horizontal overflow fail the pull request and upload live, candidate and diff screenshots for review.

Intentional visual work must be reviewed from that artifact before the pull request receives the `visual-change-approved` label. The label records approval; it does not suppress horizontal-overflow failures.

Local quality commands are:

```bash
pnpm install
python scripts/build_site.py --clean
pnpm test:html

# With Chromium installed and the generated site served on port 8000:
pnpm test:visual
```

## Production deployment

A successful push to `main` runs **Deploy generated site to Pages**. The workflow rebuilds and rechecks the repository, uploads `_site` as the GitHub Pages artifact, deploys it to the protected `github-pages` environment and smoke-tests the homepage plus representative service, tool, contact, privacy and article routes.

Only generated files inside `_site` are deployed. Source-only directories such as `site/`, `scripts/` and `reviews/` are not published.

Rollback instructions are in `operations/deployment-and-rollback.md`.

## Public structure

- `index.html` — homepage
- `about/`, `services/`, `methods/`, `research/`, `publications/`, `insights/`, `tools/`, `people/`, `advisory/`, `resources/`, `governance/`, `ethics-charter/`, `faq/`, `contact/`, `privacy/`, `terms/` — stable public routes
- `style.css`, `script.js` — shared presentation and behaviour
- `assets/` and nested tool `data/` directories — static assets and local reference data
- `404.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `humans.txt`, `favicon.ico`, `CNAME` — public site plumbing
