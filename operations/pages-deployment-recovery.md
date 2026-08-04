# GitHub Pages deployment recovery

## Production source of truth

The public site is deployed from the `_site` artifact built from `main` by `.github/workflows/pages.yml`.

The legacy `deploy-generated-site` branch is not the production source and must not be patched as a substitute for a Pages deployment.

## Required Pages action stack

The workflow uses the supported major versions:

- `actions/checkout@v6`
- `actions/setup-python@v6`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v4`
- `actions/deploy-pages@v4`

Changes to these versions must be verified against GitHub's current Pages documentation before merging.

## Release contract

A production deployment must complete these stages:

1. Check out the exact `main` commit.
2. Run JavaScript and Python syntax checks.
3. Run source-integrity checks.
4. Build `_site` from source pages and shared templates.
5. Validate generated routes, canonical URLs, local links and sitemap coverage.
6. Upload the `_site` Pages artifact.
7. Deploy the artifact to the `github-pages` environment.
8. Smoke-test priority routes on the deployed URL.

## PR #80 priority routes

The following routes are part of the deployment smoke-test contract:

- `/knowledge/`
- `/knowledge/research-integrity/`
- `/knowledge/research-design/`
- `/knowledge/institutional-pathways/`
- `/resources/journal-assessment-checklist/`
- `/resources/research-question-canvas/`

Every indexable route must also be registered in `sitemap.xml`; the build fails closed when route and sitemap coverage diverge.

## Recovery sequence

When a merged page returns 404:

1. Confirm the source file exists on `main`.
2. Confirm the route exists in `sitemap.xml`.
3. Confirm the Pages action versions resolve.
4. Inspect the `Deploy generated site to Pages` run for the exact `main` SHA.
5. Inspect the first failed build, deploy or smoke-test step.
6. Fix the source or workflow on a reviewed branch.
7. Re-run full quality checks and merge only after a clean result.
8. Verify the live route directly; do not treat branch contents or search indexing as proof of deployment.
