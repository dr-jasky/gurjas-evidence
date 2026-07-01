# Gurjas Evidence and Policy Analytics — Website (v2)

A single-page, publication-first website for **gurjas.org**. Static HTML/CSS/JS — no build step, no dependencies. Deploys as-is to GitHub Pages, Netlify, Cloudflare Pages, or any static host.

## Files
- `index.html` — the site (all sections)
- `style.css` — styling (navy/teal/gold; Fraunces + Inter via Google Fonts)
- `script.js` — nav toggle, scroll reveals, copy-to-clipboard
- `404.html` — custom not-found page
- `sitemap.xml`, `robots.txt` — SEO
- `CNAME` — custom domain for GitHub Pages (`gurjas.org`)
- `assets/` — logo, monogram, favicon, OG preview

## What changed from v1
- Domain switched to **gurjas.org** (canonical, OG, sitemap, JSON-LD).
- **Phone number removed** from all public views; email retained (`gurjasevidence@gmail.com`). Add a number back in the Contact section once the office line is live.
- New **Research standing** metrics strip and **Publications** section (real, APA-formatted).
- New **Selected engagements** section (three real areas + one honest NGO placeholder).
- **People** section now surfaces the Founder (Gurpreet Kaur) and a Chief Partnership Officer slot.
- Typography upgraded to Fraunces (display serif) + Inter.
- IIT Ropar stated correctly as a personal credential via **iHub-AWaDH** — no institutional endorsement implied.

## Editing notes (maintainer)
- **Publications:** citations are drawn from the team's Google Scholar and SSRN records (June 2026). Before any formal/print use, verify each entry's volume, issue, page range and DOI against the publisher record and add DOIs where available.
- **Chief Partnership Officer:** replace the placeholder line in the People section with the appointee's name and short bio once confirmed.
- **NGO engagement card:** the dashed placeholder card in "Selected engagements" is ready to be replaced with the real study once complete and consent is in place.
- **Advisory board:** advisor names go live only after written consent and approved wording.
- **Phone:** when the office number is ready, add a `contact-row` in the Contact card and (optionally) a `tel:` button.

## Deploy to GitHub Pages with gurjas.org

1. Create a public repo, e.g. `gurjas-site`.
2. Upload the **contents** of this folder to the repo root (so `index.html` is at the top level, `CNAME` included).
3. Repo **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `/root` → Save.
4. Under **Custom domain**, enter `gurjas.org` (the `CNAME` file already sets this) and Save.
5. At your domain registrar (Cloudflare / Porkbun), add DNS:
   - Four `A` records for the apex `gurjas.org` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One `CNAME` record for `www` → `<your-username>.github.io`
6. Back in GitHub Pages, tick **Enforce HTTPS** once the certificate is issued (can take up to ~24h).

Cloudflare tip: if you host DNS on Cloudflare, set the A/CNAME records to **DNS only** (grey cloud) during initial setup so GitHub can issue the certificate, then you may proxy afterwards.
