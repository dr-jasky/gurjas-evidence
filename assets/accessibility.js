/* Audited accessibility corrections for enhanced interfaces.
   This script runs after script.js and does not create new interactions. */
(function () {
  "use strict";

  document.querySelectorAll("[data-evidence-dashboard] .evidence-figure").forEach(function (figure) {
    figure.setAttribute("tabindex", "0");
    figure.setAttribute(
      "aria-label",
      "Evidence diagram. On narrow screens, use horizontal scrolling to inspect the full figure."
    );
  });

  document.querySelectorAll("[data-engagement-pipeline] .engagement-track").forEach(function (track) {
    Array.prototype.slice.call(track.children).forEach(function (item) {
      item.setAttribute("role", "presentation");
    });
  });
})();
