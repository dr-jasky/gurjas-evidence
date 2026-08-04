import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function check(condition, message) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${message}`);
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function collectFiles(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return collectFiles(child);
    return [child];
  });
}

const publicInsightFiles = collectFiles("insights").filter((file) => [".html", ".json"].includes(path.extname(file)));
const prohibitedLanguage = [
  {
    label: "unsupported near-certainty safety claim",
    pattern: /almost\s+certainly\s+safe/i,
  },
  {
    label: "fixed failure-count verdict",
    pattern: /fail\s+two\s+or\s+more\s+and\s+you\s+have\s+your\s+answer/i,
  },
  {
    label: "universal indexing benchmark claim",
    pattern: /universally\s+accepted\s+benchmarks?/i,
  },
];

for (const file of publicInsightFiles) {
  const content = read(file);
  for (const prohibited of prohibitedLanguage) {
    check(!prohibited.pattern.test(content), `${file} contains no ${prohibited.label}`);
  }
}

const flagshipPath = "insights/how-to-identify-a-predatory-journal/index.html";
const flagship = read(flagshipPath);

check(/widely used indexing and discovery sources/i.test(flagship), "flagship guide describes indexing sources without claiming universality");
check(/record the evidence state rather than score the journal/i.test(flagship), "flagship checklist uses an evidence-state decision boundary");
check(/evidence supports further consideration/i.test(flagship), "flagship checklist includes a cautious positive evidence state");
check(/insufficient evidence/i.test(flagship), "flagship checklist preserves an unresolved evidence state");
check(/"dateModified":"2026-08-04"/.test(flagship), "structured article metadata records the editorial correction date");
check(/Updated 4 August 2026/.test(flagship), "visible article metadata records the editorial correction date");

if (failures.length) {
  console.error(`\n${failures.length} journal-integrity language check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll journal-integrity language checks passed.");
}
