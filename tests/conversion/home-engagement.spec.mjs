import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const output = path.join(root, "_site", "index.html");
const html = fs.readFileSync(output, "utf8");

let failures = 0;
function check(condition, message) {
  if (condition) {
    console.log(`PASS — ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL — ${message}`);
  }
}

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

const sectionMatches = html.match(/<section class="home-engagement-pathway"[\s\S]*?<\/section>/g) || [];
const section = sectionMatches[0] || "";

check(
  sectionMatches.length === 1,
  "the generated homepage contains exactly one engagement journey"
);
check(
  /^<section class="home-engagement-pathway"[^>]+aria-labelledby="home-engagement-title"/.test(section),
  "the engagement journey is exposed as a labelled section"
);
check(
  /<h2[^>]+id="home-engagement-title"/.test(section),
  "the journey has a stable section heading"
);
check(
  /<ol class="home-engagement-steps"/.test(section) &&
  count(section, /<li><span>0[123]<\/span>/g) === 3,
  "the three-step process is represented as one ordered list"
);

const requiredRoutes = [
  "services/naac-evidence-readiness/",
  "services/impact-evaluation/",
  "services/research-methods/",
  "ethics-charter/",
  "evidence/",
  "services/",
  "contact/"
];
for (const route of requiredRoutes) {
  check(section.includes(`href="${route}"`), `the journey links to ${route}`);
}

const requiredIdeas = [
  "The decision or submission at stake",
  "What evidence already exists",
  "The deadline and review audience",
  "confidentiality or governance constraints",
  "smallest useful scope"
];
for (const idea of requiredIdeas) {
  check(section.toLowerCase().includes(idea.toLowerCase()), `the journey preserves: ${idea}`);
}

const prohibitedClaims = [
  /guaranteed outcome/i,
  /guaranteed publication/i,
  /guaranteed accreditation/i,
  /100% success/i,
  /best consultancy/i,
  /market leader/i
];
for (const pattern of prohibitedClaims) {
  check(!pattern.test(section), `the engagement journey excludes unsupported claim ${pattern}`);
}

check(
  html.includes('assets/home-engagement.css?v=1'),
  "the generated homepage loads the governed engagement stylesheet"
);

if (failures) {
  console.error(`\n${failures} homepage engagement check(s) failed.`);
  process.exit(1);
}

console.log("\nAll homepage engagement checks passed.");
