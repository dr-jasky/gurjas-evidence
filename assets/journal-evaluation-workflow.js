import { createDecisionRecord } from "./decision-tools.js";

const VERSION = "1.0.0-alpha.2";
const EVIDENCE_STATES = new Set(["not-checked", "confirmed", "inconsistent", "unavailable"]);
const PAYMENT_STATES = new Set(["none", "disclosed", "unexpected", "urgent-request"]);

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

export function evaluateJournalEvidence(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be an object");
  }

  const identity = choice(input.identity, EVIDENCE_STATES, "identity");
  const indexing = choice(input.indexing, EVIDENCE_STATES, "indexing");
  const editorial = choice(input.editorial, EVIDENCE_STATES, "editorial");
  const policies = choice(input.policies, EVIDENCE_STATES, "policies");
  const payment = choice(input.payment, PAYMENT_STATES, "payment");
  const websiteMatchesRegistry = boolean(input.website_matches_registry, "website_matches_registry");
  const contactDomainMatches = boolean(input.contact_domain_matches, "contact_domain_matches");
  const reputationalDecision = boolean(input.reputational_decision, "reputational_decision");
  const notes = text(input.notes, "notes");

  const rules = [];
  const uncertainties = [];
  const exclusions = [
    "No safe, unsafe, predatory or legitimate verdict is produced from this screening workflow.",
    "Absence from one directory or index is not treated as proof of misconduct or quality.",
  ];
  const nextSteps = [];
  const evidence = [];
  let state = "incomplete-evidence";
  let humanReviewRequired = reputationalDecision;

  for (const [field, value] of Object.entries({ identity, indexing, editorial, policies })) {
    evidence.push({ area: field, state: value });
    if (value === "inconsistent") {
      uncertainties.push(`${field} evidence is inconsistent across the checked records.`);
      humanReviewRequired = true;
    } else if (value === "unavailable") {
      uncertainties.push(`${field} evidence could not be verified from the checked source.`);
    } else if (value === "not-checked") {
      nextSteps.push(`Check ${field} evidence against the relevant primary record.`);
    }
  }

  if (!websiteMatchesRegistry || !contactDomainMatches) {
    uncertainties.push("The journal website or contact domain does not align with the checked registry or publisher identity.");
    nextSteps.push("Stop payment and submission actions until the official publisher or registry resolves the identity mismatch.");
    rules.push("identity mismatch -> possible clone or impersonation escalation");
    state = "identity-escalation";
    humanReviewRequired = true;
  }

  if (payment === "unexpected" || payment === "urgent-request") {
    uncertainties.push(payment === "unexpected"
      ? "A fee was requested that was not clearly disclosed before submission."
      : "An urgent payment request creates an unresolved transaction-risk signal.");
    nextSteps.push("Verify the invoice, beneficiary, fee policy and official payment channel before paying.");
    rules.push("unexpected or urgent payment -> payment verification escalation");
    humanReviewRequired = true;
  } else if (payment === "disclosed") {
    rules.push("disclosed payment -> verify amount and beneficiary against official policy");
    nextSteps.push("Match the requested amount and beneficiary to the journal's official fee policy.");
  }

  const checked = [identity, indexing, editorial, policies].filter((value) => value !== "not-checked");
  const inconsistent = checked.filter((value) => value === "inconsistent");
  const unavailable = checked.filter((value) => value === "unavailable");

  if (state !== "identity-escalation") {
    if (inconsistent.length) {
      state = "material-inconsistency";
      rules.push("one or more inconsistent evidence areas -> unresolved material inconsistency");
    } else if (checked.length === 4 && unavailable.length === 0) {
      state = "evidence-consistent";
      rules.push("all four evidence areas checked without recorded inconsistency -> evidence-consistent screening state");
      nextSteps.push("Preserve dated screenshots or record links and repeat checks immediately before submission or payment.");
    } else {
      state = "incomplete-evidence";
      rules.push("unchecked or unavailable evidence -> incomplete screening state");
    }
  }

  if (notes) uncertainties.push(`User-stated context requiring verification: ${notes}`);
  if (reputationalDecision) {
    nextSteps.push("Obtain documented human review before making or publishing any allegation about the journal or publisher.");
    rules.push("reputational decision -> mandatory human review");
  }

  return deepFreeze({
    state,
    evidence,
    rules_applied: unique(rules),
    uncertainties: unique(uncertainties),
    excluded_options: unique(exclusions),
    recommended_next_steps: unique(nextSteps),
    human_review_required: humanReviewRequired,
    tool_version: VERSION,
  });
}

export function createJournalEvaluationRecord(input, options = {}) {
  const result = evaluateJournalEvidence(input);
  return createDecisionRecord({
    question: "What is the current evidence state for this journal, and what requires verification before submission, payment or allegation?",
    context: {
      tool: "Journal Evaluation Workflow",
      scope: "Evidence-state screening, not a legal, reputational, indexing or quality verdict",
      screening_state: result.state,
      human_review_required: result.human_review_required,
    },
    user_inputs: { ...input },
    rules_applied: result.rules_applied,
    sources_used: [
      { label: "Gurjas journal verification guide", url: "/insights/verify-a-journal-2026/", role: "Verification sequence" },
      { label: "Gurjas journal assessment checklist", url: "/resources/journal-assessment-checklist/", role: "Evidence checklist" },
      { label: "Gurjas Ethics Charter", url: "/ethics-charter/", role: "Non-defamation and governance boundary" },
    ],
    assumptions: ["Each answer reflects a dated check of the relevant primary record rather than memory, marketing copy or a third-party list."],
    uncertainties: result.uncertainties,
    excluded_options: result.excluded_options,
    recommended_next_steps: result.recommended_next_steps,
    tool_version: result.tool_version,
  }, options);
}

export { VERSION as JOURNAL_EVALUATION_WORKFLOW_VERSION };
