#!/usr/bin/env python3
"""Gurjas insight-article generator (internal build helper, not published).
Emits insights/<slug>/index.html with the exact proven house structure, so article
work is body-only. FAQ visible HTML and FAQPage schema are generated from ONE list,
so they can never drift. Run from repo root: python3 _templates/gen.py
"""
import os, re, json, html as _h

ORG_GRAPH = '{"@type": "Organization", "@id": "https://gurjas.org/#org", "name": "Gurjas Evidence and Policy Analytics", "alternateName": "Gurjas", "url": "https://gurjas.org/", "logo": {"@type": "ImageObject", "url": "https://gurjas.org/assets/gurjas-logo.png"}, "email": "support@gurjas.org", "foundingDate": "2026-06-29", "founder": {"@type": "Person", "name": "Gurpreet Kaur"}, "address": {"@type": "PostalAddress", "addressLocality": "Patiala", "addressRegion": "Punjab", "addressCountry": "IN"}, "identifier": {"@type": "PropertyValue", "propertyID": "Udyam Registration Number", "value": "UDYAM-PB-17-0132009"}, "description": "An independent research and policy analytics practice providing evidence synthesis, impact evaluation, policy analysis and institutional advisory.", "knowsAbout": ["Research integrity", "Predatory journals", "Scopus publishing", "Academic publishing in India", "Research methodology"]}'

NAV = '''<canvas class="evidence-field" aria-hidden="true"></canvas>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="../../" aria-label="Gurjas Evidence and Policy Analytics — home">
      <img src="../../assets/gurjas-mark.png" alt="" width="40" height="47">
      <span class="brand-t">Gurjas<em>Evidence &amp; Policy Analytics</em></span>
    </a>
    <button class="nav-btn" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav id="nav" class="site-nav" aria-label="Primary">
      <ul><li><a href="../../about/">About</a></li><li><a href="../../services/">Services</a></li><li class="has-sub"><button class="sub-btn" type="button" aria-expanded="false" aria-haspopup="true" aria-current="true">Our Work</button><ul class="subnav"><li><a href="../../methods/">Methods</a></li><li><a href="../../research/">Research</a></li><li><a href="../../publications/">Publications</a></li><li><a href="../../insights/" aria-current="page">Insights</a></li></ul></li><li><a href="../../tools/">Tools</a></li><li><a href="../../contact/" class="nav-cta">Contact</a></li></ul>
      <div class="nav-trust">
        <span class="nav-trust-h">Verified externally</span>
        <a href="https://orcid.org/0000-0003-0337-7885" rel="noopener">ORCID ↗</a>
        <a href="https://scholar.google.com/citations?user=d8Kd4ywAAAAJ" rel="noopener">Google Scholar ↗</a>
        <a href="https://www.webofscience.com/wos/author/record/IQW-3142-2023" rel="noopener">Web of Science ↗</a>
      </div>
    </nav>
  </div>
</header>'''

FOOTER = '''<footer class="site-foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <img src="../../assets/gurjas-mark.png" alt="" width="32" height="38" loading="lazy">
      <p><strong>Gurjas Evidence and Policy Analytics</strong><br>Evidence-led decisions for institutions, policy and impact.</p>
      <p class="foot-meta">Registered Micro Enterprise · UDYAM-PB-17-0132009<br>Patiala, Punjab, India · Serving India, Canada &amp; global clients (remote)</p>
      <p class="foot-meta"><a href="tel:+919877295825" style="color:inherit">+91 98772 95825</a> · <a href="https://wa.me/919877295825" rel="noopener" style="color:inherit">WhatsApp</a> · <a href="mailto:support@gurjas.org" style="color:inherit">support@gurjas.org</a></p>
    </div>
    <nav aria-label="Footer — practice"><h2 class="foot-h">Practice</h2><ul>
      <li><a href="../../about/">About</a></li><li><a href="../../services/">Services</a></li>
      <li><a href="../../methods/">Methodology</a></li><li><a href="../../research/">Research</a></li>
      <li><a href="../../publications/">Publications</a></li><li><a href="../../tools/">Research Tools</a></li></ul></nav>
    <nav aria-label="Footer — organisation"><h2 class="foot-h">Organisation</h2><ul>
      <li><a href="../../people/">People</a></li><li><a href="../../advisory/">Advisory Board</a></li>
      <li><a href="../../resources/">Resource Centre</a></li><li><a href="../../contact/">Contact</a></li></ul></nav>
    <nav aria-label="Footer — governance"><h2 class="foot-h">Governance</h2><ul>
      <li><a href="../../governance/">Ethics &amp; Governance</a></li>
      <li><a href="../../ethics-charter/">Ethics Charter</a></li>
      <li><a href="../../faq/">FAQ</a></li>
      <li><a href="../../privacy/">Privacy Policy</a></li><li><a href="../../terms/">Terms of Use</a></li></ul></nav>
  </div>
  <div class="wrap foot-base">
    <p>© <span id="yr">2026</span> Gurjas Evidence and Policy Analytics. All rights reserved. Original content, research and tools; text and code may not be copied or reproduced without permission.</p>
    <p>Our claims are built to be checked. Citations, review record and metrics link to independent third-party sources — <a href="https://orcid.org/0000-0003-0337-7885" rel="noopener">ORCID</a>, <a href="https://scholar.google.com/citations?user=d8Kd4ywAAAAJ" rel="noopener">Google Scholar</a> and <a href="https://www.webofscience.com/wos/author/record/IQW-3142-2023" rel="noopener">Web of Science</a> — that only the named author can hold. Advisors serve in a non-executive, voluntary capacity; affiliations are for identification only and do not imply endorsement.</p>
  </div>
</footer>'''

def build(a):
    slug=a["slug"]; url="https://gurjas.org/insights/%s/"%slug
    toc=re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', a["body"], re.S)
    toc_html="".join('\n        <li><a href="#%s">%s</a></li>'%(i,re.sub("<[^>]+>","",t).strip()) for i,t in toc)
    bc='{"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://gurjas.org/"}, {"@type": "ListItem", "position": 2, "name": "Insights", "item": "https://gurjas.org/insights/"}, {"@type": "ListItem", "position": 3, "name": %s, "item": %s}]}'%(json.dumps(a["breadcrumb"]), json.dumps(url))
    art={"@context":"https://schema.org","@type":"Article","headline":a["headline"],"datePublished":a["date_iso"],"dateModified":a["date_iso"],"author":{"@type":"Person","name":"Dr. Jaskirat Singh","url":"https://gurjas.org/people/#jaskirat-singh","sameAs":["https://orcid.org/0000-0003-0337-7885","https://scholar.google.com/citations?user=d8Kd4ywAAAAJ","https://www.webofscience.com/wos/author/record/IQW-3142-2023"]},"publisher":{"@id":"https://gurjas.org/#org"},"mainEntityOfPage":url,"description":a["schema_desc"]}
    if a.get("ispartof"): art["isPartOf"]={"@type":"Article","name":a["ispartof"][0],"url":a["ispartof"][1]}
    faqs=a.get("faqs",[])
    faq_ld=""; faq_vis=""
    if faqs:
        faq_ld='\n<script type="application/ld+json">'+json.dumps({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":ans}} for q,ans in faqs]})+'</script>'
        faq_vis='\n    <h2 id="faq">Frequently asked questions</h2>\n'+"\n".join('    <h3>%s</h3>\n    <p>%s</p>'%(_h.escape(q, quote=False), ans) for q,ans in faqs)
    title=_h.escape(a["title"]); desc=_h.escape(a["desc"])
    P=('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    '<!-- Analytics: lazy-loaded on first interaction or after 4s (performance + privacy) -->\n<script>(function(){var L=false;function load(){if(L)return;L=true;var g=document.createElement("script");g.async=1;g.src="https://www.googletagmanager.com/gtag/js?id=G-P95TY2K8F3";document.head.appendChild(g);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag("js",new Date());gtag("config","G-P95TY2K8F3");(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","xl7zo5h687");}var E=["scroll","mousemove","touchstart","keydown","click","pointerdown"];function fire(){E.forEach(function(e){window.removeEventListener(e,fire);});load();}E.forEach(function(e){window.addEventListener(e,fire,{passive:true});});setTimeout(load,4000);})();</script>\n'
    '<title>%s | Gurjas</title>\n<meta name="description" content="%s">\n'
    '<link rel="canonical" href="%s">\n<meta name="author" content="Gurjas Evidence and Policy Analytics">\n'
    '<meta name="robots" content="index, follow, max-image-preview:large">\n<meta name="theme-color" content="#041226">\n'
    '<meta property="og:type" content="article">\n<meta property="og:site_name" content="Gurjas Evidence and Policy Analytics">\n'
    '<meta property="og:title" content="%s | Gurjas">\n<meta property="og:description" content="%s">\n'
    '<meta property="og:url" content="%s">\n<meta property="og:image" content="https://gurjas.org/assets/og-preview.png">\n'
    '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:locale" content="en_IN">\n'
    '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="%s | Gurjas">\n'
    '<meta name="twitter:description" content="%s">\n<meta name="twitter:image" content="https://gurjas.org/assets/og-preview.png">\n'
    '<link rel="icon" href="../../favicon.ico" sizes="32x32">\n<link rel="icon" href="../../assets/favicon.png" type="image/png">\n'
    '<link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png">\n<link rel="manifest" href="../../site.webmanifest">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,320;0,9..144,340;0,9..144,420;0,9..144,450;0,9..144,550;1,9..144,320;1,9..144,380;1,9..144,450&family=Newsreader:ital,wght@1,300..600&family=Spline+Sans+Mono:wght@400;500;700&display=swap">\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,320;0,9..144,340;0,9..144,420;0,9..144,450;0,9..144,550;1,9..144,320;1,9..144,380;1,9..144,450&family=Newsreader:ital,wght@1,300..600&family=Spline+Sans+Mono:wght@400;500;700&display=swap" media="print" onload="this.media=&#39;all&#39;">\n'
    '<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,320;0,9..144,340;0,9..144,420;0,9..144,450;0,9..144,550;1,9..144,320;1,9..144,380;1,9..144,450&family=Newsreader:ital,wght@1,300..600&family=Spline+Sans+Mono:wght@400;500;700&display=swap"></noscript>\n'
    '<link rel="preload" as="style" href="../../style.css?v=12">\n<link rel="stylesheet" href="../../style.css?v=12">\n'
    '<script type="application/ld+json">%s</script>\n'
    '<script type="application/ld+json">%s</script>%s\n</head>\n<body>\n%s\n<main id="main">\n'
    '<div class="hero">\n  <div class="wrap">\n    <span class="eyebrow">%s</span>\n    <h1>%s</h1>\n'
    '    <p class="lede">%s</p>\n    <p class="byline">By <a href="../../people/#jaskirat-singh">Dr. Jaskirat Singh</a> · %s</p>\n  </div>\n</div>\n\n'
    '<section>\n  <div class="wrap prose" style="max-width:52em">\n'
    '    <nav class="toc" aria-labelledby="toc-h">\n      <p class="toc-h" id="toc-h">On this page</p>\n      <ol>%s%s\n      </ol>\n    </nav>\n\n'
    '%s\n%s\n%s\n  </div>\n</section>\n\n</main>\n%s\n<script src="../../script.js?v=10" defer></script>\n</body>\n</html>\n')
    faq_toc='\n        <li><a href="#faq">Frequently asked questions</a></li>' if faqs else ''
    g='{"@context": "https://schema.org", "@graph": [%s, %s]}'%(ORG_GRAPH, bc)
    out=P%(title,desc,url,title,desc,url,title,desc,g,json.dumps(art),faq_ld,NAV,
           a["eyebrow"],a["h1"],a["lede"],a["byline"],toc_html,faq_toc,
           a["body"], a["cta"], faq_vis+"\n\n    "+a["src"], FOOTER)
    d="insights/%s"%slug; os.makedirs(d,exist_ok=True)
    open(d+"/index.html","w").write(out)
    wc=len(re.sub("<[^>]+>"," ",a["body"]).split())
    return slug, wc

if __name__=="__main__":
    import articles_data as A
    for a in A.ARTICLES:
        s,wc=build(a); print("built insights/%s/ (~%d body words)"%(s,wc))
