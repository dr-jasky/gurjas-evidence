# Search discovery and indexing runbook

This runbook separates repository-controlled crawl readiness from account-level search-engine ownership. Search engines decide whether and when to index or rank a URL; the site can make discovery reliable but cannot guarantee inclusion or position.

## Already automated in the repository

- canonical HTTPS URLs on `gurjas.org`;
- a generated XML sitemap with route-level `lastmod` values;
- sitemap coverage and canonical-path regression tests;
- permissive production `robots.txt` with the sitemap location;
- indexable-page metadata and structured-data safeguards;
- an IndexNow key published at the site root;
- automatic IndexNow submission of all live sitemap URLs after a successful production deployment.

## Google Search Console ownership

Use a **Domain property** for `gurjas.org`, verified through DNS. Do not create only a URL-prefix property for a GitHub Pages address.

1. Add the `gurjas.org` Domain property in Google Search Console.
2. Copy the TXT verification record supplied by Google.
3. Add that TXT record at the authoritative DNS provider for `gurjas.org`.
4. Complete verification in Search Console.
5. Submit `https://gurjas.org/sitemap.xml` under **Sitemaps**.
6. Inspect and request indexing for the commercially critical canonical URLs:
   - `https://gurjas.org/`
   - `https://gurjas.org/services/`
   - `https://gurjas.org/services/research-methods/`
   - `https://gurjas.org/services/naac-evidence-readiness/`
   - `https://gurjas.org/services/impact-evaluation/`
   - `https://gurjas.org/services/institutional-research-integrity-clinic/`
   - `https://gurjas.org/tools/`
   - `https://gurjas.org/ethics-charter/`
   - the strongest current Insights pillar pages.
7. Review **Page indexing**, **Crawl stats**, **HTTPS**, **Core Web Vitals** and **Manual actions** weekly during the first eight weeks.
8. Export baseline data after 28 days: indexed pages, impressions, clicks, queries, countries, devices and top landing pages.

Do not repeatedly request indexing for unchanged pages. Use the URL Inspection request after a material page change or when an important canonical URL remains undiscovered.

## Bing Webmaster Tools ownership

1. Add and verify `gurjas.org` in Bing Webmaster Tools. Importing the verified Google Search Console property is acceptable when offered.
2. Submit `https://gurjas.org/sitemap.xml`.
3. Confirm that Bing can retrieve the IndexNow key at:
   `https://gurjas.org/127d4f6734fd4c5b8f7308201fd3d836.txt`
4. Check **Site Scan**, **URL Inspection**, **Sitemaps** and **Search Performance** after the first automatic IndexNow submission.

## Production verification after every material release

- Confirm the deployment workflow succeeded.
- Confirm `https://gurjas.org/sitemap.xml` returns HTTP 200 and contains the new or changed canonical URL.
- Confirm the search-discovery workflow succeeded and reports an accepted IndexNow response.
- Confirm the canonical page returns HTTP 200, is not marked `noindex`, and is internally linked from at least one relevant page.
- For a strategically important new page, inspect it once in Google Search Console after deployment.

## Discovery work beyond technical indexing

Technical submission does not create rankings by itself. Each commercially important page should receive:

- at least three relevant internal contextual links;
- one strong, query-focused title and description;
- substantive original content that satisfies a recognisable search intent;
- supporting citations and externally verifiable evidence where appropriate;
- distribution through LinkedIn, institutional outreach, academic profiles and relevant resource directories;
- legitimate backlinks earned through useful tools, guides, datasets or policy resources.

Never purchase bulk backlinks, publish doorway pages, duplicate location pages, hide keywords, or promise ranking outcomes.
