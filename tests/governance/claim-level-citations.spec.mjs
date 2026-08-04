import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function check(condition, message) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${message}`);
  if (!condition) failures.push(message);
}

const flagshipPath = path.join(root, "insights/how-to-identify-a-predatory-journal/index.html");
const flagship = fs.readFileSync(flagshipPath, "utf8");

const sourceIds = [
  "source-ugc",
  "source-scopus",
  "source-wos",
  "source-doaj",
  "source-crossref",
  "source-issn",
  "source-transparency-principles",
  "source-oaspa-members",
  "source-retraction-watch",
  "source-think-check-submit",
  "source-jcr",
  "source-citescore",
];

check((flagship.match(/id="sources"/g) || []).length === 1, "flagship guide has one stable sources section");
check(!/Sources and further reading:/i.test(flagship), "generic unlinked source paragraph has been removed");
check((flagship.match(/Accessed 4 August 2026\./g) || []).length === sourceIds.length, "every source records the retrieval date");
check(!/three or four together/i.test(flagship), "flagship guide contains no fixed red-flag count verdict");

for (const id of sourceIds) {
  check((flagship.match(new RegExp(`id="${id}"`, "g")) || []).length === 1, `${id} has one reference-list target`);
  check(flagship.includes(`href="#${id}"`), `${id} is cited at a supporting claim`);
}

const sourceLinks = [...flagship.matchAll(/<li id="source-[^"]+">([\s\S]*?)<\/li>/g)];
check(sourceLinks.length === sourceIds.length, "source register contains the governed twelve official records");
for (const [, item] of sourceLinks) {
  const externalAnchors = [...item.matchAll(/<a href="https:\/\/[^\"]+"([^>]*)>/g)];
  check(externalAnchors.length >= 1, "each source entry contains an external primary-record link");
  check(externalAnchors.every(([, attrs]) => /rel="noopener"/.test(attrs)), "each source link preserves opener isolation");
}

const claimRefs = [...flagship.matchAll(/href="#(source-[^"]+)"/g)].map((match) => match[1]);
const missingTargets = claimRefs.filter((id) => !flagship.includes(`id="${id}"`));
check(missingTargets.length === 0, "every claim-level citation resolves to a local source target");
check(claimRefs.length >= 20, "load-bearing claims carry repeated local source markers");

const requiredOfficialHosts = [
  "ugccare.unipune.ac.in",
  "www.elsevier.com",
  "mjl.clarivate.com",
  "doaj.org",
  "www.crossref.org",
  "portal.issn.org",
  "publicationethics.org",
  "www.oaspa.org",
  "retractionwatch.com",
  "thinkchecksubmit.org",
  "clarivate.com",
];
for (const host of requiredOfficialHosts) {
  check(flagship.includes(`https://${host}`), `source register includes ${host}`);
}

if (failures.length) {
  console.error(`\n${failures.length} claim-level citation check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll claim-level citation checks passed.");
}
