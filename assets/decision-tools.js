const RECORD_FIELDS = Object.freeze([
  "question",
  "context",
  "user_inputs",
  "rules_applied",
  "sources_used",
  "assumptions",
  "uncertainties",
  "excluded_options",
  "recommended_next_steps",
  "generated_at",
  "tool_version",
]);

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter(Boolean);
}

function cleanSources(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(plainObject)
    .map((source) => ({
      label: cleanString(source.label),
      url: cleanString(source.url),
      role: cleanString(source.role),
    }))
    .filter((source) => source.label && (/^https:\/\//.test(source.url) || source.url.startsWith("/")));
}

export function validateDecisionRecord(record) {
  const errors = [];
  if (!plainObject(record)) return { valid: false, errors: ["record must be an object"] };

  for (const field of RECORD_FIELDS) {
    if (!(field in record)) errors.push(`missing field: ${field}`);
  }
  if (!cleanString(record.question)) errors.push("question must be a non-empty string");
  if (!plainObject(record.context)) errors.push("context must be an object");
  if (!plainObject(record.user_inputs)) errors.push("user_inputs must be an object");
  for (const field of ["rules_applied", "assumptions", "uncertainties", "excluded_options", "recommended_next_steps"]) {
    if (!Array.isArray(record[field])) errors.push(`${field} must be an array`);
  }
  if (!Array.isArray(record.sources_used)) errors.push("sources_used must be an array");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(cleanString(record.generated_at))) errors.push("generated_at must be an ISO timestamp");
  if (!cleanString(record.tool_version)) errors.push("tool_version must be a non-empty string");

  return { valid: errors.length === 0, errors };
}

export function createDecisionRecord(input, options = {}) {
  if (!plainObject(input)) throw new TypeError("input must be an object");
  const generatedAt = cleanString(options.generatedAt) || new Date().toISOString();
  const record = {
    question: cleanString(input.question),
    context: plainObject(input.context) ? clone(input.context) : {},
    user_inputs: plainObject(input.user_inputs) ? clone(input.user_inputs) : {},
    rules_applied: cleanStringArray(input.rules_applied),
    sources_used: cleanSources(input.sources_used),
    assumptions: cleanStringArray(input.assumptions),
    uncertainties: cleanStringArray(input.uncertainties),
    excluded_options: cleanStringArray(input.excluded_options),
    recommended_next_steps: cleanStringArray(input.recommended_next_steps),
    generated_at: generatedAt,
    tool_version: cleanString(input.tool_version),
  };
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(`Invalid decision record: ${validation.errors.join("; ")}`);
  return record;
}

export function serializeDecisionRecord(record) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(`Invalid decision record: ${validation.errors.join("; ")}`);
  return `${JSON.stringify(record, null, 2)}\n`;
}

export function decisionRecordFilename(toolId, generatedAt = new Date().toISOString()) {
  const safeTool = cleanString(toolId).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "decision";
  const date = cleanString(generatedAt).slice(0, 10) || "undated";
  return `${safeTool}-decision-record-${date}.json`;
}

export function downloadDecisionRecord(record, toolId, documentRef = globalThis.document) {
  if (!documentRef?.createElement || !globalThis.Blob || !globalThis.URL?.createObjectURL) {
    throw new Error("Local download is unavailable in this environment");
  }
  const body = serializeDecisionRecord(record);
  const url = globalThis.URL.createObjectURL(new Blob([body], { type: "application/json;charset=utf-8" }));
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = decisionRecordFilename(toolId, record.generated_at);
  link.rel = "noopener";
  link.click();
  globalThis.URL.revokeObjectURL(url);
}

export function renderDecisionRecord(record, container) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(`Invalid decision record: ${validation.errors.join("; ")}`);
  if (!container?.replaceChildren || !container.ownerDocument) throw new TypeError("container must be a DOM element");

  const documentRef = container.ownerDocument;
  const fragment = documentRef.createDocumentFragment();
  const heading = documentRef.createElement("h2");
  heading.textContent = "Decision record";
  fragment.append(heading);

  for (const field of RECORD_FIELDS) {
    const section = documentRef.createElement("section");
    const label = documentRef.createElement("h3");
    label.textContent = field.replaceAll("_", " ");
    const pre = documentRef.createElement("pre");
    pre.textContent = typeof record[field] === "string" ? record[field] : JSON.stringify(record[field], null, 2);
    section.append(label, pre);
    fragment.append(section);
  }
  container.replaceChildren(fragment);
}

export { RECORD_FIELDS };
