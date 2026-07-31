/* Consent-safe interaction measurement for verified capability evidence.
   No visitor identity, form content, research data or free text is read. */
(function () {
  "use strict";

  var CONSENT_KEY = "gurjas.analyticsConsent.v1";
  var ALLOWED_METRICS = {
    founder_projects: true,
    field_programmes: true,
    public_tools: true,
    open_repositories: true,
    principal_record: true
  };
  var ALLOWED_DESTINATIONS = {
    experience: true,
    tools: true,
    "proof-ledger": true,
    profile: true
  };

  function consentGranted() {
    if (window.GurjasPrivacy && typeof window.GurjasPrivacy.getAnalyticsChoice === "function") {
      return window.GurjasPrivacy.getAnalyticsChoice() === "granted";
    }
    try {
      return localStorage.getItem(CONSENT_KEY) === "granted";
    } catch (error) {
      return false;
    }
  }

  function safePath(href) {
    try {
      var url = new URL(href, location.href);
      return url.origin === location.origin ? url.pathname : null;
    } catch (error) {
      return null;
    }
  }

  function track(name, params) {
    if (!consentGranted()) return;
    if (typeof window.GurjasTrackEvent === "function") {
      window.GurjasTrackEvent(name, params);
      return;
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("[data-capability-link]");
    if (!link) return;

    var metricId = link.getAttribute("data-metric-id");
    var destinationType = link.getAttribute("data-destination-type");
    if (!ALLOWED_METRICS[metricId] || !ALLOWED_DESTINATIONS[destinationType]) return;

    track("capability_metric_click", {
      metric_id: metricId,
      destination_type: destinationType,
      source_path: location.pathname,
      destination_path: safePath(link.getAttribute("href"))
    });
  });
})();
