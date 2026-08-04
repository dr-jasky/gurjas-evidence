import assert from "node:assert/strict";
import fs from "node:fs";
import { createDecisionRecord, decisionRecordFilename, RECORD_FIELDS, serializeDecisionRecord, validateDecisionRecord } from "../../assets/decision-tools.js";

const manifest = JSON.parse(fs.readFileSync("data/decision-tools-manifest.json", "utf8"));
assert.equal(manifest.schemaVersion, "1.0");
assert.equal(manifest.tools.length, 3);
assert.deepEqual(manifest.recordFields, RECORD_FIELDS);
assert.equal(manifest.processing, "browser-local");
assert.equal(manifest.persistence, "download-only");

const input = {
  question: "  Which design route is defensible?  ",
  context: { stage: "planning", constraint: "limited sampling frame" },
  user_inputs: { intent: "explanatory", primaryData: false },
  rules_applied: [" design.intent.explanatory ", "data.secondary.available"],
  sources_used: [{ label: "Methods", url: "/knowledge/research-design/", role: "guidance" }],
  assumptions: ["Existing data are lawfully available."],
  uncertainties: ["Measurement quality has not been assessed."],
  excluded_options: ["Randomised experiment — no intervention control."],
  recommended_next_steps: ["Audit variables and measurement provenance."],
  tool_version: "1.0.0-alpha.1",
};
const generatedAt = "2026-08-05T00:00:00.000Z";
const record = createDecisionRecord(input, { generatedAt });
assert.equal(record.question, "Which design route is defensible?");
assert.equal(record.generated_at, generatedAt);
assert.deepEqual(validateDecisionRecord(record), { valid: true, errors: [] });
assert.equal(serializeDecisionRecord(record), `${JSON.stringify(record, null, 2)}\n`);
assert.equal(decisionRecordFilename("Research Design Selector", generatedAt), "research-design-selector-decision-record-2026-08-05.json");

const second = createDecisionRecord(input, { generatedAt });
assert.deepEqual(second, record, "same inputs and timestamp must create the same record");
input.context.stage = "mutated";
assert.equal(record.context.stage, "planning", "record must not retain mutable references");

assert.throws(() => createDecisionRecord({ ...input, question: "", tool_version: "" }, { generatedAt }), /Invalid decision record/);
const source = fs.readFileSync("assets/decision-tools.js", "utf8");
for (const prohibited of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "location.search", "navigator.sendBeacon"]) {
  assert.equal(source.includes(prohibited), false, `framework must not use ${prohibited}`);
}
console.log("Governed decision-record framework passed deterministic, privacy and export-contract checks.");
