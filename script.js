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
  if ("IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".card, .stat, .person").forEach(function (el) {
      el.classList.add("rv"); io.observe(el);
    });
  }
})();
