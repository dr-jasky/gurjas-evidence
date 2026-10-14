/**
 * Research Protocol Draft — a browser-local export companion to the governed
 * Research Design Selector. This drafts a reviewer checklist, not an approved
 * study protocol, estimator, ethics judgement or fabricated empirical result.
 */
import { validateDecisionRecord } from "./decision-tools.js";
import { evaluateResearchDesign } from "./research-design-selector.js";

const OBJECTIVE_LABELS = Object.freeze({
  describe: "Describe a distribution or population pattern",
  compare: "Compare groups or conditions",
  associate: "Estimate associations",
  predict: "Develop or validate prediction",
  explain: "Explain relationships without asserting an effect",
  "estimate-effect": "Estimate an intervention or exposure effect",
});
const TIME_LABELS = Object.freeze({
  "single-wave": "Single wave",
  "repeated-cross-section": "Repeated independent cross-sections",
  panel: "Panel or longitudinal observations",
  retrospective: "Retrospective records",
});
const EVIDENCE_LABELS = Object.freeze({
  idea: "Idea / research question only",
  "draft-measures": "Draft measures",
  "piloted-measures": "Piloted measures",
  "usable-data": "Usable data or records available",
});
const ASSIGNMENT_LABELS = Object.freeze({
  none: "No controlled assignment",
  random: "Random assignment",
  "non-random": "Non-random assignment",
});

// Values appear only as text, never as HTML or executable Markdown.
function safeInline(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([\\`*_{}\[\]<>|#!])/g, "\\$1")
    .slice(0, 600);
}
function list(items, empty = "Not established in this screening.") {
  return (items.length ? items : [empty]).map((value) => `- ${safeInline(value)}`).join("\n");
}
function yesNo(value) { return value ? "Yes" : "No"; }

const STANDARD_GATES = Object.freeze([
  { code: "RQ", title: "Research question and estimand", action: "Specify the actual research question, outcomes, exposures or intervention, units of analysis, target estimand and intended use." },
  { code: "POP", title: "Population and sampling", action: "Define target population, eligibility, sampling frame, recruitment/selection method and generalisability limitations." },
  { code: "MEAS", title: "Measurement and piloting", action: "Document construct definitions, instruments, coding, reliability/validity plan, pilot results and measurement timing." },
  { code: "SIZE", title: "Sample size or statistical power", action: "Complete design-specific precision or power analysis with stated assumptions; do not substitute a generic heuristic." },
  { code: "ANALYSIS", title: "Analysis and missing data", action: "Prespecify modelling/analytical alternatives, covariates, missingness diagnostics, robustness checks and exclusion rules." },
  { code: "ETHICS", title: "Ethics, permissions and data protection", action: "Determine required institutional ethics approval, permission, consent, confidentiality, access control and retention before collecting data." },
  { code: "REPORT", title: "Reproducibility and reporting", action: "Prepare a versioned protocol, decision log, data dictionary, planned outputs and reporting standards appropriate to the study." },
]);

function gatesFor(record) {
  const inp = record.user_inputs;
  const gates = [...STANDARD_GATES];
  if (inp.objective === "estimate-effect" || inp.intervention) {
    gates.splice(4, 0, {
      code: "IDENT",
      title: "Causal identification and comparison",
      action: "Document counterfactual, allocation mechanism, confounding, exchangeability/parallel-trend assumptions where relevant, spillovers and plausible threats to identification.",
    });
  }
  if (inp.objective === "predict") {
    gates.splice(4, 0, {
      code: "VALID",
      title: "Prediction validation",
      action: "Define outcome horizon, development/validation splits, leakage prevention, calibration, discrimination, transportability and external validation where possible.",
    });
  }
  if (inp.time_structure === "panel" || inp.feasible_follow_up) {
    gates.splice(4, 0, {
      code: "FOLLOW",
      title: "Follow-up and temporal structure",
      action: "Assess timing, person/cluster identity, attrition, repeated-measures dependence, changing exposures and loss-to-follow-up bias.",
    });
  }
  return gates.map((gate) => Object.freeze({ ...gate, status: "Not assessed" }));
}

export function createResearchProtocolDraft(record) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new TypeError(`Invalid decision record: ${validation.errors.join("; ")}`);
  if (record.context.tool !== "Research Design Selector") {
    throw new TypeError("Protocol draft requires a Research Design Selector record");
  }
  const evaluated = evaluateResearchDesign(record.user_inputs);
  const i = record.user_inputs;
  const gateList = gatesFor(record);
  const routes = evaluated.candidates.map((route) => Object.freeze({
    label: route.label, rationale: route.rationale, cautions: Object.freeze([...route.cautions]),
  }));
  const status = evaluated.human_review_required
    ? "Specialist review flagged by the design-screening rules"
    : "Preliminary screening complete; study-specific review still required";
  const basis = Object.freeze([
    ["Primary objective", OBJECTIVE_LABELS[i.objective]],
    ["Time structure", TIME_LABELS[i.time_structure]],
    ["Assignment", ASSIGNMENT_LABELS[i.assignment]],
    ["Evidence maturity", EVIDENCE_LABELS[i.evidence_state]],
    ["Researcher-controlled intervention", yesNo(i.intervention)],
    ["Follow-up feasible", yesNo(i.feasible_follow_up)],
    ["Credible comparison group available", yesNo(i.comparison_group)],
    ["Potentially high-stakes decision", yesNo(i.sensitive_decision)],
    ["Feasibility constraints (self-reported)", i.constraints || "None specified"],
  ].map(([label, value]) => Object.freeze({ label, value })));

  const lines = [
    "# Research Protocol Draft — for methodological review",
    "",
    "**Status:** Planning document only. Not an approved protocol, ethical clearance, power calculation or certified causal design.",
    `**Generated (UTC):** ${safeInline(record.generated_at)}`,
    `**Screening engine:** ${safeInline(record.tool_version)}`,
    `**Review flag:** ${safeInline(status)}`,
    "",
    "## 1. Research purpose",
    "",
    "Specific research question, hypotheses, population, construct definitions and estimand: **not supplied or assessed in this screening**. Complete and approve them before execution.",
    "",
    "## 2. Declared design conditions",
    "",
    ...basis.map((item) => `- **${safeInline(item.label)}:** ${safeInline(item.value)}`),
    "",
    "## 3. Candidate design families (alternatives, not approvals)",
    "",
    ...(routes.length
      ? routes.flatMap((route, n) => [
          `### ${n + 1}. ${safeInline(route.label)}`,
          "",
          `**Why consider:** ${safeInline(route.rationale)}`,
          ...(route.cautions.length ? ["", "**Key cautions:**", list(route.cautions)] : []),
          "",
        ])
      : ["No primary family was established. Obtain specialist design review.", ""]),
    "## 4. Reviewer decision gates — all initially unresolved",
    "",
    ...gateList.map((gate) => `- [ ] **${gate.code} — ${safeInline(gate.title)}:** ${safeInline(gate.action)}`),
    "",
    "## 5. Uncertainty and excluded routes",
    "",
    "**Unresolved uncertainties**",
    list(evaluated.uncertainties),
    "",
    "**Explicitly excluded routes**",
    list(evaluated.excluded_options),
    "",
    "## 6. Next methodological actions",
    "",
    ...(evaluated.recommended_next_steps.length
      ? evaluated.recommended_next_steps.map((step, index) => `${index + 1}. ${safeInline(step)}`)
      : ["1. Obtain methodologist review and formally document decisions."]),
    "",
    "## 7. Evidence provenance and verification limits",
    "",
    "- Derived exclusively from researcher-selected categories and disclosed Gurjas screening rules.",
    "- Internal methodological references orient further reading; they do not validate this particular study.",
    ...record.sources_used.map((source) => `- ${safeInline(source.label)}: ${safeInline(source.url)} — ${safeInline(source.role)}`),
    "- No literature search, participant recruitment, statistical test, dataset inspection or independent fact check has been performed.",
    "- No research material is sent to a server by this export; the document is generated in the active browser.",
    "",
    "## 8. Review sign-off (to be completed outside this tool)",
    "",
    "- [ ] Researcher confirms the scope, measures, intended outcome and design decisions.",
    "- [ ] Supervisor/methodologist reviews feasibility, identification and alternatives.",
    "- [ ] Ethics/data permissions are obtained where applicable.",
    "- [ ] Approved protocol version and review date are recorded.",
    "",
    "*Gurjas Research Evidence Studio — decision-support material, not a substitute for independent academic review.*",
    "",
  ];
  const markdown = lines.join("\n");
  return Object.freeze({
    status,
    basis,
    routes: Object.freeze(routes),
    gates: Object.freeze(gateList),
    uncertaintyCount: evaluated.uncertainties.length,
    markdown,
    generatedAt: record.generated_at,
  });
}

export function researchProtocolFilename(record) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new TypeError("A valid decision record is required");
  return `gurjas-research-protocol-draft-${record.generated_at.slice(0, 10)}.md`;
}

/** Download locally with no network calls or persistent browser storage. */
export function downloadResearchProtocolDraft(
  record,
  documentRef = globalThis.document,
  environment = globalThis,
) {
  const draft = createResearchProtocolDraft(record);
  const parent = documentRef?.body || documentRef?.documentElement;
  if (!documentRef?.createElement || !parent?.append || !environment?.Blob
      || !environment?.URL?.createObjectURL || !environment?.URL?.revokeObjectURL
      || !environment?.setTimeout) {
    throw new Error("Local Markdown export is unavailable in this environment");
  }
  const blob = new environment.Blob([draft.markdown], { type: "text/markdown;charset=utf-8" });
  const url = environment.URL.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = researchProtocolFilename(record);
  link.rel = "noopener";
  link.hidden = true;
  try {
    parent.append(link);
    if (typeof link.click !== "function") throw new Error("Local export is unavailable");
    link.click();
  } finally {
    if (typeof link.remove === "function") link.remove();
    environment.setTimeout(() => environment.URL.revokeObjectURL(url), 0);
  }
  return link.download;
}
