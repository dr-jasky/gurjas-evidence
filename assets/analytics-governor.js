/* Gurjas analytics governor.
   Loaded before the shared site script so every legacy and current event passes
   through the same consent boundary, event registry and parameter allowlist. */
(function () {
  "use strict";

  var CONSENT_KEY = "gurjas.analyticsConsent.v1";
  var MAX_TOKEN_LENGTH = 64;
  var MAX_PATH_LENGTH = 160;

  var EVENT_SCHEMA = {
    campaign_landing: ["campaign_source", "campaign_medium", "campaign_name", "campaign_content", "campaign_term", "referrer_host", "landing_path"],
    library_view: ["library_surface", "origin_path"],
    library_entry_view: ["entry_slug", "origin_path"],
    tool_view: ["tool_slug", "origin_path"],
    tool_start: ["tool_slug"],
    tool_action: ["tool_slug", "action_type"],
    tool_complete: ["tool_slug"],
    tool_export: ["tool_slug", "export_type"],
    tool_evidence_open: ["tool_slug", "entry_slug", "destination_path"],
    library_to_practical: ["entry_slug", "destination_kind", "destination_slug", "destination_path"],
    service_view: ["service_slug"],
    service_cta_click: ["service_slug"],
    service_handoff: ["service_slug", "origin_path", "handoff_kind"],
    clinic_view: ["service_slug"],
    clinic_request: ["service_slug", "origin_path"],
    clinic_enquiry_success: ["service_slug", "origin_path", "handoff_kind", "campaign_source", "campaign_medium", "campaign_name"],
    contact_form_start: [],
    contact_form_submit: ["service_slug"],
    contact_form_success: ["service_slug", "origin_path", "handoff_kind", "campaign_source", "campaign_medium", "campaign_name"],
    contact_form_failure: ["service_slug", "origin_path", "handoff_kind"],
    contact_channel_click: ["channel", "origin_path"],
    phone_click: ["origin_path"],
    whatsapp_click: ["link_url"],
    email_click: ["link_url"],
    proof_source_click: ["link_url", "referring_page"]
  };

  var PATH_PARAMS = {
    landing_path: true,
    origin_path: true,
    destination_path: true,
    referring_page: true
  };

  function consentGranted() {
    try { return localStorage.getItem(CONSENT_KEY) === "granted"; } catch (error) { return false; }
  }

  function clean(value, maximum) {
    if (value === undefined || value === null) return null;
    var text = String(value).trim().replace(/\s+/g, " ");
    if (!text || text.length > maximum) return null;
    return text;
  }

  function safeToken(value) {
    var text = clean(value, MAX_TOKEN_LENGTH);
    if (!text || !/^[a-z0-9][a-z0-9._-]*$/i.test(text)) return null;
    return text.toLowerCase();
  }

  function safePath(value) {
    if (!value) return null;
    try {
      var url = new URL(value, location.origin);
      if (url.origin !== location.origin) return null;
      var path = clean(url.pathname, MAX_PATH_LENGTH);
      return path && path.charAt(0) === "/" ? path : null;
    } catch (error) {
      return null;
    }
  }

  function safeHost(value) {
    var text = clean(value, 100);
    if (!text || !/^[a-z0-9.-]+$/i.test(text)) return null;
    return text.toLowerCase();
  }

  function safeDestination(value) {
    var text = clean(value, 240);
    if (!text) return null;
    if (/^mailto:/i.test(text)) return "email";
    if (/^tel:/i.test(text)) return "phone";
    try {
      var url = new URL(text, location.origin);
      if (url.origin === location.origin) return safePath(url.pathname);
      var host = safeHost(url.hostname);
      if (!host) return null;
      if (host === "wa.me") return "wa.me";
      if (/^(?:www\.)?(?:orcid\.org|scholar\.google\.com|webofscience\.com|doi\.org|zenodo\.org)$/.test(host)) return host.replace(/^www\./, "");
      return null;
    } catch (error) {
      return null;
    }
  }

  function safeParam(key, value) {
    if (PATH_PARAMS[key]) return safePath(value);
    if (key === "referrer_host") return safeHost(value);
    if (key === "link_url") return safeDestination(value);
    return safeToken(value);
  }

  var originalGtag = typeof window.gtag === "function" ? window.gtag.bind(window) : null;

  function rawGtag() {
    if (originalGtag) return originalGtag.apply(window, arguments);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function governedGtag() {
    var args = Array.prototype.slice.call(arguments);
    if (args[0] !== "event") return rawGtag.apply(window, args);
    if (!consentGranted()) return;

    var name = safeToken(args[1]);
    var allowed = name ? EVENT_SCHEMA[name] : null;
    if (!allowed) return;

    var supplied = args[2] && typeof args[2] === "object" ? args[2] : {};
    var safe = {};
    allowed.forEach(function (key) {
      var value = safeParam(key, supplied[key]);
      if (value !== null) safe[key] = value;
    });
    return rawGtag("event", name, safe);
  }

  window.gtag = governedGtag;
  window.GurjasAnalyticsEmit = function (name, params) {
    governedGtag("event", name, params || {});
  };
  window.GurjasAnalyticsGuard = {
    version: 1,
    events: Object.keys(EVENT_SCHEMA).slice(),
    consentGranted: consentGranted
  };
})();
