import assert from "node:assert/strict";
import { createResearchDesignRecord, evaluateResearchDesign, RESEARCH_DESIGN_SELECTOR_VERSION } from "../../assets/research-design-selector.js";
import { validateDecisionRecord } from "../../assets/decision-tools.js";

const base = {
  objective: "describe",
  time_structure: "single-wave",
  assignment: "none",
  evidence_state: "draft-measures",
  intervention: false,
  feasible_follow_up: false,
  comparison_group: false,
  sensitive_decision: false,
  constraints: "One semester and one institution",
};

const descriptive = evaluateResearchDesign(base);
assert.equal(descriptive.candidates[0].id, "descriptive-observational");
assert.equal(descriptive.human_review_required, false);
assert.ok(descriptive.excluded_options.some((item) => item.includes("Longitudinal")));
assert.ok(descriptive.recommended_next_steps.some((item) => item.includes("Pilot")));
assert.equal(Object.isFrozen(descriptive), true);
assert.equal(Object.isFrozen(descriptive.candidates[0]), true);

const randomized = evaluateResearchDesign({
  ...base,
  objective: "estimate-effect",
  intervention: true,
  assignment: "random",
  comparison_group: true,
  evidence_state: "piloted-measures",
});
assert.ok(randomized.candidates.some((item) => item.id === "randomized-experiment"));
assert.equal(randomized.human_review_required, false);

const quasi = evaluateResearchDesign({
  ...base,
  objective: "estimate-effect",
  intervention: true,
  assignment: "non-random",
  comparison_group: true,
});
assert.ok(quasi.candidates.some((item) => item.id === "quasi-experimental"));
assert.equal(quasi.human_review_required, true);

const unsupportedEffect = evaluateResearchDesign({
  ...base,
  objective: "estimate-effect",
  comparison_group: false,
});
assert.equal(unsupportedEffect.human_review_required, true);
assert.ok(unsupportedEffect.uncertainties.some((item) => item.includes("comparison group")));
assert.ok(unsupportedEffect.recommended_next_steps.some((item) => item.includes("counterfactual")));

const prediction = evaluateResearchDesign({
  ...base,
  objective: "predict",
  time_structure: "panel",
  feasible_follow_up: true,
  evidence_state: "usable-data",
});
assert.ok(prediction.candidates.some((item) => item.id === "prediction-development"));
assert.ok(prediction.candidates.some((item) => item.id === "longitudinal"));

const generatedAt = "2026-08-05T00:00:00.000Z";
const record = createResearchDesignRecord(base, { generatedAt });
assert.deepEqual(validateDecisionRecord(record), { valid: true, errors: [] });
assert.equal(record.generated_at, generatedAt);
assert.equal(record.tool_version, RESEARCH_DESIGN_SELECTOR_VERSION);
assert.equal(record.context.human_review_required, false);
assert.equal(record.sources_used.length, 2);
assert.equal(record.user_inputs.constraints, base.constraints);
assert.equal(Object.isFrozen(record), true);

const copy = structuredClone(base);
createResearchDesignRecord(copy, { generatedAt });
assert.deepEqual(copy, base, "record creation must not mutate user inputs");

for (const invalid of [
  { ...base, objective: "prove" },
  { ...base, intervention: "yes" },
  { ...base, constraints: 30 },
]) {
  assert.throws(() => evaluateResearchDesign(invalid), /must be/);
}

assert.equal(JSON.stringify(record).includes("email"), false);
assert.equal(JSON.stringify(record).includes("name"), false);
assert.equal(JSON.stringify(record).includes("organisation"), false);

console.log("Research Design Selector passed deterministic classification, caution, escalation, privacy and decision-record checks.");
