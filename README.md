# gurjas.org — website

This repository is the live source for [gurjas.org](https://gurjas.org), served via GitHub Pages (see `CNAME`). It is a static, dependency-free multi-page site: plain HTML, one shared `style.css` and one shared `script.js`.

## Structure

- `index.html` — homepage
- `about/`, `services/`, `methods/`, `research/`, `publications/`, `insights/`, `tools/`, `people/`, `advisory/`, `resources/`, `governance/`, `ethics-charter/`, `faq/`, `contact/`, `privacy/`, `terms/` — one `index.html` per section
- `style.css`, `script.js` — shared styles and behaviour, loaded by every page with a `?v=` cache-busting query string
- `assets/` — logos, favicons, social-preview image
- `404.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `humans.txt`, `favicon.ico`, `CNAME` — site plumbing

## Editing

Pages are hand-written static HTML — edit the relevant `index.html` directly. When editing shared `style.css` or `script.js`, bump the `?v=` query string on every page that references them so browsers pick up the change.

## Previewing locally

Serve the folder with any static file server, e.g. `python3 -m http.server`, then open `http://localhost:8000/`. Opening `index.html` directly by double-click also works for a quick look; root-relative links between pages only resolve correctly when served over HTTP.
