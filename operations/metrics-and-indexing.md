# Metrics and indexing operations

## Quarterly metric refresh

Google Scholar does not provide a supported public metrics API, and the SSRN
My Papers page is authenticated. Do not store browser cookies in GitHub or add a
scheduled scraper. That would be fragile and could expose account access.

1. Save fresh profile exports from Google Scholar, SSRN My Papers, ResearchID
   and Web of Science My peer review records.
2. Reconcile the figures. Use Google Scholar for citations, h-index and i10-index;
   use the authenticated SSRN export for paper, view, download and rank totals.
   ResearchID is a secondary cross-check only because it may lag the sources.
   For Web of Science, preserve the distinction between review records and
   distinct manuscripts.
3. Run the updater with the verified figures. For the 15 July 2026 snapshot:

   ```sh
   python3 scripts/update_metrics.py \
     --reviewed 2026-07-15 --citations 204 --h-index 8 --i10-index 8 \
     --ssrn-papers 14 --ssrn-views 6886 --ssrn-downloads 1300 \
     --ssrn-rank 89186 --ssrn-population 2814137 \
     --wos-review-records 63 --wos-manuscripts 56
   ```

4. Run `python3 scripts/quality-check.py` and the full build checks before merging.

The public site reads `data/site-facts.json`; source PDFs remain private and
must not be committed. The quality check refuses evidence older than one quarter.
Every repeated public metric must use a `data-fact` binding so one verified
snapshot updates the homepage, publications, resources and future evidence pages.

## Indexing response

- Keep every sitemap `lastmod` accurate; update it only when page content changes.
- Let the post-deployment IndexNow workflow notify participating search engines.
- In Google Search Console or Bing Webmaster Tools, request indexing only for
  important updated URLs. Repeated requests cannot guarantee inclusion.
- Record coverage exports periodically. Investigate a technical block only when
  live inspection shows a fetch, robots, canonical, redirect or server error.
- Strengthen discovery with relevant internal links and genuine links from
  authoritative profiles such as ORCID, Google Scholar, SSRN and institutional
  biographies. Never buy backlinks or create artificial link schemes.
