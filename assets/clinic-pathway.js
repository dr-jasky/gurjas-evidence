/* Visitor-facing navigation for the hosted institutional clinic.
   The clinic remains a bounded entry format under research-integrity advisory,
   not a fifth flagship service or an institutional partnership claim. */
(function () {
  "use strict";

  function servicesDirectoryPathway() {
    if (window.location.pathname.replace(/\/+$/, "") !== "/services") return;
    var main = document.getElementById("main");
    var priority = main && main.querySelector(".services-priority");
    if (!main || !priority || main.querySelector("[data-institutional-clinic-pathway]")) return;

    var section = document.createElement("section");
    section.className = "offer-section";
    section.setAttribute("aria-labelledby", "institutional-clinics-title");
    section.setAttribute("data-institutional-clinic-pathway", "");
    section.innerHTML = [
      '<div class="wrap offer-two-col">',
      '  <div>',
      '    <span class="eyebrow">Institutional clinics &amp; capacity building</span>',
      '    <h2 id="institutional-clinics-title">A focused first step for faculty and research systems.</h2>',
      '    <p class="lede">Begin with a practical 75–90-minute session before commissioning a wider diagnostic. The clinic is designed for faculty groups, doctoral cells, research offices, librarians, IQAC teams and professional associations.</p>',
      '  </div>',
      '  <a class="priority-offer-card" href="/services/institutional-research-integrity-clinic/">',
      '    <span class="tag">75–90 minutes · online or in person</span>',
      '    <h3>Hosted Institutional Research Integrity Clinic</h3>',
      '    <p>Work through journal and reference verification, authorship, responsible AI use, data handling, correction procedures and a practical institutional action plan.</p>',
      '    <span class="num">Checklist · risk discussion · action plan</span>',
      '    <span class="go" aria-hidden="true">→</span>',
      '  </a>',
      '</div>'
    ].join("\n");
    priority.insertAdjacentElement("afterend", section);
  }

  function researchIntegrityPathway() {
    if (window.location.pathname.replace(/\/+$/, "") !== "/services/research-integrity") return;
    var main = document.getElementById("main");
    var finalSection = main && main.querySelector(".offer-final");
    if (!main || !finalSection || main.querySelector("[data-institutional-clinic-pathway]")) return;

    var section = document.createElement("section");
    section.className = "offer-section offer-section-alt";
    section.setAttribute("aria-labelledby", "integrity-clinic-title");
    section.setAttribute("data-institutional-clinic-pathway", "");
    section.innerHTML = [
      '<div class="wrap offer-two-col">',
      '  <div>',
      '    <span class="eyebrow">Shorter institutional format</span>',
      '    <h2 id="integrity-clinic-title">Need a focused clinic before a full diagnostic?</h2>',
      '    <p class="lede">The hosted clinic gives faculty and institutional teams a shared working language, a structured self-assessment and a practical action list without presenting the session as certification or a misconduct investigation.</p>',
      '  </div>',
      '  <div class="offer-risk">',
      '    <span class="offer-label">Hosted research-integrity clinic</span>',
      '    <p>A 75–90-minute online or in-person session covering publication verification, authorship, responsible AI use, evidence handling and correction controls.</p>',
      '    <div class="cta-row"><a class="btn btn-solid" href="/services/institutional-research-integrity-clinic/">Explore the clinic →</a></div>',
      '  </div>',
      '</div>'
    ].join("\n");
    finalSection.insertAdjacentElement("beforebegin", section);
  }

  servicesDirectoryPathway();
  researchIntegrityPathway();
})();
