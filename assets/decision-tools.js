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

const STRING_ARRAY_FIELDS = Object.freeze([
  "rules_applied",
  "assumptions",
  "uncertainties",
  "excluded_options",
  "recommended_next_steps",
]);

const SOURCE_FIELDS = Object.freeze(["label", "url", "role"]);
const TOOL_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cloneJsonSafe(value, label = "value", ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains a non-finite number`);
    return value;
  }
  if (["undefined", "function", "symbol", "bigint"].includes(typeof value)) {
    throw new TypeError(`${label} contains an unsupported ${typeof value} value`);
  }
  if (typeof value !== "object") throw new TypeError(`${label} is not JSON-safe`);
  if (ancestors.has(value)) throw new TypeError(`${label} contains a circular reference`);

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return Array.from(value, (item, index) => cloneJsonSafe(item, `${label}[${index}]`, ancestors));
    }
    if (!plainObject(value)) throw new TypeError(`${label} contains a non-plain object`);
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = cloneJsonSafe(item, `${label}.${key}`, ancestors);
    }
    return output;
  } finally {
    ancestors.delete(value);
  }
}

function normalizeStringArray(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return cloneJsonSafe(value, field);
  return value.map((item, index) => {
    if (typeof item !== "string") return cloneJsonSafe(item, `${field}[${index}]`);
    return item.trim();
  });
}

function normalizeSources(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return cloneJsonSafe(value, "sources_used");
  return value.map((source, index) => {
    if (!plainObject(source)) return cloneJsonSafe(source, `sources_used[${index}]`);
    return {
      label: cleanString(source.label),
      url: cleanString(source.url),
      role: cleanString(source.role),
    };
  });
}

function safeSourceUrl(value) {
  const url = cleanString(value);
  if (/^\/(?!\/)[^\s\\]*$/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function canonicalIsoTimestamp(value) {
  const timestamp = cleanString(value);
  if (!timestamp) return false;
  const parsed = new Date(timestamp);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === timestamp;
}

function sameKeys(actual, expected) {
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function validateJsonSafe(value, label, errors) {
  try {
    cloneJsonSafe(value, label);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${label} is not JSON-safe`);
  }
}

function validateStringArray(record, field, errors) {
  const value = record[field];
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      errors.push(`${field}[${index}] must be a non-empty string`);
    } else if (item !== item.trim()) {
      errors.push(`${field}[${index}] must be trimmed`);
    }
  });
}

function validateSources(record, errors) {
  const sources = record.sources_used;
  if (!Array.isArray(sources)) {
    errors.push("sources_used must be an array");
    return;
  }
  sources.forEach((source, index) => {
    if (!plainObject(source)) {
      errors.push(`sources_used[${index}] must be an object`);
      return;
    }
    if (!sameKeys(Object.keys(source), SOURCE_FIELDS)) {
      errors.push(`sources_used[${index}] must contain exactly label, url and role`);
    }
    for (const field of SOURCE_FIELDS) {
      const value = source[field];
      if (typeof value !== "string" || !value.trim()) {
        errors.push(`sources_used[${index}].${field} must be a non-empty string`);
      } else if (value !== value.trim()) {
        errors.push(`sources_used[${index}].${field} must be trimmed`);
      }
    }
    if (typeof source.url === "string" && source.url.trim() && !safeSourceUrl(source.url)) {
      errors.push(`sources_used[${index}].url must be root-relative or HTTPS without credentials`);
    }
  });
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

export function validateDecisionRecord(record) {
  const errors = [];
  if (!plainObject(record)) return { valid: false, errors: ["record must be an object"] };

  const keys = Object.keys(record);
  if (!sameKeys(keys, RECORD_FIELDS)) {
    const missing = RECORD_FIELDS.filter((field) => !keys.includes(field));
    const extra = keys.filter((field) => !RECORD_FIELDS.includes(field));
    if (missing.length) errors.push(`missing fields: ${missing.join(", ")}`);
    if (extra.length) errors.push(`unexpected fields: ${extra.join(", ")}`);
    if (!missing.length && !extra.length) errors.push("record fields must use the governed order");
  }

  if (typeof record.question !== "string" || !record.question.trim()) {
    errors.push("question must be a non-empty string");
  } else if (record.question !== record.question.trim()) {
    errors.push("question must be trimmed");
  }

  for (const field of ["context", "user_inputs"]) {
    if (!plainObject(record[field])) {
      errors.push(`${field} must be an object`);
    } else {
      validateJsonSafe(record[field], field, errors);
    }
  }

  for (const field of STRING_ARRAY_FIELDS) validateStringArray(record, field, errors);
  validateSources(record, errors);

  if (!canonicalIsoTimestamp(record.generated_at)) {
    errors.push("generated_at must be a canonical UTC ISO timestamp");
  }
  if (typeof record.tool_version !== "string" || !TOOL_VERSION_PATTERN.test(record.tool_version)) {
    errors.push("tool_version must be a semantic version");
  }

  return { valid: errors.length === 0, errors };
}

export function createDecisionRecord(input, options = {}) {
  if (!plainObject(input)) throw new TypeError("input must be an object");
  if (!plainObject(options)) throw new TypeError("options must be an object");

  const generatedAt = options.generatedAt === undefined ? new Date().toISOString() : cleanString(options.generatedAt);
  const record = {
    question: cleanString(input.question),
    context: input.context === undefined ? {} : cloneJsonSafe(input.context, "context"),
    user_inputs: input.user_inputs === undefined ? {} : cloneJsonSafe(input.user_inputs, "user_inputs"),
    rules_applied: normalizeStringArray(input.rules_applied, "rules_applied"),
    sources_used: normalizeSources(input.sources_used),
    assumptions: normalizeStringArray(input.assumptions, "assumptions"),
    uncertainties: normalizeStringArray(input.uncertainties, "uncertainties"),
    excluded_options: normalizeStringArray(input.excluded_options, "excluded_options"),
    recommended_next_steps: normalizeStringArray(input.recommended_next_steps, "recommended_next_steps"),
    generated_at: generatedAt,
    tool_version: cleanString(input.tool_version),
  };

  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(`Invalid decision record: ${validation.errors.join("; ")}`);
  return deepFreeze(record);
}

export function serializeDecisionRecord(record) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(`Invalid decision record: ${validation.errors.join("; ")}`);
  return `${JSON.stringify(record, null, 2)}\n`;
}

export function decisionRecordFilename(toolId, generatedAt = new Date().toISOString()) {
  const safeTool = cleanString(toolId)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "decision";
  const date = canonicalIsoTimestamp(generatedAt) ? generatedAt.slice(0, 10) : "undated";
  return `${safeTool}-decision-record-${date}.json`;
}

export function downloadDecisionRecord(
  record,
  toolId,
  documentRef = globalThis.document,
  environment = globalThis,
) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(`Invalid decision record: ${validation.errors.join("; ")}`);

  const parent = documentRef?.body || documentRef?.documentElement;
  if (
    !documentRef?.createElement
    || !parent?.append
    || !environment?.Blob
    || !environment?.URL?.createObjectURL
    || !environment?.URL?.revokeObjectURL
    || !environment?.setTimeout
  ) {
    throw new Error("Local download is unavailable in this environment");
  }

  const filename = decisionRecordFilename(toolId, record.generated_at);
  const body = serializeDecisionRecord(record);
  const blob = new environment.Blob([body], { type: "application/json;charset=utf-8" });
  const url = environment.URL.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.hidden = true;

  try {
    parent.append(link);
    if (typeof link.click !== "function") throw new Error("Local download is unavailable in this environment");
    link.click();
  } finally {
    if (typeof link.remove === "function") link.remove();
    environment.setTimeout(() => environment.URL.revokeObjectURL(url), 0);
  }
  return filename;
}

export function renderDecisionRecord(record, container) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(`Invalid decision record: ${validation.errors.join("; ")}`);
  if (!container?.replaceChildren || !container.ownerDocument) {
    throw new TypeError("container must be a DOM element");
  }

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
