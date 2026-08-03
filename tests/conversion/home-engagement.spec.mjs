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

function count(pattern) {
  return (html.match(pattern) || []).length;
}

check(
  count(/class="home-engagement-pathway"/g) === 1,
  "the generated homepage contains exactly one engagement journey"
);
check(
  /<section class="home-engagement-pathway"[^>]+aria-labelledby="home-engagement-title"/.test(html),
  "the engagement journey is exposed as a labelled section"
);
check(
  /<h2[^>]+id="home-engagement-title"/.test(html),
  "the journey has a stable section heading"
);
check(
  /<ol class="home-engagement-steps"/.test(html) &&
  count(/<li><span>0[123]<\/span>/g) === 3,
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
  check(html.includes(`href="${route}"`), `the journey links to ${route}`);
}

const requiredIdeas = [
  "The decision or submission at stake",
  "What evidence already exists",
  "The deadline and review audience",
  "confidentiality or governance constraints",
  "smallest useful scope"
];
for (const idea of requiredIdeas) {
  check(html.toLowerCase().includes(idea.toLowerCase()), `the journey preserves: ${idea}`);
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
  check(!pattern.test(html), `the homepage excludes unsupported claim ${pattern}`);
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
