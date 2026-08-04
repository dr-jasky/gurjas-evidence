import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "data/governance/insight-review-registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const failures = [];

function check(condition, message) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${message}`);
  if (!condition) failures.push(message);
}

const expected = [
  "insights/phd-shortcut-longest-route/index.html",
  "insights/doaj-cope-oaspa-memberships/index.html",
  "insights/cloned-hijacked-journals/index.html",
  "insights/fake-impact-factors/index.html",
  "insights/published-in-predatory-journal-what-to-do/index.html",
  "insights/ugc-care-discontinued/index.html",
  "insights/phd-publication-requirement-india-2026/index.html",
  "insights/ugc-suggestive-parameters-explained/index.html",
  "insights/verify-a-journal-2026/index.html",
  "insights/scopus-publication-guide/index.html",
  "insights/scopus-wos-abdc-compared/index.html",
  "insights/journal-quartiles-citescore/index.html",
  "insights/can-a-scopus-journal-be-predatory/index.html",
  "insights/naac-2025-reforms/index.html",
  "insights/naac-binary-mbgl-2026/index.html",
  "insights/digital-money-urban-slums/index.html",
];
const flagshipPath = "insights/how-to-identify-a-predatory-journal/index.html";

check(registry.schemaVersion === "1.0.0", "registry has a governed schema version");
check(registry.reviewedOn === "2026-08-04", "registry records the review date");
check(registry.articles.length === 16, "registry covers exactly sixteen remaining insight articles");
check(new Set(registry.articles.map((item) => item.path)).size === 16, "every reviewed route is unique");
check(expected.every((item) => registry.articles.some((entry) => entry.path === item)), "all expected insight routes are reviewed");
check(registry.articles.every((item) => fs.existsSync(path.join(root, item.path))), "every reviewed source file exists");
check(registry.articles.every((item) => ["pass", "fail"].includes(item.initialResult)), "initial review records pass or fail");
check(registry.articles.every((item) => ["pass", "corrected", "follow_up_required"].includes(item.finalResult)), "final review uses governed outcomes");

for (const item of registry.articles) {
  if (item.initialResult === "fail") {
    check((item.corrections?.length || 0) > 0 || Boolean(item.followUp), `${item.path} documents a correction or governed follow-up`);
  }
  if (item.finalResult === "follow_up_required") {
    check(Boolean(item.followUp?.owner), `${item.path} follow-up has an owner`);
    check(Boolean(item.followUp?.action), `${item.path} follow-up has a concrete action`);
    check(item.followUp?.severity !== "high", `${item.path} has no unresolved high-severity finding`);
  }
}

const prohibited = [
  /protects you completely/i,
  /actually settle(?:s|d)? the question/i,
  /benchmark that matters/i,
  /single biggest lever on your odds of acceptance/i,
  /difference of a single character is a decisive finding/i,
  /you are on a clone/i,
  /fake metric is a confession/i,
  /live record is worth everything/i,
  /only the second one protects you/i,
  /pass\/fail binary accreditation/i,
  /default check/i,
  /595th meeting/i,
];
const publicText = expected
  .concat(["insights/index.html", flagshipPath])
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");
for (const pattern of prohibited) {
  check(!pattern.test(publicText), `public insight copy excludes ${pattern}`);
}

const verifyGuide = fs.readFileSync(path.join(root, "insights/verify-a-journal-2026/index.html"), "utf8");
check(/591st meeting/.test(verifyGuide), "older UGC guide uses the official 591st meeting number");
check(/final 16 July 2025 annexure is the controlling reference/i.test(verifyGuide), "older UGC guide distinguishes the 35-item final annexure from the 36-item draft");

const flagship = fs.readFileSync(path.join(root, flagshipPath), "utf8");
check(/591st meeting/.test(flagship), "flagship guide uses the official 591st meeting number");
check(/6124898_Public-Notice-CARE-Journals\.pdf/.test(flagship), "flagship UGC claim links the final official notice");
check(/ugccare\.unipune\.ac\.in\/Apps1\/Home\/Index/.test(flagship), "flagship retains the reference-only CARE portal link");

const naacShort = fs.readFileSync(path.join(root, "insights/naac-binary-mbgl-2026/index.html"), "utf8");
check(/transitioning from letter grades toward binary basic accreditation/i.test(naacShort), "short NAAC guide states a transition rather than completed universal replacement");
check(/subject to current official manuals/i.test(naacShort), "short NAAC guide preserves provisional implementation boundaries");

if (failures.length) {
  console.error(`\n${failures.length} insight review registry check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll remaining-insight review registry checks passed.");
}
