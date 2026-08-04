/* Gurjas outcome analytics.
   This layer supplements the restrained baseline events in script.js with
   business outcomes that can be interpreted safely. It never reads or sends
   names, email addresses, organisations, free-text form content, research
   inputs, document content or tool results. Every event and parameter is
   explicitly allowlisted and remains gated by analytics consent. */
(function () {
  "use strict";

  var CONSENT_KEY = "gurjas.analyticsConsent.v1";
  var ATTRIBUTION_KEY = "gurjas.analyticsAttribution.v1";
  var ATTRIBUTION_SENT_KEY = "gurjas.analyticsAttributionSent.v1";
  var HANDOFF_KEY = "gurjas.analyticsHandoff.v1";
  var MAX_VALUE_LENGTH = 100;

  var EVENT_SCHEMA = {
    campaign_landing: ["campaign_source", "campaign_medium", "campaign_name", "campaign_content", "campaign_term", "referrer_host", "landing_path"],
    library_view: ["library_surface", "origin_path"],
    library_entry_view: ["entry_slug", "origin_path"],
    tool_view: ["tool_slug", "origin_path"],
    tool_action: ["tool_slug", "action_type"],
    tool_export: ["tool_slug", "export_type"],
    tool_evidence_open: ["tool_slug", "entry_slug", "destination_path"],
    library_to_practical: ["entry_slug", "destination_kind", "destination_slug", "destination_path"],
    contact_channel_click: ["channel", "origin_path"],
    phone_click: ["origin_path"],
    service_handoff: ["service_slug", "origin_path", "handoff_kind"],
    clinic_request: ["service_slug", "origin_path"],
    clinic_view: ["service_slug"],
    contact_form_success: ["service_slug", "origin_path", "handoff_kind", "campaign_source", "campaign_medium", "campaign_name"],
    clinic_enquiry_success: ["service_slug", "origin_path", "handoff_kind", "campaign_source", "campaign_medium", "campaign_name"],
    contact_form_failure: ["service_slug", "origin_path", "handoff_kind"]
  };

  var PATH_PARAMS = {
    landing_path: true,
    origin_path: true,
    destination_path: true
  };

  var HOST_PARAMS = { referrer_host: true };

  function consentGranted() {
    if (window.GurjasPrivacy && typeof window.GurjasPrivacy.getAnalyticsChoice === "function") {
      return window.GurjasPrivacy.getAnalyticsChoice() === "granted";
    }
    try { return localStorage.getItem(CONSENT_KEY) === "granted"; } catch (error) { return false; }
  }

  function clean(value) {
    if (value === undefined || value === null) return null;
    var text = String(value).trim().replace(/\s+/g, " ");
    return text ? text.slice(0, MAX_VALUE_LENGTH) : null;
  }

  function safeToken(value) {
    var text = clean(value);
    if (!text || text.length > 64 || !/^[a-z0-9][a-z0-9._-]*$/i.test(text)) return null;
    return text.toLowerCase();
  }

  function safePath(value) {
    if (!value) return null;
    try {
      var url = new URL(value, location.origin);
      if (url.origin !== location.origin) return null;
      var path = clean(url.pathname);
      return path && path.charAt(0) === "/" ? path : null;
    } catch (error) {
      return null;
    }
  }

  function safeHost(value) {
    var text = clean(value);
    if (!text || text.length > 100 || !/^[a-z0-9.-]+$/i.test(text)) return null;
    return text.toLowerCase();
  }

  function safeParam(key, value) {
    if (PATH_PARAMS[key]) return safePath(value);
    if (HOST_PARAMS[key]) return safeHost(value);
    return safeToken(value);
  }

  function track(name, params) {
    if (!consentGranted()) return;
    var allowed = EVENT_SCHEMA[name];
    if (!allowed) return;
    var safe = {};
    allowed.forEach(function (key) {
      var value = safeParam(key, params ? params[key] : null);
      if (value !== null) safe[key] = value;
    });
    if (typeof window.GurjasTrackEvent === "function") {
      window.GurjasTrackEvent(name, safe);
    } else if (typeof window.gtag === "function") {
      window.gtag("event", name, safe);
    }
  }

  function currentSlug(prefix, path) {
    var match = (path || location.pathname).match(new RegExp("/" + prefix + "/([^/]+)/"));
    return match ? safeToken(match[1]) : null;
  }

  function libraryEntrySlug(path) {
    var match = (path || location.pathname).match(/\/knowledge\/library\/([^/]+)\//);
    return match ? safeToken(match[1]) : null;
  }

  function serviceFromHref(href) {
    try {
      var url = new URL(href, location.href);
      return safeToken(url.searchParams.get("service"));
    } catch (error) {
      return null;
    }
  }

  function readJson(storage, key) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJson(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function externalReferrerHost() {
    if (!document.referrer) return null;
    try {
      var referrer = new URL(document.referrer);
      return referrer.origin === location.origin ? null : safeHost(referrer.hostname);
    } catch (error) {
      return null;
    }
  }

  function attribution() {
    if (!consentGranted()) return null;
    var existing = readJson(sessionStorage, ATTRIBUTION_KEY);
    if (existing) return existing;

    var params = new URLSearchParams(location.search);
    var data = {
      campaign_source: safeToken(params.get("utm_source")),
      campaign_medium: safeToken(params.get("utm_medium")),
      campaign_name: safeToken(params.get("utm_campaign")),
      campaign_content: safeToken(params.get("utm_content")),
      campaign_term: safeToken(params.get("utm_term")),
      referrer_host: externalReferrerHost(),
      landing_path: safePath(location.pathname)
    };
    var hasAttribution = Object.keys(data).some(function (key) {
      return key !== "landing_path" && data[key];
    });
    if (!hasAttribution) return null;

    if (!data.campaign_source && data.referrer_host) data.campaign_source = data.referrer_host;
    if (!data.campaign_medium && data.referrer_host) data.campaign_medium = "referral";
    writeJson(sessionStorage, ATTRIBUTION_KEY, data);
    return data;
  }

  function emitCampaignLanding() {
    var data = attribution();
    if (!data) return;
    try {
      if (sessionStorage.getItem(ATTRIBUTION_SENT_KEY) === "true") return;
      sessionStorage.setItem(ATTRIBUTION_SENT_KEY, "true");
    } catch (error) {}
    track("campaign_landing", data);
  }

  var journeyViewSent = false;
  function emitJourneyView() {
    if (journeyViewSent || !consentGranted()) return;
    var path = location.pathname;
    var entry = libraryEntrySlug(path);
    var tool = currentSlug("tools", path);
    var emitted = false;

    if (entry) {
      track("library_entry_view", { entry_slug: entry, origin_path: path });
      emitted = true;
    } else if (/^\/knowledge\/?$/.test(path)) {
      track("library_view", { library_surface: "index", origin_path: path });
      emitted = true;
    } else if (/^\/knowledge\/[^/]+\/?$/.test(path)) {
      track("library_view", { library_surface: "pillar", origin_path: path });
      emitted = true;
    }

    if (tool) {
      track("tool_view", { tool_slug: tool, origin_path: path });
      emitted = true;
    }

    if (emitted) journeyViewSent = true;
  }

  function rememberHandoff(serviceSlug, originPath, kind) {
    if (!consentGranted()) return;
    writeJson(sessionStorage, HANDOFF_KEY, {
      service_slug: safeToken(serviceSlug) || "general",
      origin_path: safePath(originPath) || safePath(location.pathname),
      handoff_kind: safeToken(kind) || "contact"
    });
  }

  function handoffContext() {
    var queryService = safeToken(new URLSearchParams(location.search).get("service"));
    var stored = readJson(sessionStorage, HANDOFF_KEY) || {};
    return {
      service_slug: queryService || safeToken(stored.service_slug) || "general",
      origin_path: safePath(stored.origin_path) || safePath(document.referrer),
      handoff_kind: safeToken(stored.handoff_kind) || "contact"
    };
  }

  function campaignContext() {
    var stored = readJson(sessionStorage, ATTRIBUTION_KEY) || {};
    return {
      campaign_source: stored.campaign_source,
      campaign_medium: stored.campaign_medium,
      campaign_name: stored.campaign_name
    };
  }

  function merge(first, second) {
    var result = {};
    [first || {}, second || {}].forEach(function (source) {
      Object.keys(source).forEach(function (key) { result[key] = source[key]; });
    });
    return result;
  }

  function exportType(element) {
    var candidate = [
      element.getAttribute("data-export"),
      element.getAttribute("download"),
      element.id,
      element.getAttribute("aria-label"),
      element.textContent
    ].filter(Boolean).join(" ").toLowerCase();
    if (/copy/.test(candidate)) return "copy";
    if (/csv/.test(candidate)) return "csv";
    if (/json/.test(candidate)) return "json";
    if (/pdf/.test(candidate)) return "pdf";
    if (/print/.test(candidate)) return "print";
    if (/download|export|save/.test(candidate)) return "download";
    return null;
  }

  function toolActionKind(element) {
    var candidate = [
      element.getAttribute("data-analytics-action"),
      element.id,
      element.getAttribute("aria-label"),
      element.textContent
    ].filter(Boolean).join(" ").toLowerCase();
    if (/calculat|estimat/.test(candidate)) return "calculate";
    if (/verify|check/.test(candidate)) return "check";
    if (/analy[sz]|assess|score/.test(candidate)) return "assess";
    if (/generat|build|create/.test(candidate)) return "generate";
    if (/search|find|match/.test(candidate)) return "search";
    if (/plan|map/.test(candidate)) return "plan";
    if (/run|start/.test(candidate)) return "run";
    return null;
  }

  emitCampaignLanding();
  emitJourneyView();

  document.addEventListener("click", function (event) {
    var consentButton = event.target.closest('[data-consent="granted"]');
    if (consentButton) {
      window.setTimeout(function () {
        emitCampaignLanding();
        emitJourneyView();
      }, 0);
    }

    var link = event.target.closest("a[href]");
    if (link) {
      var href = link.getAttribute("href") || "";
      var channel = null;
      if (/^tel:/i.test(href)) channel = "phone";
      else if (/^mailto:/i.test(href)) channel = "email";
      else if (/^https:\/\/wa\.me\//i.test(href)) channel = "whatsapp";

      if (channel) {
        track("contact_channel_click", { channel: channel, origin_path: location.pathname });
        if (channel === "phone") track("phone_click", { origin_path: location.pathname });
      }

      var destination = null;
      try { destination = new URL(href, location.href); } catch (error) {}

      if (destination && destination.origin === location.origin && link.matches(".tool-evidence-loop__card")) {
        track("tool_evidence_open", {
          tool_slug: currentSlug("tools"),
          entry_slug: libraryEntrySlug(destination.pathname),
          destination_path: destination.pathname
        });
      }

      var currentEntry = libraryEntrySlug(location.pathname);
      if (currentEntry && destination && destination.origin === location.origin) {
        var toolDestination = currentSlug("tools", destination.pathname);
        var resourceDestination = currentSlug("resources", destination.pathname);
        if (toolDestination || resourceDestination) {
          track("library_to_practical", {
            entry_slug: currentEntry,
            destination_kind: toolDestination ? "tool" : "resource",
            destination_slug: toolDestination || resourceDestination,
            destination_path: destination.pathname
          });
        }
      }

      if (destination && destination.origin === location.origin && /\/contact\/$/.test(destination.pathname)) {
        var serviceSlug = serviceFromHref(href) || currentSlug("services") || "general";
        var isClinic = /\/services\/institutional-research-integrity-clinic\/$/.test(location.pathname);
        rememberHandoff(serviceSlug, location.pathname, isClinic ? "clinic" : "service");
        track("service_handoff", {
          service_slug: serviceSlug,
          origin_path: location.pathname,
          handoff_kind: isClinic ? "clinic" : "service"
        });
        if (isClinic) {
          track("clinic_request", { service_slug: serviceSlug, origin_path: location.pathname });
        }
      }
    }

    if (document.body.classList.contains("tool-page")) {
      var action = event.target.closest("a,button,[role='button'],input[type='submit']");
      if (!action) return;
      var type = exportType(action);
      if (type) {
        track("tool_export", {
          tool_slug: currentSlug("tools"),
          export_type: type
        });
        return;
      }
      var actionType = toolActionKind(action);
      if (actionType) {
        track("tool_action", {
          tool_slug: currentSlug("tools"),
          action_type: actionType
        });
      }
    }
  });

  if (/\/services\/institutional-research-integrity-clinic\/$/.test(location.pathname)) {
    track("clinic_view", { service_slug: "institutional-research-integrity-clinic" });
  }

  var contactForm = document.getElementById("gcContactForm");
  var formStatus = contactForm ? contactForm.querySelector(".form-status") : null;
  if (contactForm && formStatus && "MutationObserver" in window) {
    var successSent = false;
    var failureState = false;

    function inspectStatus() {
      var text = (formStatus.textContent || "").toLowerCase();
      if (!successSent && formStatus.classList.contains("ok")) {
        successSent = true;
        var context = merge(handoffContext(), campaignContext());
        track("contact_form_success", context);
        if (context.handoff_kind === "clinic") {
          track("clinic_enquiry_success", context);
        }
        try { sessionStorage.removeItem(HANDOFF_KEY); } catch (error) {}
      }
      var deliveryFailed = formStatus.classList.contains("error") && /could not be delivered|service unavailable|try again/.test(text);
      if (deliveryFailed && !failureState) {
        failureState = true;
        track("contact_form_failure", handoffContext());
      }
      if (!deliveryFailed) failureState = false;
    }

    new MutationObserver(inspectStatus).observe(formStatus, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      characterData: true,
      subtree: true
    });
    inspectStatus();
  }
})();
