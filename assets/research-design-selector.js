import { createDecisionRecord } from "./decision-tools.js";

const VERSION = "1.0.0-alpha.2";
const OBJECTIVES = new Set(["describe", "compare", "associate", "predict", "explain", "estimate-effect"]);
const TIME_STRUCTURES = new Set(["single-wave", "repeated-cross-section", "panel", "retrospective"]);
const ASSIGNMENTS = new Set(["none", "random", "non-random"]);
const EVIDENCE_STATES = new Set(["idea", "draft-measures", "piloted-measures", "usable-data"]);

function requireChoice(value, allowed, field) {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new TypeError(`${field} must be one of: ${[...allowed].join(", ")}`);
  }
  return value;
}

function boolean(value, field) {
  if (typeof value !== "boolean") throw new TypeError(`${field} must be boolean`);
  return value;
}

function text(value, field) {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function unique(items) {
  return [...new Set(items)];
}

function addCandidate(candidates, id, label, rationale, cautions = []) {
  if (!candidates.some((candidate) => candidate.id === id)) {
    candidates.push({ id, label, rationale, cautions });
  }
}

export function evaluateResearchDesign(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be an object");
  }

  const objective = requireChoice(input.objective, OBJECTIVES, "objective");
  const timeStructure = requireChoice(input.time_structure, TIME_STRUCTURES, "time_structure");
  const assignment = requireChoice(input.assignment, ASSIGNMENTS, "assignment");
  const evidenceState = requireChoice(input.evidence_state, EVIDENCE_STATES, "evidence_state");
  const intervention = boolean(input.intervention, "intervention");
  const feasibleFollowUp = boolean(input.feasible_follow_up, "feasible_follow_up");
  const comparisonGroup = boolean(input.comparison_group, "comparison_group");
  const sensitiveDecision = boolean(input.sensitive_decision, "sensitive_decision");
  const constraints = text(input.constraints, "constraints");

  const candidates = [];
  const rules = [];
  const uncertainties = [];
  const exclusions = [];
  const nextSteps = [];
  let humanReviewRequired = sensitiveDecision;

  if (objective === "describe") {
    addCandidate(candidates, "descriptive-observational", "Descriptive observational design", "Matches a question focused on estimating distributions, prevalence, profiles or patterns without an effect claim.");
    rules.push("descriptive objective -> descriptive observational family");
  }

  if (["compare", "associate", "predict", "explain"].includes(objective)) {
    addCandidate(candidates, "analytical-observational", "Analytical observational design", "Supports structured comparison, association, explanation or prediction when assignment is absent.", ["Association alone does not establish a causal effect."]);
    rules.push("analytical objective without required assignment -> analytical observational family");
  }

  if (objective === "predict") {
    addCandidate(candidates, "prediction-development", "Prediction-model development or validation", "The stated goal is out-of-sample prediction rather than explanation of a single coefficient.", ["Requires a prespecified validation strategy and adequate events/sample size."]);
    rules.push("prediction objective -> prediction development or validation family");
  }

  if (intervention && assignment === "random") {
    addCandidate(candidates, "randomized-experiment", "Randomized experimental design", "An intervention with random assignment permits an experimental route when ethics, implementation and analysis are feasible.", ["Randomization integrity, attrition and interference still require assessment."]);
    rules.push("intervention + random assignment -> randomized experimental family");
  } else if (intervention && assignment === "non-random") {
    addCandidate(candidates, "quasi-experimental", "Quasi-experimental design", "The intervention is not randomly assigned, so identification must come from design features, timing or a defensible comparison strategy.", ["A comparison group alone is not sufficient for causal identification."]);
    rules.push("intervention + non-random assignment -> quasi-experimental family");
    humanReviewRequired = true;
  } else if (objective === "estimate-effect" && !intervention) {
    addCandidate(candidates, "causal-observational", "Causal observational design", "The effect question requires an explicit identification strategy despite the absence of researcher-controlled intervention.", ["Confounding, selection, temporality and positivity assumptions must be defended."]);
    rules.push("effect objective without controlled intervention -> causal observational family");
    humanReviewRequired = true;
  }

  if (timeStructure === "panel" || feasibleFollowUp) {
    addCandidate(candidates, "longitudinal", "Longitudinal design", "Repeated observation can establish temporal ordering and model within-unit change.", ["Attrition and time-varying confounding may affect interpretation."]);
    rules.push("panel or feasible follow-up -> longitudinal family");
  } else if (timeStructure === "single-wave") {
    exclusions.push("Longitudinal change claims are excluded because the current plan has one observation wave.");
  }

  if (timeStructure === "repeated-cross-section") {
    addCandidate(candidates, "repeated-cross-sectional", "Repeated cross-sectional design", "Independent samples over time can estimate population-level change without tracking the same units.");
    rules.push("repeated cross-section -> population trend family");
  }

  if (timeStructure === "retrospective") {
    addCandidate(candidates, "retrospective-record", "Retrospective record-based design", "Existing historical records can answer the question if eligibility, missingness and measurement provenance are defensible.", ["Retrospective availability does not guarantee measurement validity."]);
    rules.push("retrospective time structure -> record-based family");
  }

  if (objective === "estimate-effect" && !comparisonGroup && assignment !== "random") {
    uncertainties.push("No defensible comparison group is currently identified for the requested effect estimate.");
    nextSteps.push("Define the counterfactual comparison and identification assumptions before selecting an effect-estimation method.");
    humanReviewRequired = true;
  }

  if (evidenceState === "idea") {
    uncertainties.push("Measures and operational definitions are not yet mature enough to lock the design.");
    nextSteps.push("Develop the construct map, outcomes, exposures and eligibility criteria before final design selection.");
  } else if (evidenceState === "draft-measures") {
    nextSteps.push("Pilot the proposed measures and document reliability, validity and administration feasibility.");
  } else if (evidenceState === "piloted-measures") {
    nextSteps.push("Freeze the analysis-ready variable definitions and conduct design-specific sample-size planning.");
  } else {
    nextSteps.push("Audit data provenance, missingness, measurement timing and eligibility before analysis.");
  }

  if (constraints) {
    uncertainties.push(`User-stated feasibility constraint: ${constraints}`);
  }

  if (!candidates.length) {
    uncertainties.push("The supplied combination does not support a defensible primary design family.");
    nextSteps.push("Reconcile the objective, assignment mechanism, time structure and available evidence with a methodologist.");
    humanReviewRequired = true;
  }

  return Object.freeze({
    candidates: candidates.map((candidate) => Object.freeze({ ...candidate, cautions: Object.freeze([...candidate.cautions]) })),
    rules_applied: Object.freeze(unique(rules)),
    uncertainties: Object.freeze(unique(uncertainties)),
    excluded_options: Object.freeze(unique(exclusions)),
    recommended_next_steps: Object.freeze(unique(nextSteps)),
    human_review_required: humanReviewRequired,
    tool_version: VERSION,
  });
}

export function createResearchDesignRecord(input, options = {}) {
  const result = evaluateResearchDesign(input);
  return createDecisionRecord({
    question: "Which research-design families are defensible for the stated objective and constraints?",
    context: {
      tool: "Research Design Selector",
      scope: "Design-family screening, not protocol approval or causal-method certification",
      human_review_required: result.human_review_required,
    },
    user_inputs: { ...input },
    rules_applied: result.rules_applied,
    sources_used: [
      { label: "Gurjas Research Design knowledge pathway", url: "/knowledge/research-design/", role: "Methodological orientation" },
      { label: "Gurjas Ethics Charter", url: "/ethics-charter/", role: "Governance boundary" },
    ],
    assumptions: ["Responses accurately describe the intended study rather than a completed analysis."],
    uncertainties: result.uncertainties,
    excluded_options: result.excluded_options,
    recommended_next_steps: result.recommended_next_steps,
    tool_version: result.tool_version,
  }, options);
}

export { VERSION as RESEARCH_DESIGN_SELECTOR_VERSION };
