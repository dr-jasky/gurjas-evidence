import assert from "node:assert/strict";
import { createEvidencePathwayRecord, navigateEvidencePathway } from "../../assets/evidence-pathway-navigator.js";

const ready = navigateEvidencePathway({
  request_type: "planning",
  evidence_state: "documented",
  ownership: "clear",
  sensitivity: "internal",
  decision_due: false,
  compliance_determination: false,
  requested_output: "Evidence review plan",
});
assert.equal(ready.state, "pathway-ready");
assert.equal(ready.human_review_required, false);
assert.ok(Object.isFrozen(ready));
assert.ok(ready.pathway.some((stage) => stage.id === "record"));

const ownershipBlocked = navigateEvidencePathway({
  request_type: "evaluation",
  evidence_state: "partial",
  ownership: "unclear",
  sensitivity: "internal",
  decision_due: true,
  compliance_determination: false,
  requested_output: "Institutional evaluation note",
});
assert.equal(ownershipBlocked.state, "ownership-blocked");
assert.equal(ownershipBlocked.human_review_required, true);
assert.ok(ownershipBlocked.rules_applied.some((rule) => rule.includes("unclear ownership")));

const sensitive = navigateEvidencePathway({
  request_type: "diagnostic",
  evidence_state: "documented",
  ownership: "shared",
  sensitivity: "restricted",
  decision_due: false,
  compliance_determination: false,
  requested_output: "Gap diagnosis",
});
assert.equal(sensitive.human_review_required, true);
assert.ok(sensitive.pathway.some((stage) => stage.id === "governance" && stage.status === "human-review"));
assert.ok(sensitive.excluded_options.some((item) => item.includes("authorize access")));

const insufficient = navigateEvidencePathway({
  request_type: "reporting",
  evidence_state: "not-started",
  ownership: "clear",
  sensitivity: "public",
  decision_due: false,
  compliance_determination: false,
  requested_output: "Annual evidence report",
});
assert.equal(insufficient.state, "evidence-not-ready");
assert.ok(insufficient.recommended_next_steps.some((item) => item.includes("inventory")));

const compliance = navigateEvidencePathway({
  request_type: "compliance-support",
  evidence_state: "independently-checked",
  ownership: "clear",
  sensitivity: "sensitive",
  decision_due: true,
  compliance_determination: true,
  requested_output: "Compliance support memorandum",
});
assert.equal(compliance.human_review_required, true);
assert.ok(compliance.rules_applied.some((rule) => rule.includes("authorised human decision")));
assert.ok(compliance.excluded_options.some((item) => item.includes("compliance determinations")));

const undefinedOutput = navigateEvidencePathway({
  request_type: "planning",
  evidence_state: "documented",
  ownership: "clear",
  sensitivity: "public",
  decision_due: false,
  compliance_determination: false,
  requested_output: "",
});
assert.equal(undefinedOutput.state, "output-undefined");

const record = createEvidencePathwayRecord({
  request_type: "planning",
  evidence_state: "documented",
  ownership: "clear",
  sensitivity: "internal",
  decision_due: false,
  compliance_determination: false,
  requested_output: "Evidence review plan",
}, { generatedAt: "2026-08-05T00:00:00.000Z" });
assert.equal(record.context.tool, "Evidence Pathway Navigator");
assert.equal(record.generated_at, "2026-08-05T00:00:00.000Z");
assert.equal(record.tool_version, "1.0.0-alpha.2");
assert.ok(record.sources_used.every((source) => source.url.startsWith("/")));
assert.ok(record.recommended_next_steps.length >= 0);

assert.throws(() => navigateEvidencePathway({}), TypeError);
console.log("evidence pathway navigator fixtures passed");

await import("./public-routes.spec.mjs");
