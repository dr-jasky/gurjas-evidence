// Gurjas v3 — minimal, dependency-free
(function () {
  "use strict";
  var btn = document.querySelector(".nav-btn"),
      nav = document.getElementById("nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      }
    });
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

  // Count-up tickers (respect reduced-motion)
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function runTick(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    var to = parseFloat(el.getAttribute("data-to")) || 0;
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (reduceMotion) { el.textContent = to.toFixed(dec); return; }
    var t0 = null, dur = 1200;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step); else el.textContent = to.toFixed(dec);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          en.target.querySelectorAll && en.target.querySelectorAll(".tick").forEach(runTick);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".card, .stat, .person, .flow-step, .pillar, .vignette, .cred-item, .bento-cell")
      .forEach(function (el) { el.classList.add("rv"); io.observe(el); });
  } else {
    document.querySelectorAll(".tick").forEach(runTick);
  }

  // Grant Deadline Tracker — client-side filtering
  var gt = document.getElementById("grantTable");
  var gf = document.getElementById("grantFilters");
  if (gt && gf) {
    var rows = Array.prototype.slice.call(gt.tBodies[0].rows);
    var state = { funder: "all", status: "all" };
    var countEl = document.getElementById("grantCount");
    var emptyEl = document.getElementById("grantEmpty");
    function apply() {
      var shown = 0;
      rows.forEach(function (r) {
        var ok = (state.funder === "all" || r.getAttribute("data-funder") === state.funder) &&
                 (state.status === "all" || r.getAttribute("data-status") === state.status);
        r.hidden = !ok;
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = shown + (shown === 1 ? " call shown" : " calls shown");
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }
    gf.addEventListener("click", function (e) {
      var b = e.target.closest(".gt-chip");
      if (!b) return;
      var dim = b.getAttribute("data-dim");
      state[dim] = b.getAttribute("data-val");
      gf.querySelectorAll('.gt-chip[data-dim="' + dim + '"]').forEach(function (c) {
        c.setAttribute("aria-pressed", String(c === b));
      });
      apply();
    });
    var reset = document.getElementById("grantReset");
    if (reset) reset.addEventListener("click", function () {
      state = { funder: "all", status: "all" };
      gf.querySelectorAll(".gt-chip").forEach(function (c) {
        c.setAttribute("aria-pressed", String(c.getAttribute("data-val") === "all"));
      });
      apply();
    });
    apply();
  }
})();

/* ═══════════ Gurjas concierge + contact form (2026) ═══════════ */
(function () {
  "use strict";
  var WA = "https://wa.me/919877295825";
  var TEL = "tel:+919877295825";
  var base = location.pathname.split("/").filter(Boolean);
  // depth-aware root so links work from any page
  var isFile = location.protocol === "file:";
  function P(p){ return p; } // pages use root-relative; server rewrites fine on gurjas.org

  /* ---------- Concierge chat ---------- */
  var fab = document.createElement("button");
  fab.className = "gc-fab"; fab.type = "button";
  fab.setAttribute("aria-label", "Open the Gurjas assistant");
  fab.innerHTML = '<span class="dot"></span><span class="lbl">How can I help?</span>';
  document.body.appendChild(fab);

  var panel = document.createElement("div");
  panel.className = "gc-panel"; panel.setAttribute("role","dialog");
  panel.setAttribute("aria-label","Gurjas assistant"); panel.hidden = false;
  panel.innerHTML =
    '<div class="gc-head"><div class="av">G</div><div><b>Gurjas Assistant</b>'
    + '<small>Typically replies in minutes</small></div>'
    + '<button class="gc-x" type="button" aria-label="Close">&times;</button></div>'
    + '<div class="gc-body" id="gcBody"></div>'
    + '<div class="gc-chips" id="gcChips"></div>'
    + '<form class="gc-foot" id="gcForm" autocomplete="off"><input id="gcIn" type="text" '
    + 'placeholder="Ask about services, tools, publications…" aria-label="Type your question">'
    + '<button class="gc-send" type="submit" aria-label="Send">&#8593;</button></form>'
    + '<div class="gc-foot-note">Guided assistant · for a person, use email or WhatsApp</div>';
  document.body.appendChild(panel);

  var body = panel.querySelector("#gcBody"),
      chipWrap = panel.querySelector("#gcChips"),
      form = panel.querySelector("#gcForm"),
      input = panel.querySelector("#gcIn");

  function bot(html){ var d=document.createElement("div"); d.className="gc-msg gc-bot"; d.innerHTML=html; body.appendChild(d); body.scrollTop=body.scrollHeight; }
  function user(t){ var d=document.createElement("div"); d.className="gc-msg gc-user"; d.textContent=t; body.appendChild(d); body.scrollTop=body.scrollHeight; }
  function chips(list){ chipWrap.innerHTML=""; list.forEach(function(c){ var b=document.createElement("button"); b.className="gc-chip"; b.type="button"; b.textContent=c.t; b.addEventListener("click",function(){ user(c.t); if(c.r) c.r(); }); chipWrap.appendChild(b); }); }

  var DEFAULT_CHIPS = [
    {t:"Explore services", r:function(){ answer("services"); }},
    {t:"Free research tools", r:function(){ answer("tools"); }},
    {t:"Check a journal", r:function(){ answer("checker"); }},
    {t:"See publications", r:function(){ answer("pubs"); }},
    {t:"Book a consultation", r:function(){ answer("contact"); }},
    {t:"WhatsApp us", r:function(){ answer("whatsapp"); }}
  ];

  var K = {
    services:{k:["service","consult","advisory","evaluation","analytics","naac","iqac","doctoral","phd support","ngo","csr","help with"],
      a:'We offer research consulting, policy evaluation, impact analytics, institutional (NAAC/IQAC) advisory, doctoral methodology support and NGO/CSR research. See the full breakdown on <a href="/services/">Services</a>.'},
    tools:{k:["tool","calculator","sample size","reliability","validity","timeline","grant","sem","free"],
      a:'Six free, citation-ready tools run entirely in your browser — predatory journal checker, NAAC readiness scorecard, SEM sample-size calculator, reliability &amp; validity kit, PhD timeline planner and grant tracker. Open the <a href="/tools/">Tools hub</a>.'},
    checker:{k:["predatory","journal","checker","legit","scopus","doaj","ugc-care","fake journal","verify journal"],
      a:'The <a href="/tools/predatory-journal-checker/">Predatory Journal Risk Checker</a> runs guided verification against Scopus, DOAJ, UGC-CARE and Web of Science plus a twelve-signal red-flag assessment — free, no sign-up.'},
    pubs:{k:["publication","paper","research record","citation","scholar","ssrn","author","dr. jaskirat","jaskirat"],
      a:'Our record is the peer-reviewed scholarship of Dr. Jaskirat Singh — 10 journal articles and 4 book chapters in Cities, Technological Forecasting &amp; Social Change and other Scopus/WoS journals, 202 Google Scholar citations. See <a href="/publications/">Publications</a>.'},
    methods:{k:["method","sem","fsqca","nca","ardl","garch","econometric","statistic","analysis","prisma"],
      a:'Methods include SEM/PLS-SEM, fsQCA and NCA, ARDL and GARCH-family econometrics, and PRISMA-style synthesis. Detail on <a href="/methods/">Methodology</a>.'},
    contact:{k:["contact","consult","book","call","talk","reach","quote","scope","hire","engage","start"],
      a:'Happy to help. You can <a href="/contact/">open the contact form</a>, WhatsApp us at <a href="'+WA+'" rel="noopener">+91 98772 95825</a>, or email <a href="mailto:gurjasevidence@gmail.com">gurjasevidence@gmail.com</a>. Share your objective, data status, timeline and expected output for a tailored scope.'},
    whatsapp:{k:["whatsapp","wa","message","chat now","phone","number","mobile"],
      a:'Reach us directly on WhatsApp: <a href="'+WA+'" rel="noopener">+91 98772 95825</a> (or call <a href="'+TEL+'">the same number</a>). We usually respond within minutes during working hours.'},
    price:{k:["price","cost","fee","charge","how much","pricing","budget"],
      a:'Engagements are scoped to the problem, not sold as fixed packages — pricing follows a written scope. Tell us what you need on <a href="/contact/">Contact</a> and we will propose a suitable scope and next steps.'},
    about:{k:["about","who","gurjas","company","team","people","credible","trust"],
      a:'Gurjas Evidence &amp; Policy Analytics is an independent, women-led research practice; its methodology is led by Dr. Jaskirat Singh, an ICSSR Postdoctoral Fellow and Springer Nature Reviewing Editor. More on <a href="/about/">About</a> and <a href="/people/">People</a>.'}
  };

  function answer(key){
    var e = K[key];
    if(e){ setTimeout(function(){ bot(e.a); }, 220); }
    setTimeout(function(){ chips(DEFAULT_CHIPS); }, 240);
  }
  function route(text){
    var q = text.toLowerCase(), best=null, score=0;
    Object.keys(K).forEach(function(key){
      var s=0; K[key].k.forEach(function(w){ if(q.indexOf(w)>-1) s++; });
      if(s>score){ score=s; best=key; }
    });
    if(best && score>0){ answer(best); }
    else { setTimeout(function(){ bot('I can point you to the right place — try one of these, or reach a person on <a href="'+WA+'" rel="noopener">WhatsApp</a> or <a href="/contact/">the contact form</a>.'); chips(DEFAULT_CHIPS); }, 220); }
  }

  var greeted=false;
  function greet(){ if(greeted) return; greeted=true;
    bot("Hello 👋 I'm the Gurjas assistant. I can help you find services, free research tools, our publications, or a way to reach the team. What are you looking for?");
    chips(DEFAULT_CHIPS);
  }
  function open(){ panel.classList.add("open"); fab.style.display="none"; greet(); setTimeout(function(){ input.focus(); },260); }
  function close(){ panel.classList.remove("open"); fab.style.display=""; }
  fab.addEventListener("click", open);
  panel.querySelector(".gc-x").addEventListener("click", close);
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && panel.classList.contains("open")) close(); });
  form.addEventListener("submit", function(e){ e.preventDefault(); var v=input.value.trim(); if(!v) return; user(v); input.value=""; route(v); });

  /* ---------- Contact form (FormSubmit: AJAX with native-POST fallback) ---------- */
  var cf = document.getElementById("gcContactForm");
  if (cf) {
    var status = cf.querySelector(".form-status");
    if (/[?&]sent=1/.test(location.search) && status) {
      status.className = "form-status ok";
      status.textContent = "Thank you \u2014 your message has been sent. We usually respond within two working days.";
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
    }
    cf.addEventListener("submit", function (e) {
      var honey = cf.querySelector('[name="_honey"]');
      if (honey && honey.value) { e.preventDefault(); return; }
      e.preventDefault();
      var btn = cf.querySelector('button[type="submit"]');
      var data = new FormData(cf);
      btn.disabled = true; var old = btn.textContent; btn.textContent = "Sending\u2026";
      if (status) status.className = "form-status";
      fetch("https://formsubmit.co/ajax/gurjasevidence@gmail.com", {
        method: "POST", headers: { "Accept": "application/json" }, body: data
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && (j.success === true || j.success === "true")) {
          if (status) { status.className = "form-status ok";
            status.textContent = "Thank you \u2014 your message has been sent. We usually respond within two working days."; }
          cf.reset(); btn.disabled = false; btn.textContent = old;
        } else { throw new Error("needs native"); }
      }).catch(function () {
        if (status) { status.className = "form-status"; status.textContent = "Sending your message\u2026"; }
        cf.submit();
      });
    });
  }
})();