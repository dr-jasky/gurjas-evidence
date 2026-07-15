// Gurjas v3 — minimal, dependency-free
(function () {
  "use strict";
  var btn = document.querySelector(".nav-btn"),
      nav = document.getElementById("nav");
  function setMenuState(open, refocus) {
    if (!btn || !nav) return;
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", (open ? "Close" : "Open") + " primary navigation");
    btn.textContent = open ? "Close" : "Menu";
    if (!open) {
      Array.prototype.slice.call(nav.querySelectorAll(".has-sub.open")).forEach(function (item) {
        item.classList.remove("open");
        var subButton = item.querySelector(".sub-btn");
        if (subButton) subButton.setAttribute("aria-expanded", "false");
      });
    }
    if (refocus) btn.focus();
  }
  if (btn && nav) {
    btn.addEventListener("click", function () {
      setMenuState(!nav.classList.contains("open"), false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        setMenuState(false, true);
      }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && e.target !== btn && !nav.contains(e.target)) {
        setMenuState(false, false);
      }
    });
    var desktopNav = window.matchMedia("(min-width: 961px)");
    function resetMenuAtDesktop(e) {
      if (e.matches && nav.classList.contains("open")) setMenuState(false, false);
    }
    if (desktopNav.addEventListener) desktopNav.addEventListener("change", resetMenuAtDesktop);
    else desktopNav.addListener(resetMenuAtDesktop);
  }
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = String(new Date().getFullYear());

  // "Our Work" dropdown — click/tap + keyboard; hover handled in CSS
  var subs = Array.prototype.slice.call(document.querySelectorAll(".site-nav .has-sub"));
  function closeSub(li, refocus) {
    var b = li.querySelector(".sub-btn");
    li.classList.remove("open");
    if (b) { b.setAttribute("aria-expanded", "false"); if (refocus) b.focus(); }
  }
  subs.forEach(function (li) {
    var sub = li.querySelector(".sub-btn");
    if (!sub) return;
    sub.addEventListener("click", function () {
      var open = li.classList.toggle("open");
      sub.setAttribute("aria-expanded", String(open));
    });
  });
  if (subs.length) {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      subs.forEach(function (li) {
        if (li.classList.contains("open")) closeSub(li, li.contains(document.activeElement));
      });
    });
    document.addEventListener("click", function (e) {
      subs.forEach(function (li) {
        if (li.classList.contains("open") && !li.contains(e.target)) closeSub(li, false);
      });
    });
  }

  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (!target || el._counted) return;
    el._counted = true;
    var t0 = performance.now(), dur = 1100;
    function step(t) {
      var p = Math.min((t - t0) / dur, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          var counter = en.target.querySelector("[data-count]");
          if (counter) countUp(counter);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(
      ".card, .stat, .person, .flow-step, .pillar, .vignette, .cred-item, " +
      ".home-audience, .home-item, .home-step, .home-insight, .home-row"
    ).forEach(function (el) {
      el.classList.add("rv"); io.observe(el);
    });
  } else {
    document.querySelectorAll("[data-count]").forEach(countUp);
  }
})();

/* ═══════════ Homepage evidence-field background (gold data-points, drifting) ═══════════ */
(function () {
  "use strict";
  var canvas = document.querySelector(".evidence-field");
  if (!canvas || !canvas.getContext) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 820px)").matches;
  var ctx = canvas.getContext("2d");
  var w, h, dpr, pts;
  var LINK = 150;

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(isMobile ? 60 : 150, Math.max(30, (w * h) / (isMobile ? 26000 : 14500))));
    pts = Array.from({ length: count }, function () {
      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
        r: 0.8 + Math.random() * 1.8, tw: Math.random() * Math.PI * 2
      };
    });
  }

  function link(a, b, alphaMax) {
    var dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
    return d2 < LINK * LINK ? (1 - Math.sqrt(d2) / LINK) * alphaMax : 0;
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var a = link(pts[i], pts[j], 0.15);
        if (a > 0) {
          ctx.strokeStyle = "rgba(217,185,104," + a.toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }
    pts.forEach(function (p) {
      var tw = 0.42 + 0.32 * Math.sin(t / 1400 + p.tw);
      ctx.fillStyle = "rgba(217,185,104," + tw.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
    });
  }

  var lights = [];
  function buildLights() { lights = []; }

  function drawLights(t) {
    lights.forEach(function (L) {
      L.ctx.clearRect(0, 0, L.w, L.h);
      for (var i = 0; i < L.pts.length; i++) {
        for (var j = i + 1; j < L.pts.length; j++) {
          var dx = L.pts[i].x - L.pts[j].x, dy = L.pts[i].y - L.pts[j].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            var a = (1 - Math.sqrt(d2) / LINK) * 0.13;
            L.ctx.strokeStyle = "rgba(6,38,78," + a.toFixed(3) + ")";
            L.ctx.lineWidth = 1;
            L.ctx.beginPath();
            L.ctx.moveTo(L.pts[i].x, L.pts[i].y);
            L.ctx.lineTo(L.pts[j].x, L.pts[j].y);
            L.ctx.stroke();
          }
        }
      }
      L.pts.forEach(function (p) {
        var tw = 0.3 + 0.22 * Math.sin(t / 1400 + p.tw);
        L.ctx.fillStyle = "rgba(6,38,78," + tw.toFixed(3) + ")";
        L.ctx.beginPath();
        L.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        L.ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = L.w + 10; if (p.x > L.w + 10) p.x = -10;
        if (p.y < -10) p.y = L.h + 10; if (p.y > L.h + 10) p.y = -10;
      });
    });
  }

  build();
  buildLights();
  var raf;
  window.addEventListener("resize", function () { build(); buildLights(); });

  if (reduced) { draw(0); drawLights(0); return; }
  // Perf: start after first paint is settled; ~30fps on mobile; pause when hidden
  var FRAME = isMobile ? 33 : 16, last = 0, running = false;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < FRAME) return;
    last = t;
    draw(t); drawLights(t);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 300);
})();

/* ═══════════ Privacy consent, guided assistant + contact form (2026) ═══════════ */
(function () {
  "use strict";

  var CONSENT_KEY = "gurjas.analyticsConsent.v1";
  var GA_ID = "G-P95TY2K8F3";
  var CLARITY_ID = "xl7zo5h687";
  var analyticsLoaded = false;

  function consentChoice() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function loadAnalytics() {
    if (analyticsLoaded || consentChoice() !== "granted") return;
    analyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });

    var google = document.createElement("script");
    google.async = true;
    google.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(google);

    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = true; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  function removeConsentPanel() {
    var existing = document.getElementById("gurjas-consent");
    if (existing) existing.remove();
  }

  function showConsentPanel(force) {
    if (!force && consentChoice()) return;
    removeConsentPanel();

    var panel = document.createElement("section");
    panel.id = "gurjas-consent";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", "gurjas-consent-title");
    panel.setAttribute("aria-describedby", "gurjas-consent-desc");
    panel.style.cssText = "position:fixed;z-index:10000;left:clamp(12px,3vw,32px);right:clamp(12px,3vw,32px);bottom:clamp(12px,3vw,28px);max-width:760px;margin:auto;background:#fffdf8;color:#172033;border:1px solid #c8b16a;border-radius:8px;box-shadow:0 18px 60px rgba(4,18,38,.25);padding:18px 20px;font:14px/1.55 Archivo,system-ui,sans-serif";
    panel.innerHTML = '<h2 id="gurjas-consent-title" style="font:600 18px/1.25 Fraunces,Georgia,serif;margin:0 0 6px;color:#06264e">Your analytics choice</h2>'
      + '<p id="gurjas-consent-desc" style="margin:0 0 14px">The site works without analytics. Google Analytics 4 and Microsoft Clarity load only if you accept. Tool lookups are disclosed beside each tool and are separate from this choice. <a href="/privacy/">Privacy details</a>.</p>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" data-consent="granted" style="border:1px solid #06264e;background:#06264e;color:#fff;border-radius:4px;padding:9px 14px;font-weight:600;cursor:pointer">Accept analytics</button>'
      + '<button type="button" data-consent="denied" style="border:1px solid #687285;background:#fff;color:#172033;border-radius:4px;padding:9px 14px;font-weight:600;cursor:pointer">Decline</button></div>';
    document.body.appendChild(panel);

    panel.addEventListener("click", function (event) {
      var button = event.target.closest("[data-consent]");
      if (!button) return;
      var value = button.getAttribute("data-consent");
      saveChoice(value);
      removeConsentPanel();
      if (value === "granted") loadAnalytics();
    });
    var first = panel.querySelector("button");
    if (force && first) first.focus();
  }

  function addPreferencesControl() {
    var base = document.querySelector(".foot-base");
    if (!base) return;
    var button = base.querySelector("[data-cookie-preferences]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "cookie-preferences";
      button.setAttribute("data-cookie-preferences", "");
      button.textContent = "Cookie preferences";
      var p = document.createElement("p");
      p.appendChild(button);
      base.appendChild(p);
    }
    button.id = "gurjas-cookie-preferences";
    if (button.getAttribute("data-preferences-ready") === "true") return;
    button.setAttribute("data-preferences-ready", "true");
    button.addEventListener("click", function () { showConsentPanel(true); });
  }

  window.GurjasPrivacy = {
    getAnalyticsChoice: consentChoice,
    openPreferences: function () { showConsentPanel(true); }
  };

  if (consentChoice() === "granted") loadAnalytics();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { showConsentPanel(false); addPreferencesControl(); });
  } else {
    showConsentPanel(false); addPreferencesControl();
  }
})();

(function () {
  "use strict";
  var WA = "https://wa.me/919877295825";
  var TEL = "tel:+919877295825";
  var FACTS = {
    toolCount: 8,
    metrics: { journalArticles: 10, bookChapters: 4, googleScholarCitations: 202 },
    contact: { responseSla: "usually within two working days" },
    pricing: { summary: "Indicative engagement ranges are published on the Services page; the exact fee is fixed in a written scope." }
  };

  function factValue(data, path) {
    return path.split(".").reduce(function (value, key) {
      return value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
    }, data);
  }

  function hydrateFacts(data) {
    document.querySelectorAll("[data-fact]").forEach(function (element) {
      var value = factValue(data, element.getAttribute("data-fact"));
      if (value === undefined || value === null || value === "") return;
      element.textContent = String(value) + (element.getAttribute("data-fact-suffix") || "");
    });
  }

  fetch("/data/site-facts.json", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
    .then(function (data) { FACTS = data; hydrateFacts(data); })
    .catch(function () {});

  var guideButton = document.querySelector("[data-site-guide]");
  if (!guideButton) {
    var guideList = document.querySelector(".site-nav > ul");
    if (guideList) {
      var guideItem = document.createElement("li");
      guideItem.className = "nav-guide-item";
      guideItem.innerHTML = '<button class="nav-guide" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="gurjas-site-guide" data-site-guide><span aria-hidden="true"></span>Site guide</button>';
      var contactItem = guideList.querySelector(".nav-cta");
      guideList.insertBefore(guideItem, contactItem ? contactItem.parentElement : null);
      guideButton = guideItem.querySelector("[data-site-guide]");
    }
  }

  var panel = document.createElement("div");
  panel.id = "gurjas-site-guide";
  panel.className = "gc-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "gcTitle");
  panel.hidden = true;
  panel.innerHTML = '<div class="gc-head"><div class="av">G</div><div><b id="gcTitle">Gurjas site guide</b>'
    + '<small>Site navigation, not live chat</small></div>'
    + '<button class="gc-x" type="button" aria-label="Close site guide">&times;</button></div>'
    + '<div class="gc-body" id="gcBody" aria-live="polite"></div>'
    + '<div class="gc-chips" id="gcChips"></div>'
    + '<form class="gc-foot" id="gcForm" autocomplete="off"><label class="sr-only" for="gcIn">Ask about services, tools or publications</label><input id="gcIn" type="text" '
    + 'placeholder="Ask about services, tools, publications…" aria-label="Ask about services, tools or publications">'
    + '<button class="gc-send" type="submit" aria-label="Send question">&#8593;</button></form>'
    + '<div class="gc-foot-note">Automated site guide · for a person, use email or WhatsApp</div>';
  document.body.appendChild(panel);

  var body = panel.querySelector("#gcBody");
  var chipWrap = panel.querySelector("#gcChips");
  var form = panel.querySelector("#gcForm");
  var input = panel.querySelector("#gcIn");
  var closeButton = panel.querySelector(".gc-x");
  var lastFocus = null;

  function bot(html) { var d = document.createElement("div"); d.className = "gc-msg gc-bot"; d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; }
  function user(text) { var d = document.createElement("div"); d.className = "gc-msg gc-user"; d.textContent = text; body.appendChild(d); body.scrollTop = body.scrollHeight; }
  function chips(list) {
    chipWrap.innerHTML = "";
    list.forEach(function (choice) {
      var b = document.createElement("button"); b.className = "gc-chip"; b.type = "button"; b.textContent = choice.t;
      b.addEventListener("click", function () { user(choice.t); choice.r(); });
      chipWrap.appendChild(b);
    });
  }

  var DEFAULT_CHIPS = [
    { t: "Explore services", r: function () { answer("services"); } },
    { t: "Free research tools", r: function () { answer("tools"); } },
    { t: "Check a journal", r: function () { answer("checker"); } },
    { t: "See publications", r: function () { answer("pubs"); } },
    { t: "Pricing guidance", r: function () { answer("price"); } },
    { t: "Contact a person", r: function () { answer("contact"); } }
  ];

  function knowledge() {
    var metrics = FACTS.metrics || {};
    var contact = FACTS.contact || {};
    var pricing = FACTS.pricing || {};
    return {
      services: { k: ["service", "consult", "advisory", "evaluation", "analytics", "naac", "iqac", "doctoral", "ngo", "csr", "help with"], a: 'Gurjas provides research consulting, policy evaluation, impact analytics, institutional (NAAC/IQAC) advisory, doctoral methodology support and NGO/CSR research. See the current scope and indicative ranges on <a href="/services/">Services</a>.' },
      tools: { k: ["tool", "calculator", "sample size", "reliability", "validity", "timeline", "grant", "sem", "free"], a: 'There are ' + (FACTS.toolCount || 8) + ' free tools. Five process inputs locally; Journal Finder, Predatory Journal Checker and APC Checker query named public databases only after you submit a search. Open the <a href="/tools/">Tools hub</a>.' },
      checker: { k: ["predatory", "journal", "checker", "legit", "scopus", "doaj", "fake journal", "verify journal"], a: 'The <a href="/tools/predatory-journal-checker/">Predatory Journal Risk Checker</a> reports evidence signals from public databases and local reference files. It does not maintain a blacklist or issue a definitive verdict.' },
      pubs: { k: ["publication", "paper", "research record", "citation", "scholar", "author", "jaskirat"], a: 'The published record currently lists ' + (metrics.journalArticles || 10) + ' journal articles and ' + (metrics.bookChapters || 4) + ' book chapters, with a snapshot of ' + (metrics.googleScholarCitations || 202) + ' Google Scholar citations. Verify the sources on <a href="/publications/">Publications</a>.' },
      methods: { k: ["method", "sem", "fsqca", "nca", "ardl", "garch", "econometric", "statistic", "analysis", "prisma"], a: 'Methods include SEM/PLS-SEM, fsQCA and NCA, ARDL and GARCH-family econometrics, and PRISMA-style synthesis. See <a href="/methods/">Methodology</a>.' },
      contact: { k: ["contact", "consult", "book", "call", "talk", "reach", "quote", "scope", "hire", "engage", "start"], a: 'Use the <a href="/contact/">structured contact form</a>, email <a href="mailto:support@gurjas.org">support@gurjas.org</a>, or WhatsApp <a href="' + WA + '" rel="noopener">+91 98772 95825</a>. The published response target is ' + (contact.responseSla || "usually within two working days") + '.' },
      whatsapp: { k: ["whatsapp", "wa", "message", "phone", "number", "mobile"], a: 'WhatsApp: <a href="' + WA + '" rel="noopener">+91 98772 95825</a>; telephone: <a href="' + TEL + '">the same number</a>. This assistant is automated and cannot confirm live availability.' },
      price: { k: ["price", "cost", "fee", "charge", "how much", "pricing", "budget"], a: (pricing.summary || "Indicative engagement ranges are published on the Services page; the exact fee is fixed in a written scope.") + ' See <a href="/services/">Services</a>.' },
      about: { k: ["about", "who", "gurjas", "company", "team", "people", "credible", "trust"], a: 'Gurjas Evidence &amp; Policy Analytics is an independent, women-led research practice. Its scholarly credentials are linked to external profiles, while business-delivery evidence is presented separately. See <a href="/about/">About</a> and <a href="/people/">People</a>.' }
    };
  }

  function answer(key) {
    var item = knowledge()[key];
    if (item) setTimeout(function () { bot(item.a); }, 180);
    setTimeout(function () { chips(DEFAULT_CHIPS); }, 200);
  }

  function route(text) {
    var q = text.toLowerCase(); var best = null; var score = 0; var K = knowledge();
    Object.keys(K).forEach(function (key) {
      var s = 0; K[key].k.forEach(function (word) { if (q.indexOf(word) > -1) s += 1; });
      if (s > score) { score = s; best = key; }
    });
    if (best && score > 0) answer(best);
    else setTimeout(function () { bot('I can route you to the right page. Choose a topic below, or contact a person through <a href="/contact/">the form</a> or <a href="' + WA + '" rel="noopener">WhatsApp</a>.'); chips(DEFAULT_CHIPS); }, 180);
  }

  var greeted = false;
  function greet() {
    if (greeted) return; greeted = true;
    bot("Hello. I’m an automated guide to Gurjas services, tools and published evidence—not a live person. What are you looking for?");
    chips(DEFAULT_CHIPS);
  }

  function focusable() {
    return Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function (el) { return !el.hidden; });
  }

  function open() {
    lastFocus = guideButton;
    var primaryNav = document.getElementById("nav");
    var menuButton = document.querySelector(".nav-btn");
    if (primaryNav && primaryNav.classList.contains("open")) {
      if (menuButton) {
        menuButton.click();
        lastFocus = menuButton;
      } else {
        primaryNav.classList.remove("open");
      }
    }
    panel.hidden = false;
    panel.classList.add("open");
    guideButton.setAttribute("aria-expanded", "true");
    greet();
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    panel.classList.remove("open");
    panel.hidden = true;
    guideButton.setAttribute("aria-expanded", "false");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    else guideButton.focus();
  }

  if (guideButton) guideButton.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  document.addEventListener("keydown", function (event) {
    if (panel.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    var items = focusable(); if (!items.length) return;
    var first = items[0]; var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  form.addEventListener("submit", function (event) { event.preventDefault(); var value = input.value.trim(); if (!value) return; user(value); input.value = ""; route(value); });

  var cf = document.getElementById("gcContactForm");
  if (cf) {
    var status = cf.querySelector(".form-status");
    if (/[?&]sent=1/.test(location.search) && status) {
      status.className = "form-status ok";
      status.textContent = "Thank you — your message has been sent. We usually respond within two working days.";
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
    }

    cf.querySelectorAll("[required]").forEach(function (field) {
      field.addEventListener("invalid", function () { field.setAttribute("aria-invalid", "true"); });
      field.addEventListener("input", function () { if (field.checkValidity()) field.removeAttribute("aria-invalid"); });
      field.addEventListener("change", function () { if (field.checkValidity()) field.removeAttribute("aria-invalid"); });
    });

    cf.addEventListener("submit", function (event) {
      var honey = cf.querySelector('[name="_honey"]');
      if (honey && honey.value) { event.preventDefault(); return; }
      if (!cf.checkValidity()) {
        event.preventDefault();
        cf.reportValidity();
        var invalid = cf.querySelector(":invalid");
        if (invalid) invalid.focus();
        if (status) { status.className = "form-status error"; status.textContent = "Please complete the required fields before sending."; }
        return;
      }

      event.preventDefault();
      var button = cf.querySelector('button[type="submit"]');
      var data = new FormData(cf);
      var old = button.textContent;
      button.disabled = true; button.textContent = "Sending…";
      if (status) { status.className = "form-status"; status.textContent = "Sending securely…"; }

      fetch("https://formsubmit.co/ajax/support@gurjas.org", {
        method: "POST", headers: { Accept: "application/json" }, body: data
      }).then(function (response) {
        if (!response.ok) throw new Error("Form service unavailable");
        return response.json();
      }).then(function (result) {
        if (!(result && (result.success === true || result.success === "true"))) throw new Error("Form service rejected request");
        if (status) { status.className = "form-status ok"; status.textContent = "Thank you — your message has been sent. We usually respond within two working days."; }
        cf.reset();
      }).catch(function () {
        if (status) {
          status.className = "form-status error";
          status.innerHTML = 'The form could not be delivered. Please email <a href="mailto:support@gurjas.org">support@gurjas.org</a> or try again shortly.';
        }
      }).finally(function () {
        button.disabled = false; button.textContent = old;
      });
    });
  }
})();
