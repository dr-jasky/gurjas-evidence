# Security-header rollout for gurjas.org

## Context

gurjas.org is a static site on GitHub Pages served through Cloudflare. GitHub
Pages cannot set custom response headers, so every header below is configured
in Cloudflare (Rules → Transform Rules → Modify Response Header, or a Snippet).
This runbook exists because a header mistake here — especially HSTS or CSP —
can take the site down for real visitors while looking fine in a quick check.

Do not enable any enforcing header without completing the verification step for
the stage before it.

## Current state (verified 20 July 2026)

Public responses do not send HSTS, CSP, X-Content-Type-Options,
Referrer-Policy or Permissions-Policy. TLS is terminated by Cloudflare;
`www.gurjas.org` and the apex both resolve.

## Stage 1 — Low-risk headers (safe to enable immediately)

Add via one Response Header Transform Rule applying to all hostnames:

| Header | Value | Why |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | Stops MIME sniffing; no known breakage for this site. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Full referrer stays on-site; external links receive origin only. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | The site uses none of these APIs. Extend the deny list only after re-checking the tools. |

Verification: `curl -sI https://gurjas.org/ | grep -iE 'x-content|referrer|permissions'`
and re-run the site's tools (journal lookups, copy buttons, print views).

## Stage 2 — HSTS (deliberately cautious)

Pre-conditions, all mandatory:

1. `https://gurjas.org`, `https://www.gurjas.org` and every future subdomain
   load correctly over HTTPS with no certificate warnings.
2. Cloudflare SSL mode is **Full (strict)**.
3. No planned subdomain will ever need plain HTTP.

Rollout ladder — move down only after each period passes without issue:

1. `Strict-Transport-Security: max-age=86400` (1 day) — hold for a week.
2. `max-age=2592000` (30 days) — hold for a month.
3. `max-age=31536000; includeSubDomains` — steady state.
4. Only consider `preload` after months of stable operation; preload-list
   removal is slow and effectively irreversible in the short term.

Rollback: reduce `max-age` to `0`. Browsers that already saw the old value
keep enforcing until their timer expires — this is why the ladder starts low.

## Stage 3 — CSP in Report-Only mode

The site currently uses inline scripts (per-tool logic), inline styles,
Google Fonts, and consent-gated Google Analytics 4 and Microsoft Clarity.
An enforcing CSP written today would therefore need `'unsafe-inline'`,
which removes most of CSP's value. Plan:

1. Deploy **report-only** first:

   ```
   Content-Security-Policy-Report-Only: default-src 'self';
     script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
     font-src https://fonts.gstatic.com;
     img-src 'self' data:;
     connect-src 'self' https://api.openalex.org https://api.crossref.org https://doaj.org
       https://*.google-analytics.com https://*.clarity.ms;
     frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://formsubmit.co
   ```

   Check the `connect-src` list against `data/tool-contracts.json`
   (`outboundRequests`) before deploying — the contracts file is the
   authoritative inventory of tool endpoints; update this policy whenever a
   contract adds an endpoint.

2. Collect violations for at least two weeks (Cloudflare notifications or a
   `report-to` endpoint) and fix real ones.
3. Progressively move inline tool scripts into per-tool files so
   `'unsafe-inline'` can eventually be dropped from `script-src`
   (self-hosting the Google Fonts CSS removes the two font origins too).
4. Only then rename the header to enforcing `Content-Security-Policy`.

Never deploy an enforcing CSP and a new tool release in the same change.

## Standing rules

- One header change per deployment, verified with `curl -sI` from at least
  two networks and a full pass through Contact, the consent banner and every
  tool that performs an outbound lookup.
- Record each change (date, rule, value, who) at the bottom of this file.
- Re-run the check after any Cloudflare plan, DNS or Pages configuration
  change; rules can silently stop matching when hostnames change.

## Change log

| Date | Change | By |
| --- | --- | --- |
| — | (no header changes recorded yet) | — |
