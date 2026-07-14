#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


# Homepage: promote the four buyer-specific pathways before the tools list.
index = read("index.html")
index = replace_once(
    index,
    '<link rel="stylesheet" href="./style.css?v=12">',
    '<link rel="stylesheet" href="./style.css?v=12">\n<link rel="preload" as="style" href="./offers.css?v=1">\n<link rel="stylesheet" href="./offers.css?v=1">',
    "homepage offer stylesheet",
)
index = replace_once(
    index,
    '<p class="home-lede">Evidence synthesis, impact evaluation and institutional advisory — anchored in a peer-reviewed record you can verify in one click.</p>',
    '<p class="home-lede">Research integrity, accreditation evidence, impact evaluation and advanced methods — anchored in a peer-reviewed record you can verify in one click.</p>',
    "homepage positioning",
)
index = replace_once(
    index,
    '<a class="home-btn home-btn-solid home-btn-shine" href="contact/">Start a conversation</a>',
    '<a class="home-btn home-btn-solid home-btn-shine" href="#priority-offers">Choose your priority</a>',
    "homepage primary CTA",
)
index = replace_once(
    index,
    '<a class="home-audience" href="services/#doctoral-support"><span class="icn" aria-hidden="true">✎</span><span class="tag">For Scholars</span><h3>Methods that survive peer review.</h3><p>Doctoral methodology, analysis and publication strategy — plus eight free research tools. <b class="go">→</b></p></a>',
    '<a class="home-audience" href="services/research-methods/"><span class="icn" aria-hidden="true">✎</span><span class="tag">For Scholars</span><h3>Advanced methods that survive scrutiny.</h3><p>Research design, measurement, modelling and ethical doctoral support. <b class="go">→</b></p></a>',
    "scholar routing",
)
index = replace_once(
    index,
    '<a class="home-audience" href="services/#institutional-advisory"><span class="icn" aria-hidden="true">⌂</span><span class="tag">For Institutions</span><h3>NAAC readiness, milestone by milestone.</h3><p>IQAC advisory, research capacity and documentation architecture. <b class="go">→</b></p></a>',
    '<a class="home-audience" href="services/naac-evidence-readiness/"><span class="icn" aria-hidden="true">⌂</span><span class="tag">For Institutions</span><h3>NAAC evidence readiness, criterion by criterion.</h3><p>Traceable evidence, gap analysis and defensible IQAC ownership. <b class="go">→</b></p></a>',
    "institution routing",
)
index = replace_once(
    index,
    '<a class="home-audience" href="services/#ngo-csr"><span class="icn" aria-hidden="true">◎</span><span class="tag">For Organisations</span><h3>Impact you can defend to funders.</h3><p>Evaluation studies, evidence synthesis and policy briefs. <b class="go">→</b></p></a>',
    '<a class="home-audience" href="services/impact-evaluation/"><span class="icn" aria-hidden="true">◎</span><span class="tag">For Organisations</span><h3>Impact evidence you can defend.</h3><p>Evaluation design, triangulated analysis and decision-ready reporting. <b class="go">→</b></p></a>',
    "organisation routing",
)
priority_home = '''<section class="priority-offers" id="priority-offers" aria-labelledby="h-priority-offers">
  <div class="home-wrap">
    <div class="home-head">
      <div>
        <p class="home-kicker">Priority engagements</p>
        <h2 class="home-h2" id="h-priority-offers">Start with the <em>decision at risk.</em></h2>
      </div>
      <p class="home-lede" style="max-width:36em">Four focused pathways make fit, deliverables, timing, investment and ethical boundaries clear before a serious enquiry.</p>
    </div>
    <div class="priority-offer-grid">
      <a class="priority-offer-card" href="services/research-integrity/"><span class="tag">Universities · research offices</span><h3>Institutional Research Integrity</h3><p>Policies, workflows and evidence controls that operate in practice — not only on paper.</p><span class="go">→</span></a>
      <a class="priority-offer-card" href="services/naac-evidence-readiness/"><span class="tag">Higher education · IQAC</span><h3>NAAC/IQAC Evidence Readiness</h3><p>Criterion-wise traceability, gap diagnosis and a defensible route to the next stage.</p><span class="go">→</span></a>
      <a class="priority-offer-card" href="services/impact-evaluation/"><span class="tag">NGO · CSR · policy programmes</span><h3>Impact Evaluation and Analytics</h3><p>Evaluation design, indicators, triangulated analysis and reporting with limitations stated.</p><span class="go">→</span></a>
      <a class="priority-offer-card" href="services/research-methods/"><span class="tag">Faculty · researchers · scholars</span><h3>Advanced Research Methods</h3><p>Research design, sampling, measurement and modelling the author can understand and defend.</p><span class="go">→</span></a>
    </div>
  </div>
</section>

'''
index = replace_once(
    index,
    '<section class="home-section home-section--dark" aria-labelledby="h-tools">',
    priority_home + '<section class="home-section home-section--dark" aria-labelledby="h-tools">',
    "homepage priority offer section",
)
capabilities = '''<section class="home-section home-section--tint" aria-labelledby="h-caps">
  <div class="home-wrap home-split">
    <div class="home-split-intro">
      <p class="home-kicker">Commercial pathways</p>
      <h2 class="home-h2" id="h-caps">Four offers. <em>One evidence standard.</em></h2>
      <p class="home-lede">Each page states fit, deliverables, client inputs, method, indicative investment and the work we will not do.</p>
      <a class="home-more" href="services/">See all supporting capabilities →</a>
    </div>
    <div>
      <a class="home-row home-row--lg" href="services/research-integrity/"><span class="idx">01</span><span><span class="ttl">Institutional Research Integrity</span><span class="dsc">Governance diagnostics · publication controls · authorship · AI use · corrections</span></span><span class="go">→</span></a>
      <a class="home-row home-row--lg" href="services/naac-evidence-readiness/"><span class="idx">02</span><span><span class="ttl">NAAC/IQAC Evidence Readiness</span><span class="dsc">Criterion-wise evidence · traceability · gap analysis · DVV/DCF readiness</span></span><span class="go">→</span></a>
      <a class="home-row home-row--lg" href="services/impact-evaluation/"><span class="idx">03</span><span><span class="ttl">Impact Evaluation and Analytics</span><span class="dsc">Evaluation design · indicators · field evidence · triangulation · decision briefs</span></span><span class="go">→</span></a>
      <a class="home-row home-row--lg" href="services/research-methods/"><span class="idx">04</span><span><span class="ttl">Advanced Research Methods</span><span class="dsc">Design · sampling · measurement · SEM · fsQCA · econometrics · mixed methods</span></span><span class="go">→</span></a>
    </div>
  </div>
</section>'''
index = regex_once(
    index,
    r'<section class="home-section home-section--tint" aria-labelledby="h-caps">.*?</section>(?=\n\n<section class="home-section home-section--cream" aria-labelledby="h-process">)',
    capabilities,
    "homepage capabilities section",
)
write("index.html", index)


# Services hub: lead with the four productised offers, retain supporting capability detail.
services = read("services/index.html")
services = replace_once(
    services,
    '<link rel="stylesheet" href="../style.css?v=12">',
    '<link rel="stylesheet" href="../style.css?v=12">\n<link rel="preload" as="style" href="../offers.css?v=1">\n<link rel="stylesheet" href="../offers.css?v=1">',
    "services offer stylesheet",
)
services = replace_once(
    services,
    '<h1>Six service lines. <em>One standard of proof.</em></h1>',
    '<h1>Four priority offers. <em>One standard of proof.</em></h1>',
    "services headline",
)
services = replace_once(
    services,
    '<p class="lede">Six high-trust service lines for institutions, scholars and impact-oriented organisations. Every engagement is scoped in writing, delivered against documented methodology, and bounded by our <a href="../governance/">ethics framework</a>.</p>',
    '<p class="lede">Start with the buyer-specific outcome you need. Each priority offer makes fit, deliverables, inputs, timing, indicative investment and ethical boundaries visible before scoping.</p>',
    "services hero lede",
)
priority_services = '''<section class="services-priority" aria-labelledby="h-priority-services">
  <div class="wrap">
    <div class="section-h">
      <span class="eyebrow">Choose the decision at risk</span>
      <h2 id="h-priority-services">Dedicated pathways for high-trust work</h2>
      <p class="lede">Each page includes a fixed-scope first step and one clear action.</p>
    </div>
    <div class="priority-offer-grid">
      <a class="priority-offer-card" href="research-integrity/"><span class="tag">Universities · research offices</span><h3>Institutional Research Integrity</h3><p>Review governance, publication controls, authorship, AI use, data handling and corrections.</p><span class="go">→</span></a>
      <a class="priority-offer-card" href="naac-evidence-readiness/"><span class="tag">Higher education · IQAC</span><h3>NAAC/IQAC Evidence Readiness</h3><p>Build criterion-wise traceability and resolve material evidence gaps before submission pressure.</p><span class="go">→</span></a>
      <a class="priority-offer-card" href="impact-evaluation/"><span class="tag">NGO · CSR · policy programmes</span><h3>Impact Evaluation and Analytics</h3><p>Design and analyse evaluations that distinguish evidence, inference and limitation.</p><span class="go">→</span></a>
      <a class="priority-offer-card" href="research-methods/"><span class="tag">Faculty · researchers · scholars</span><h3>Advanced Research Methods</h3><p>Align questions, constructs, data, sampling and models before avoidable rework.</p><span class="go">→</span></a>
    </div>
  </div>
</section>

'''
services = replace_once(
    services,
    '<section aria-labelledby="h-lines">',
    priority_services + '<section aria-labelledby="h-lines">',
    "services priority offer section",
)
services = replace_once(services, '<span class="eyebrow">The service lines</span>', '<span class="eyebrow">Supporting capabilities</span>', "services capabilities eyebrow")
services = replace_once(services, '<h2 id="h-lines">What we deliver — and what lands on your desk</h2>', '<h2 id="h-lines">Broader capabilities behind the four offers</h2>', "services capabilities heading")
services = replace_once(
    services,
    '<p class="lede">Every engagement is scoped in writing, delivered against documented methodology, and bounded by our <a href="../governance/">ethics framework</a>.</p>',
    '<p class="lede">The six capability areas below remain available, but serious enquiries are routed through the four focused offers above.</p>',
    "services capabilities lede",
)
services = replace_once(services, '>Open the intake form →</a>', '>Book a fit call →</a>', "services final CTA")
write("services/index.html", services)


# Sitemap: add stable canonical routes for all four generated pages.
sitemap = read("sitemap.xml")
sitemap = replace_once(
    sitemap,
    '  <url><loc>https://gurjas.org/services/</loc><lastmod>2026-07-11</lastmod><priority>0.8</priority></url>',
    '  <url><loc>https://gurjas.org/services/</loc><lastmod>2026-07-14</lastmod><priority>0.9</priority></url>\n'
    '  <url><loc>https://gurjas.org/services/research-integrity/</loc><lastmod>2026-07-14</lastmod><priority>0.9</priority></url>\n'
    '  <url><loc>https://gurjas.org/services/naac-evidence-readiness/</loc><lastmod>2026-07-14</lastmod><priority>0.9</priority></url>\n'
    '  <url><loc>https://gurjas.org/services/impact-evaluation/</loc><lastmod>2026-07-14</lastmod><priority>0.9</priority></url>\n'
    '  <url><loc>https://gurjas.org/services/research-methods/</loc><lastmod>2026-07-14</lastmod><priority>0.9</priority></url>',
    "priority offer sitemap entries",
)
sitemap = sitemap.replace('<url><loc>https://gurjas.org/</loc><lastmod>2026-07-11</lastmod>', '<url><loc>https://gurjas.org/</loc><lastmod>2026-07-14</lastmod>', 1)
write("sitemap.xml", sitemap)


# Production smoke tests must include every commercial pathway.
pages = read(".github/workflows/pages.yml")
pages = replace_once(
    pages,
    '            "/services/"\n            "/tools/"',
    '            "/services/"\n            "/services/research-integrity/"\n            "/services/naac-evidence-readiness/"\n            "/services/impact-evaluation/"\n            "/services/research-methods/"\n            "/tools/"',
    "deployment offer smoke routes",
)
write(".github/workflows/pages.yml", pages)

print("Session 3 homepage, services, sitemap and production smoke routes updated.")
