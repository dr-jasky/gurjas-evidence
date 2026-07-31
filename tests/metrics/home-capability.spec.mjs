import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));

const html = read("index.html");
const facts = json("data/site-facts.json");
const ledger = json("data/proof-ledger.json");
const contracts = json("data/tool-contracts.json");
const model = json("data/home-capability-metrics.json");
const analytics = read("assets/capability-metrics.js");

let failures = 0;
function check(condition, message) {
  if (condition) {
    console.log(`PASS — ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL — ${message}`);
  }
}

function valueAt(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => (
    value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined
  ), object);
}

function card(metricId) {
  const pattern = new RegExp(
    `<article[^>]+data-capability-metric="${metricId}"[\\s\\S]*?<\\/article>`,
    "i"
  );
  return html.match(pattern)?.[0] || "";
}

const expectedMetricIds = [
  "founder_projects",
  "field_programmes",
  "public_tools",
  "open_repositories"
];
const modelIds = model.metrics.map((metric) => metric.id);

check(
  JSON.stringify(modelIds) === JSON.stringify(expectedMetricIds),
  "the homepage capability model contains exactly the four approved primary metrics"
);

const ledgerById = new Map(ledger.entries.map((entry) => [entry.id, entry]));
for (const metric of model.metrics) {
  check(card(metric.id).length > 0, `${metric.id} has one public homepage card`);
  check(metric.factPaths.length > 0, `${metric.id} declares at least one central fact path`);
  for (const factPath of metric.factPaths) {
    check(valueAt(facts, factPath) !== undefined, `${metric.id} fact path ${factPath} exists`);
    check(html.includes(`data-fact="${factPath}"`), `${metric.id} renders ${factPath} through the fact hydrator`);
  }
  for (const evidenceId of metric.evidenceIds) {
    const entry = ledgerById.get(evidenceId);
    check(Boolean(entry), `${metric.id} references proof-ledger entry ${evidenceId}`);
    if (entry) {
      check(Boolean(entry.sourceUrl), `${evidenceId} has a source URL`);
      check(Boolean(entry.verifiedAt), `${evidenceId} has a verification date`);
      check(Boolean(entry.verificationMethod), `${evidenceId} states its verification method`);
      check(Boolean(entry.limitations), `${evidenceId} states a limitation`);
    }
  }
  check(Boolean(metric.limitation), `${metric.id} declares a public limitation in the metric model`);
  check(card(metric.id).includes("home-capability-limit"), `${metric.id} exposes a limitation beside the number`);
}

check(
  card("founder_projects").includes("Founder-led before Gurjas") &&
  card("field_programmes").includes("Founder-led before Gurjas"),
  "pre-Gurjas experience is visibly classified and not presented as organisational history"
);
check(
  card("public_tools").includes("Current Gurjas infrastructure"),
  "the tool inventory is visibly classified as current Gurjas infrastructure"
);
check(
  card("open_repositories").includes("External public records"),
  "the repository count is visibly classified as external public evidence"
);

const productionTools = contracts.tools.filter((tool) => tool.status === "production");
check(
  facts.toolCount === productionTools.length,
  `central tool count (${facts.toolCount}) equals production tool contracts (${productionTools.length})`
);
check(
  !/\bNine free tools\b/i.test(html) && !/data-fact="toolCount">9</.test(html),
  "the homepage contains no stale nine-tool fallback"
);
check(
  card("public_tools").includes(`data-fact="toolCount">${facts.toolCount}<`),
  "the public-tools card fallback equals the central tool count"
);

check(
  facts.researchAssets.publicRepositoryCount === model.metrics.find((m) => m.id === "open_repositories").evidenceIds.length,
  "the repository count equals the number of named DOI-backed evidence records"
);
check(
  card("open_repositories").includes(`data-fact="researchAssets.publicRepositoryCount">${facts.researchAssets.publicRepositoryCount}<`),
  "the open-repositories card fallback equals the central fact"
);
check(
  card("founder_projects").includes(`data-fact="experience.projectsGuidedOrEvaluatedMinimum">${facts.experience.projectsGuidedOrEvaluatedMinimum}<`),
  "the projects card fallback equals the dated experience fact"
);
check(
  card("field_programmes").includes(`data-fact="experience.primaryFieldProgrammes">${facts.experience.primaryFieldProgrammes}<`) &&
  card("field_programmes").includes(`data-fact="experience.respondentsPerProgrammeMinimum">${facts.experience.respondentsPerProgrammeMinimum}<`),
  "the field-programme card preserves two distinct fact values"
);

for (const factPath of model.supportingRecord.factPaths) {
  check(valueAt(facts, factPath) !== undefined, `supporting record fact ${factPath} exists`);
  check(html.includes(`data-fact="${factPath}"`), `supporting record renders ${factPath}`);
}
check(
  html.includes("not Gurjas organisational performance metrics"),
  "the academic strip is explicitly separated from organisational performance"
);

check(
  analytics.includes('track("capability_metric_click"'),
  "capability evidence clicks use a dedicated analytics event"
);
for (const safeParam of ["metric_id", "destination_type", "source_path", "destination_path"]) {
  check(analytics.includes(safeParam), `analytics allow the safe parameter ${safeParam}`);
}
for (const forbiddenTerm of ["formData", "input.value", "textarea", "email", "organisation", "project objective"]) {
  check(!analytics.includes(forbiddenTerm), `analytics do not read ${forbiddenTerm}`);
}
check(
  analytics.includes("consentGranted()") && analytics.includes('=== "granted"'),
  "capability analytics remain gated by explicit consent"
);

const bannedClaims = [
  /70\+ years/i,
  /combined h-?index/i,
  /guaranteed acceptance/i,
  /publication success rate/i,
  /hundreds helped/i
];
for (const pattern of bannedClaims) {
  check(!pattern.test(html), `homepage excludes unsupported claim pattern ${pattern}`);
}

if (failures) {
  console.error(`\n${failures} capability metric check(s) failed.`);
  process.exit(1);
}
console.log("\nAll verified capability metric checks passed.");
