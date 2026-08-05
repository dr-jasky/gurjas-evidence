import { createDecisionRecord } from "./decision-tools.js";

const VERSION = "1.0.0-alpha.2";
const REQUEST_TYPES = new Set(["diagnostic", "planning", "evaluation", "reporting", "compliance-support"]);
const EVIDENCE_STATES = new Set(["not-started", "partial", "documented", "independently-checked"]);
const OWNERSHIP_STATES = new Set(["clear", "shared", "unclear"]);
const SENSITIVITY_STATES = new Set(["public", "internal", "sensitive", "restricted"]);

function choice(value, allowed, field) {
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

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

export function navigateEvidencePathway(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be an object");
  }

  const requestType = choice(input.request_type, REQUEST_TYPES, "request_type");
  const evidenceState = choice(input.evidence_state, EVIDENCE_STATES, "evidence_state");
  const ownership = choice(input.ownership, OWNERSHIP_STATES, "ownership");
  const sensitivity = choice(input.sensitivity, SENSITIVITY_STATES, "sensitivity");
  const decisionDue = boolean(input.decision_due, "decision_due");
  const complianceDetermination = boolean(input.compliance_determination, "compliance_determination");
  const requestedOutput = text(input.requested_output, "requested_output");
  const notes = text(input.notes, "notes");

  const stages = [];
  const rules = [];
  const uncertainties = [];
  const exclusions = [
    "The navigator does not make legal, regulatory, accreditation or compliance determinations.",
    "The navigator does not authorize access to sensitive or restricted institutional data.",
    "The navigator does not infer evidence quality from document volume alone.",
  ];
  const nextSteps = [];
  let state = "pathway-ready";
  let humanReviewRequired = false;

  stages.push({ id: "define", status: "required", action: "Define the decision, requested output, accountable owner and review date." });

  if (ownership === "unclear") {
    state = "ownership-blocked";
    humanReviewRequired = true;
    uncertainties.push("Evidence ownership and decision accountability are not yet clear.");
    nextSteps.push("Name an accountable institutional owner and document access authority before collecting or reviewing evidence.");
    rules.push("unclear ownership -> stop and assign accountable owner");
  } else {
    stages.push({ id: "ownership", status: "ready", action: ownership === "shared" ? "Document shared ownership, responsibilities and approval boundaries." : "Record the accountable owner and delegated reviewers." });
  }

  if (sensitivity === "sensitive" || sensitivity === "restricted") {
    humanReviewRequired = true;
    stages.push({ id: "governance", status: "human-review", action: "Confirm lawful access, minimum-necessary handling, retention and redaction controls." });
    nextSteps.push("Use only approved institutional systems and exclude personal or restricted data from browser-local decision records.");
    rules.push("sensitive or restricted data -> mandatory governance review");
  } else {
    stages.push({ id: "governance", status: "ready", action: "Record source permissions, limitations and retention expectations." });
  }

  if (evidenceState === "not-started") {
    state = state === "ownership-blocked" ? state : "evidence-not-ready";
    stages.push({ id: "inventory", status: "required", action: "Create a source inventory with owner, date, provenance and known limitations." });
    nextSteps.push("Build the evidence inventory before promising an evaluation, report or compliance-support output.");
    rules.push("no evidence inventory -> output not ready");
  } else if (evidenceState === "partial") {
    state = state === "ownership-blocked" ? state : "evidence-gaps";
    stages.push({ id: "inventory", status: "gap-review", action: "Map missing, stale, conflicting and inaccessible evidence before synthesis." });
    uncertainties.push("The available evidence is partial and may not support the requested output.");
    rules.push("partial evidence -> gap review before synthesis");
  } else {
    stages.push({ id: "inventory", status: "ready", action: "Preserve source provenance and verify that records remain current for the decision date." });
  }

  if (evidenceState === "independently-checked") {
    stages.push({ id: "verification", status: "ready", action: "Record the independent check, disagreements and resolution status." });
  } else {
    stages.push({ id: "verification", status: "required", action: "Separate source collection from verification and document unresolved conflicts." });
    if (requestType === "evaluation" || requestType === "compliance-support") {
      humanReviewRequired = true;
      nextSteps.push("Obtain independent verification before using the output for evaluation or compliance-support decisions.");
      rules.push("high-consequence request without independent check -> human review");
    }
  }

  if (complianceDetermination) {
    humanReviewRequired = true;
    nextSteps.push("Refer the final determination to the authorised institutional, legal or regulatory function.");
    rules.push("compliance determination -> authorised human decision only");
  }

  if (!requestedOutput) {
    state = state === "pathway-ready" ? "output-undefined" : state;
    uncertainties.push("The requested output has not been defined precisely enough to test evidence sufficiency.");
    nextSteps.push("Define the exact output, audience, decision use and minimum evidence standard.");
    rules.push("undefined output -> define deliverable before synthesis");
  }

  if (decisionDue) {
    stages.push({ id: "decision", status: "time-bound", action: "Issue a dated decision note that separates findings, gaps, assumptions and actions." });
    nextSteps.push("Record what remains unknown rather than compressing uncertainty to meet the deadline.");
  } else {
    stages.push({ id: "decision", status: "planned", action: "Set a review date and evidence-refresh trigger before the decision is made." });
  }

  stages.push({ id: "record", status: "required", action: "Export a local decision record with sources, assumptions, exclusions, uncertainties and next steps." });

  if (notes) uncertainties.push(`User-stated context requiring verification: ${notes}`);

  return deepFreeze({
    state,
    pathway: stages,
    rules_applied: unique(rules),
    uncertainties: unique(uncertainties),
    excluded_options: unique(exclusions),
    recommended_next_steps: unique(nextSteps),
    human_review_required: humanReviewRequired,
    tool_version: VERSION,
  });
}

export function createEvidencePathwayRecord(input, options = {}) {
  const result = navigateEvidencePathway(input);
  return createDecisionRecord({
    question: "What governed institutional evidence pathway is defensible for the stated request, evidence maturity, ownership and sensitivity?",
    context: {
      tool: "Evidence Pathway Navigator",
      scope: "Workflow sequencing and evidence sufficiency support, not an institutional or compliance determination",
      pathway_state: result.state,
      human_review_required: result.human_review_required,
    },
    user_inputs: { ...input },
    rules_applied: result.rules_applied,
    sources_used: [
      { label: "Gurjas institutional pathways", url: "/knowledge/institutional-pathways/", role: "Governed pathway model" },
      { label: "Gurjas evidence standard", url: "/operations/experience-evidence-standard/", role: "Evidence and limitation boundary" },
      { label: "Gurjas Ethics Charter", url: "/ethics-charter/", role: "Privacy, ownership and human-review boundary" },
    ],
    assumptions: ["Inputs describe evidence state and institutional authority accurately at the time of use."],
    uncertainties: result.uncertainties,
    excluded_options: result.excluded_options,
    recommended_next_steps: result.recommended_next_steps,
    tool_version: result.tool_version,
  }, options);
}

export { VERSION as EVIDENCE_PATHWAY_NAVIGATOR_VERSION };
