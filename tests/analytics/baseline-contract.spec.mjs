import assert from "node:assert/strict";
import fs from "node:fs";

const baseline = JSON.parse(fs.readFileSync("data/measurement-baseline.json", "utf8"));
const analyticsSource = fs.readFileSync("assets/analytics.js", "utf8");
const documentation = fs.readFileSync("docs/measurement-baseline.md", "utf8");

assert.equal(baseline.version, 1, "measurement baseline must use governed version 1");
assert.equal(baseline.status, "baseline-only", "measurement must remain a baseline rather than an unsupported performance claim");
assert.equal(baseline.privacy?.consentRequired, true, "all journey measurement requires analytics consent");
assert.equal(baseline.privacy?.unknownEventsRejected, true, "unknown analytics events must be rejected");
assert.equal(baseline.privacy?.unknownParametersRejected, true, "unknown event parameters must be rejected");

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
    `${eventName} must be implemented through the governed analytics layer`,
  );
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
  assert.match(analyticsSource, new RegExp(`${requiredEvent}: \\[`), `${requiredEvent} requires an explicit parameter allowlist`);
}

assert.ok(analyticsSource.includes("var EVENT_SCHEMA ="), "analytics must reject unregistered events through a central schema");
assert.ok(analyticsSource.includes("var allowed = EVENT_SCHEMA[name]"), "tracking must resolve the event allowlist before emission");
assert.ok(analyticsSource.includes("if (!allowed) return"), "unknown event names must not be emitted");
assert.ok(analyticsSource.includes("allowed.forEach"), "only allowlisted parameters may be copied into an event");
assert.ok(analyticsSource.includes("function safeToken"), "slugs and campaign tags require token validation");
assert.ok(analyticsSource.includes("function safePath"), "paths require same-origin pathname validation");
assert.ok(analyticsSource.includes("if (!consentGranted()) return"), "event emission must remain consent-gated");

for (const prohibitedRead of [
  /new FormData/i,
  /#cf-name/i,
  /#cf-email/i,
  /#cf-msg/i,
  /input\.value/i,
  /textarea\.value/i,
  /research[-_ ]?input/i,
  /tool[-_ ]?result/i,
]) {
  assert.ok(!prohibitedRead.test(analyticsSource), `analytics must not read prohibited content: ${prohibitedRead}`);
}

assert.match(documentation, /Baseline only/i, "documentation must state that this is not a performance claim");
assert.match(documentation, /submit attempt alone is never counted as success/i, "documentation must preserve the delivered-enquiry boundary");
assert.match(documentation, /Missing events cannot be interpreted as absence of demand/i, "documentation must explain the consent denominator limitation");
assert.match(documentation, /must not be used to infer an individual's identity/i, "documentation must prohibit individual profiling");

console.log(`Privacy-safe measurement baseline passed for ${eventNames.size} governed events across ${stageIds.length} journey stages.`);
