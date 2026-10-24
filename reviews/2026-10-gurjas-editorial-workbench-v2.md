# Gurjas — Editorial Workbench V2 (25 October 2026)
**Design review only. No production deployment.** Implements a materially different direction after the owner rejected the original `gurjas_vision_preview.html` concept. Project parent: #130.

## Reference audit and licensed code policy
| Product | What to learn | What not to copy |
|--|--|--|
| Linear, https://linear.app/ | Small navigation surface, exacting typographic hierarchy, product craft | Trademark, illustrations, proprietary components |
| Stripe, https://stripe.com/ | Real product interface as hero, purposeful storytelling | Animations, proprietary illustrations |
| Observable, https://observablehq.com/ and https://github.com/observablehq/framework | Interactive data-product philosophy, semantic responsive structure, downloadable results | Do not import a new static framework wholesale into existing site |
| Our World in Data, https://ourworldindata.org/ | Source visibility, well-annotated interactive evidence, meaningful utilities | Current Grapher is not licensed for unrestricted reuse: verify permission before using code |

The new direction is **light-first editorial rather than dark futuristic consultancy**. Maintain Gurjas's existing navy / brass / warm paper identity; make the first screen deliver an actual useful tool launcher. No 3D for the sake of 3D, fake scientific plots, spinning atoms, floating glass cards, random stats, testimonial fabrication or cloned source code.

## Core design decisions
- Original headline concept: **“Good research. Real world.”** (editable after copy review). Hero sits on bright paper, with an unusually large display font (Fraunces) and a **fully functional** dark workbench app embedded at right. This right-side workbench is not decorative.
- Large 53/47 desktop split; single-column on narrow mobile. Navigation stays short and collapses accessibly. Use existing shared Archivo / Fraunces / Newsreader / Spline Sans Mono and CSS variables; no framework rewrite or CDN dependency.
- Large type and precise editorial rules, no glassmorphism and no ambient gradients. All primary surface layouts are crisp, flat and legible. Gold only a functional accent, never faint body text.
- In the interactive workbench: local filtering, visible match count, category selection (Publishing / Methods / Planning), and six spotlight links to **real** existing tool routes. Unfiltered fallback to all 11 actual tools. Never pretend local filtering is AI search.
- A useful secondary section goes from “who is this for?” to actual task routes; below is an honest conceptual method-explanation graphic **explicitly labelled as illustrative**, not a fabricated API lookup.
- Design preview is a standalone local HTML file in the conversation, **not** a PR deployment artifact; when implementing, source the tool data from `data/product-front-door.json` rather than duplicating names in code.

## Components & measured design targets
1. **Masthead**: left brand, short right nav, high-contrast contact CTA; real keyboard/mobile menu.
2. **Hero**: light background, editorial H1 / real utility launcher side-by-side on desktop, stacked mobile.
3. **Tool launcher**: 4 labelled categories, six featured entries out of governed 11; local search, honest match count, native links. Accessible group of filter buttons with `aria-pressed`, rather than incorrect pseudo-tabs.
4. **Proof strip**: 3–4 factual operating principles, no unverified people/client counts.
5. **Three pathways**: researcher, PhD scholar, institution; each with direct current tool link and modest precise prose.
6. **Inspectability diagram**: explicitly labelled illustrative source → method → record → boundary, in accessible SVG accompanied by prose.
7. **Research article / tool links**: current live routes only, not pseudo-AI content.
8. **Commission CTA**: concise ethical service handoff.

### Concrete visual checks required before integration
- Capture baseline + candidate **real browser** screenshots at widths 320, 375, 390, 768, 1024, 1440; top viewport and full page. At least one real iPhone Safari and one Android Chrome inspection.
- Check H1 wrapping, complete visible labels, no horizontal overflow, cards and SVG not clipped, hover/focus contrast, zoom 200%, reduced-motion, no-JS access.
- Accessibility: WCAG 2.2 AA; labels, focus order, menus, status announcements, semantics. Browser result search must not send entered strings to external service.
- Performance targets after measurement: LCP <= 2.5 s, INP <= 200ms, CLS <= .1 at p75 real-user values. Do not claim targets already met.
- **No merge or release** until rendered screenshots have been examined and explicitly approved. Reason: historical PR #128 broken mobile, reverted by #129.
- The standalone HTML prototype passed static structure/link/semantic checks; **rendered visual inspection has NOT passed because local Chromium screenshot capture timed out**. That is an explicit blocker, not a pass.

## Source-level implementation map for the next isolated PR
- `scripts/product_front_door.py` → `render_front_door`: generate new light hero, right-side interactive workbench. **Important:** existing title is currently hardcoded; move it to governed `data/product-front-door.json`.
- `data/product-front-door.json`: approved titles, categories, featured flag and links sourced from 11 tools. No count inflation.
- `assets/product-front-door.css`: replace competing visual treatments only after CSS ownership audit; keep shared `style.css` canonical tokens. Study `assets/home-command-centre-live.css` import stack before removal.
- `assets/product-front-door.js`: reusable current local filtering; PR #131 separately fixes Enter path; avoid overwriting it. Rebase only after any overlap is reconciled.
- `site/data/site.json`, `site/templates/*`: preserve shared navigation/footer/canonicals.
- `tests/conversion/product-front-door.spec.mjs`, `tests/visual/compare.mjs`: adjust only for reviewed new contract, never disable visual gates.
- Validate `_site/index.html` output, **not** only root `index.html`.

## Recommended implementation PRs (do not combine)
**D01:** make hero text contract-driven and consolidate CSS ownership, no visible layout change.
**D02:** first-screen masthead + right-side workbench implementation in generator with screenshots and interaction QA.
**D03:** editorial proof strip + real pathway links, retaining existing deep-link routes.
**D04:** tools hub component consistency and research product demos; utility additions are separate from cosmetic changes.
**D05:** optimize loading, content discovery and contact journeys based on consented data.

## Owner review gate
The older dark image/diagram HTML direction is REJECTED and should not be used as the base. The V2 standalone preview demonstrates the replacement concept; evaluate it in a browser before implementation. Any design discrepancy must be fixed in the draft PR before production release.

## Implementer prompt
> Read #130, this review, `README.md`, `AGENTS.md`, and the previous revert PR #129. Implement ONLY D01 first from fresh main. Do not transplant the standalone prototype verbatim. Reuse current production generator and all governed tool data. Attach before/after desktop and mobile screenshots and tool-interaction checks; explicitly state any test not actually run. Open a draft PR, do not merge or deploy.