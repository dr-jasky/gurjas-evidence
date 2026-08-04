import assert from "node:assert/strict";
import fs from "node:fs";

const baseline = JSON.parse(fs.readFileSync("data/measurement-baseline.json", "utf8"));
const site = JSON.parse(fs.readFileSync("site/data/site.json", "utf8"));
const analyticsSource = fs.readFileSync("assets/analytics.js", "utf8");
const governorSource = fs.readFileSync("assets/analytics-governor.js", "utf8");
const baseTemplate = fs.readFileSync("site/templates/base.html", "utf8");
const documentation = fs.readFileSync("docs/measurement-baseline.md", "utf8");

assert.equal(baseline.version, 1, "measurement baseline must use governed version 1");
assert.equal(baseline.status, "baseline-only", "measurement must remain a baseline rather than an unsupported performance claim");
assert.equal(baseline.privacy?.consentRequired, true, "all journey measurement requires analytics consent");
assert.equal(baseline.privacy?.unknownEventsRejected, true, "unknown analytics events must be rejected");
assert.equal(baseline.privacy?.unknownParametersRejected, true, "unknown event parameters must be rejected");
assert.equal(site.assetVersion, "30", "privacy-governed analytics assets require a fresh shared cache version");

const forbidden = new Set(baseline.privacy?.forbiddenData || []);
for (const required of [
  "name",
  "email",
  "phone number",
  "organisation name",
  "free-text enquiry",
  "research input",
  "tool result",
  "document content",
]) {
  assert.ok(forbidden.has(required), `privacy contract must forbid ${required}`);
}

const stageIds = baseline.stages.map((stage) => stage.id);
assert.deepEqual(stageIds, [
  "discovery",
  "evidence",
  "practical-use",
  "output",
  "service-handoff",
  "qualified-enquiry",
], "baseline must preserve the six-stage research-utility journey");

const eventNames = new Set();
for (const stage of baseline.stages) {
  assert.ok(stage.interpretation, `${stage.id} requires an interpretation boundary`);
  for (const eventName of stage.events) eventNames.add(eventName);
}
for (const funnel of baseline.funnels) {
  assert.ok(funnel.id && funnel.question, "each funnel requires identity and an operational question");
  for (const step of funnel.sequence) {
    for (const eventName of step.split("|")) eventNames.add(eventName);
  }
}

for (const eventName of eventNames) {
  assert.ok(
    analyticsSource.includes(`${eventName}: [`) || analyticsSource.includes(`track("${eventName}"`),
    `${eventName} must be implemented through the journey analytics layer`,
  );
  assert.match(governorSource, new RegExp(`${eventName}: \\[`), `${eventName} must also be registered by the global governor`);
}

for (const legacyEvent of [
  "whatsapp_click",
  "email_click",
  "proof_source_click",
  "service_cta_click",
  "service_view",
  "contact_form_start",
  "contact_form_submit",
  "tool_start",
  "tool_complete",
]) {
  assert.match(governorSource, new RegExp(`${legacyEvent}: \\[`), `${legacyEvent} must be governed rather than bypassing the new contract`);
}

for (const requiredEvent of [
  "library_view",
  "library_entry_view",
  "tool_view",
  "tool_action",
  "tool_export",
  "tool_evidence_open",
  "library_to_practical",
  "service_handoff",
  "contact_form_success",
]) {
  assert.match(analyticsSource, new RegExp(`${requiredEvent}: \\[`), `${requiredEvent} requires a local parameter allowlist`);
  assert.match(governorSource, new RegExp(`${requiredEvent}: \\[`), `${requiredEvent} requires a global parameter allowlist`);
}

assert.ok(governorSource.includes("if (!consentGranted()) return"), "global event emission must remain consent-gated");
assert.ok(governorSource.includes("var allowed = name ? EVENT_SCHEMA[name] : null"), "governor must resolve the event registry before emission");
assert.ok(governorSource.includes("if (!allowed) return"), "unknown event names must not be emitted");
assert.ok(governorSource.includes("allowed.forEach"), "only allowlisted parameters may be copied into an event");
assert.ok(governorSource.includes("function safeDestination"), "legacy external links must be reduced to approved route or host labels");
assert.ok(governorSource.includes("function safeToken"), "slugs and campaign tags require token validation");
assert.ok(governorSource.includes("function safePath"), "paths require same-origin pathname validation");
assert.ok(governorSource.includes("window.gtag = governedGtag"), "all direct legacy gtag calls must pass through the governor");

const governorPosition = baseTemplate.indexOf("assets/analytics-governor.js");
const sharedScriptPosition = baseTemplate.indexOf("script.js?v=");
const journeyPosition = baseTemplate.indexOf("assets/analytics.js");
assert.ok(governorPosition >= 0, "base template must load the analytics governor");
assert.ok(governorPosition < sharedScriptPosition && governorPosition < journeyPosition, "governor must execute before legacy and journey analytics scripts");

assert.ok(analyticsSource.includes("var EVENT_SCHEMA ="), "journey analytics must reject unregistered local events");
assert.ok(analyticsSource.includes("if (!consentGranted()) return"), "journey analytics must independently preserve the consent boundary");

for (const prohibitedRead of [
  /new FormData/i,
  /#cf-name/i,
  /#cf-email/i,
  /#cf-msg/i,
  /input\.value/i,
  /textarea\.value/i,
]) {
  assert.ok(!prohibitedRead.test(analyticsSource), `journey analytics must not read prohibited form content: ${prohibitedRead}`);
  assert.ok(!prohibitedRead.test(governorSource), `analytics governor must not read prohibited form content: ${prohibitedRead}`);
}

assert.match(documentation, /Baseline only/i, "documentation must state that this is not a performance claim");
assert.match(documentation, /submit attempt alone is never counted as success/i, "documentation must preserve the delivered-enquiry boundary");
assert.match(documentation, /Missing events cannot be interpreted as absence of demand/i, "documentation must explain the consent denominator limitation");
assert.match(documentation, /must not be used to infer an individual's identity/i, "documentation must prohibit individual profiling");

console.log(`Privacy-safe measurement baseline passed for ${eventNames.size} governed journey events across ${stageIds.length} stages, with legacy events covered by the global governor.`);
