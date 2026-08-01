/* Consent-safe route analytics for the international advisory network. */
(function () {
  "use strict";

  function track(name, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, params || {});
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-advisory-link][href]");
    if (!link) return;
    var destination;
    try { destination = new URL(link.href, location.href).pathname; }
    catch (error) { destination = link.getAttribute("href") || ""; }
    track("advisory_network_click", {
      origin_path: location.pathname,
      destination_path: destination,
      destination_kind: link.getAttribute("data-advisory-destination") || "board"
    });
  });
})();
