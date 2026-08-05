import assert from "node:assert/strict";
import {
  createJournalEvaluationRecord,
  evaluateJournalEvidence,
  JOURNAL_EVALUATION_WORKFLOW_VERSION,
} from "../../assets/journal-evaluation-workflow.js";
import { validateDecisionRecord } from "../../assets/decision-tools.js";

const base = {
  identity: "confirmed",
  indexing: "confirmed",
  editorial: "confirmed",
  policies: "confirmed",
  payment: "disclosed",
  website_matches_registry: true,
  contact_domain_matches: true,
  reputational_decision: false,
  notes: "Checked against dated primary records",
};

const consistent = evaluateJournalEvidence(base);
assert.equal(consistent.state, "evidence-consistent");
assert.equal(consistent.human_review_required, false);
assert.equal(consistent.evidence.length, 4);
assert.ok(consistent.excluded_options.some((item) => item.includes("No safe")));
assert.ok(consistent.recommended_next_steps.some((item) => item.includes("beneficiary")));
assert.equal(Object.isFrozen(consistent), true);
assert.equal(Object.isFrozen(consistent.evidence[0]), true);

const incomplete = evaluateJournalEvidence({
  ...base,
  indexing: "not-checked",
  editorial: "unavailable",
  payment: "none",
});
assert.equal(incomplete.state, "incomplete-evidence");
assert.ok(incomplete.recommended_next_steps.some((item) => item.includes("indexing")));
assert.ok(incomplete.uncertainties.some((item) => item.includes("editorial")));

const mismatch = evaluateJournalEvidence({
  ...base,
  website_matches_registry: false,
  payment: "urgent-request",
});
assert.equal(mismatch.state, "identity-escalation");
assert.equal(mismatch.human_review_required, true);
assert.ok(mismatch.rules_applied.some((item) => item.includes("clone")));
assert.ok(mismatch.recommended_next_steps.some((item) => item.includes("Stop payment")));

const inconsistency = evaluateJournalEvidence({
  ...base,
  indexing: "inconsistent",
  reputational_decision: true,
});
assert.equal(inconsistency.state, "material-inconsistency");
assert.equal(inconsistency.human_review_required, true);
assert.ok(inconsistency.recommended_next_steps.some((item) => item.includes("allegation")));

const generatedAt = "2026-08-05T01:00:00.000Z";
const record = createJournalEvaluationRecord(base, { generatedAt });
assert.deepEqual(validateDecisionRecord(record), { valid: true, errors: [] });
assert.equal(record.generated_at, generatedAt);
assert.equal(record.tool_version, JOURNAL_EVALUATION_WORKFLOW_VERSION);
assert.equal(record.context.screening_state, "evidence-consistent");
assert.equal(record.sources_used.length, 3);
assert.equal(Object.isFrozen(record), true);

const copy = structuredClone(base);
createJournalEvaluationRecord(copy, { generatedAt });
assert.deepEqual(copy, base, "record creation must not mutate user inputs");

for (const invalid of [
  { ...base, identity: "safe" },
  { ...base, payment: "paid" },
  { ...base, website_matches_registry: "yes" },
  { ...base, notes: 42 },
]) {
  assert.throws(() => evaluateJournalEvidence(invalid), /must be/);
}

const serialized = JSON.stringify(record);
for (const prohibited of ["email", "author_name", "manuscript", "abstract", "safe verdict"]) {
  assert.equal(serialized.includes(prohibited), false);
}
assert.equal(serialized.includes("predatory or legitimate verdict"), true);

console.log("Journal Evaluation Workflow passed evidence-state, non-defamation, escalation, privacy and decision-record checks.");
