import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createDecisionRecord,
  decisionRecordFilename,
  downloadDecisionRecord,
  RECORD_FIELDS,
  serializeDecisionRecord,
  validateDecisionRecord,
} from "../../assets/decision-tools.js";

const manifest = JSON.parse(fs.readFileSync("data/decision-tools-manifest.json", "utf8"));
assert.equal(manifest.schemaVersion, "1.0");
assert.equal(manifest.frameworkVersion, "1.0.0");
assert.equal(manifest.reviewed, "2026-08-05");
assert.equal(manifest.processing, "browser-local");
assert.equal(manifest.persistence, "download-only");
assert.deepEqual(manifest.recordFields, RECORD_FIELDS);
assert.deepEqual(
  manifest.tools.map((tool) => tool.id),
  ["research-design-selector", "journal-evaluation-workflow", "evidence-pathway-navigator"],
);
assert.equal(new Set(manifest.tools.map((tool) => tool.route)).size, 3);
for (const tool of manifest.tools) {
  assert.equal(tool.status, "framework-ready");
  assert.match(tool.version, /^\d+\.\d+\.\d+-alpha\.\d+$/);
  assert.match(tool.route, /^\/tools\/[a-z0-9-]+\/$/);
  assert.ok(tool.purpose.length > 30);
  assert.ok(tool.humanReviewTriggers.length >= 4);
}
assert.match(manifest.analyticsBoundary, /No workflow answer/i);

const input = {
  question: "  Which design route is defensible?  ",
  context: {
    stage: "planning",
    constraint: "limited sampling frame",
    nested: { reviewRequired: true },
  },
  user_inputs: { intent: "explanatory", primaryData: false },
  rules_applied: [" design.intent.explanatory ", "data.secondary.available"],
  sources_used: [
    { label: "Methods", url: "/knowledge/research-design/", role: "guidance" },
    { label: "External record", url: "https://example.org/method", role: "primary record" },
  ],
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
assert.equal(
  decisionRecordFilename("Research Design Selector", generatedAt),
  "research-design-selector-decision-record-2026-08-05.json",
);
assert.equal(decisionRecordFilename("***", "not-a-date"), "decision-decision-record-undated.json");

const second = createDecisionRecord(input, { generatedAt });
assert.deepEqual(second, record, "same inputs and timestamp must create the same record");
assert.ok(Object.isFrozen(record));
assert.ok(Object.isFrozen(record.context));
assert.ok(Object.isFrozen(record.context.nested));
assert.ok(Object.isFrozen(record.sources_used));
assert.throws(() => {
  record.context.stage = "changed";
}, TypeError);
input.context.stage = "mutated outside the record";
input.context.nested.reviewRequired = false;
assert.equal(record.context.stage, "planning", "record must not retain mutable references");
assert.equal(record.context.nested.reviewRequired, true, "nested input must be cloned and frozen");

assert.throws(
  () => createDecisionRecord({ ...input, question: "", tool_version: "" }, { generatedAt }),
  /Invalid decision record/,
);
assert.throws(
  () => createDecisionRecord({ ...input, tool_version: "1" }, { generatedAt }),
  /tool_version must be a semantic version/,
);
assert.throws(
  () => createDecisionRecord(input, { generatedAt: "2026-08-05T00:00:00Z" }),
  /canonical UTC ISO timestamp/,
);
assert.throws(
  () => createDecisionRecord({ ...input, context: { reviewed: new Date() } }, { generatedAt }),
  /non-plain object/,
);
const circular = {};
circular.self = circular;
assert.throws(
  () => createDecisionRecord({ ...input, context: circular }, { generatedAt }),
  /circular reference/,
);
assert.throws(
  () => createDecisionRecord({ ...input, assumptions: ["valid", 7] }, { generatedAt }),
  /assumptions\[1\] must be a non-empty string/,
);
for (const unsafeUrl of [
  "http://example.org/source",
  "javascript:alert(1)",
  "//example.org/source",
  "https://user:password@example.org/source",
  "/unsafe\\path",
]) {
  assert.throws(
    () => createDecisionRecord({
      ...input,
      sources_used: [{ label: "Unsafe", url: unsafeUrl, role: "test" }],
    }, { generatedAt }),
    /root-relative or HTTPS without credentials/,
    `unsafe source URL must fail closed: ${unsafeUrl}`,
  );
}

const extraFieldRecord = { ...record, ungoverned: true };
const extraValidation = validateDecisionRecord(extraFieldRecord);
assert.equal(extraValidation.valid, false);
assert.ok(extraValidation.errors.some((error) => error.includes("unexpected fields: ungoverned")));

const downloadEvents = [];
let createdBlob;
const mockLink = {
  href: "",
  download: "",
  rel: "",
  hidden: false,
  click() {
    downloadEvents.push("click");
  },
  remove() {
    downloadEvents.push("remove");
  },
};
const documentRef = {
  body: {
    append(node) {
      assert.equal(node, mockLink);
      downloadEvents.push("append");
    },
  },
  createElement(tag) {
    assert.equal(tag, "a");
    return mockLink;
  },
};
class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options.type;
    createdBlob = this;
  }
}
const environment = {
  Blob: MockBlob,
  URL: {
    createObjectURL(blob) {
      assert.equal(blob, createdBlob);
      downloadEvents.push("create-url");
      return "blob:decision-record";
    },
    revokeObjectURL(url) {
      assert.equal(url, "blob:decision-record");
      downloadEvents.push("revoke-url");
    },
  },
  setTimeout(callback, delay) {
    assert.equal(delay, 0);
    downloadEvents.push("schedule-revoke");
    callback();
  },
};
const exportedFilename = downloadDecisionRecord(
  record,
  "Research Design Selector",
  documentRef,
  environment,
);
assert.equal(exportedFilename, "research-design-selector-decision-record-2026-08-05.json");
assert.equal(mockLink.href, "blob:decision-record");
assert.equal(mockLink.download, exportedFilename);
assert.equal(mockLink.rel, "noopener");
assert.equal(mockLink.hidden, true);
assert.equal(createdBlob.type, "application/json;charset=utf-8");
assert.equal(createdBlob.parts[0], serializeDecisionRecord(record));
assert.deepEqual(
  downloadEvents,
  ["create-url", "append", "click", "remove", "schedule-revoke", "revoke-url"],
);

const source = fs.readFileSync("assets/decision-tools.js", "utf8");
for (const prohibited of [
  "fetch(",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "location.search",
  "navigator.sendBeacon",
  "innerHTML",
]) {
  assert.equal(source.includes(prohibited), false, `framework must not use ${prohibited}`);
}

const packageData = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(
  packageData.scripts["test:decision-tools"],
  "node tests/decision-tools/decision-record.spec.mjs",
);
assert.ok(
  packageData.scripts["test:tools"].includes("tests/decision-tools/decision-record.spec.mjs"),
  "authoritative tool suite must execute the governed decision-record fixture",
);
const qualityWorkflow = fs.readFileSync(".github/workflows/quality.yml", "utf8");
assert.ok(qualityWorkflow.includes("node --check assets/decision-tools.js"));
assert.ok(qualityWorkflow.includes("pnpm test:decision-tools"));
const pagesWorkflow = fs.readFileSync(".github/workflows/pages.yml", "utf8");
assert.ok(pagesWorkflow.includes("node --check assets/decision-tools.js"));
assert.ok(pagesWorkflow.includes("node tests/decision-tools/decision-record.spec.mjs"));

console.log(
  "Governed decision-record framework passed manifest, determinism, immutability, privacy, source, export and CI-wiring checks.",
);
