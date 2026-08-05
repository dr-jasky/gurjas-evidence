import assert from "node:assert/strict";
import fs from "node:fs";

const routes = [
  { id: "research-design-selector", title: "Research Design Selector", engine: "research-design-selector.js", form: "design-form", output: "design-output", record: "design-record", download: "design-download" },
  { id: "journal-evaluation-workflow", title: "Journal Evaluation Workflow", engine: "journal-evaluation-workflow.js", form: "journal-form", output: "journal-output", record: "journal-record", download: "journal-download" },
  { id: "evidence-pathway-navigator", title: "Evidence Pathway Navigator", engine: "evidence-pathway-navigator.js", form: "pathway-form", output: "pathway-output", record: "pathway-record", download: "pathway-download" },
];

const manifest = JSON.parse(fs.readFileSync("data/decision-tools-manifest.json", "utf8"));
const contracts = JSON.parse(fs.readFileSync("data/tool-contracts.json", "utf8"));
const facts = JSON.parse(fs.readFileSync("data/site-facts.json", "utf8"));
const frontDoor = JSON.parse(fs.readFileSync("data/product-front-door.json", "utf8"));
const graph = JSON.parse(fs.readFileSync("data/content-graph.json", "utf8"));
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const toolsHub = fs.readFileSync("tools/index.html", "utf8");
const knowledgeHub = fs.readFileSync("knowledge/index.html", "utf8");
const resourcesHub = fs.readFileSync("resources/index.html", "utf8");
const evidenceHub = fs.readFileSync("evidence/index.html", "utf8");
const stylesheet = fs.readFileSync("assets/decision-workflows.css", "utf8");

assert.equal(facts.toolCount, 11, "the established public-tool inventory must remain governed separately");
assert.equal(contracts.tools.length, 11, "the existing public tool-contract registry must remain one-to-one with its eleven established routes");
assert.equal(frontDoor.tools.length, 11, "the established homepage tool front door must not be silently reclassified by a beta release");
assert.equal(manifest.tools.length, 3, "the decision-system manifest must govern exactly the three connected workflows");
assert.match(evidenceHub, /href="\.\.\/data\/decision-tools-manifest\.json"/);

for (const route of routes) {
  const path = `tools/${route.id}/index.html`;
  const html = fs.readFileSync(path, "utf8");
  const manifestEntry = manifest.tools.find((tool) => tool.id === route.id);

  assert.ok(manifestEntry, `${route.id} must remain in the governed manifest`);
  assert.equal(manifestEntry.status, "engine-ready");
  assert.equal(manifestEntry.releaseStatus, "public-beta");
  assert.equal(manifestEntry.released, "2026-08-05");
  assert.equal(manifestEntry.route, `/tools/${route.id}/`);
  assert.equal(manifest.processing, "browser-local");
  assert.equal(manifest.persistence, "download-only");
  assert.match(manifest.analyticsBoundary, /No workflow answer/i);

  assert.match(html, new RegExp(`<h1>${route.title}</h1>`));
  assert.ok(html.includes('<body class="tool-page">'));
  assert.ok(html.includes(`id="${route.form}"`));
  assert.ok(html.includes(`id="${route.output}"`));
  assert.ok(html.includes(`id="${route.record}"`));
  assert.ok(html.includes(`id="${route.download}"`));
  assert.ok(html.includes('class="decision-tool__output" hidden tabindex="-1"'));
  assert.ok(html.includes("renderDecisionRecord"));
  assert.ok(html.includes("downloadDecisionRecord"));
  assert.ok(html.includes(`../../assets/${route.engine}`));
  assert.ok(html.includes("../../assets/decision-tools.js"));
  assert.ok(html.includes("../../assets/decision-workflows.css?v=1"));
  assert.ok(html.includes("Runs in this browser"));
  assert.ok(html.includes("No answer or result analytics"));
  assert.ok(html.includes("Do not enter names"));
  assert.ok(html.includes("Decision boundary"));
  assert.ok(html.includes("Engine 1.0.0-alpha.2 · reviewed 5 August 2026"));
  assert.ok(html.includes("window.print()"));
  assert.ok(html.includes('type="reset"'));
  assert.ok(!html.includes(" novalidate"));
  for (const prohibited of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "navigator.sendBeacon", "location.search", "innerHTML"]) {
    assert.equal(html.includes(prohibited), false, `${route.id} must not use ${prohibited}`);
  }
  for (const prohibitedClaim of ["legitimacy score", "publication probability", "guaranteed acceptance", "accreditation score"]) {
    assert.equal(html.toLowerCase().includes(prohibitedClaim), false, `${route.id} must exclude ${prohibitedClaim}`);
  }

  assert.ok(sitemap.includes(`https://gurjas.org/tools/${route.id}/`));
  assert.ok(graph.relationships[`tools/${route.id}/index.html`]?.length >= 4);
  for (const hub of [toolsHub, knowledgeHub, resourcesHub, evidenceHub]) {
    assert.ok(hub.includes(`${route.id}/`), `${route.id} must receive an inbound hub link`);
  }
}

assert.match(stylesheet, /@media\(max-width:800px\)/);
assert.match(stylesheet, /@media print/);
assert.match(stylesheet, /prefers-reduced-motion:reduce/);
assert.ok(!stylesheet.includes("@keyframes"), "decision workflows must not introduce decorative keyframes");
assert.match(toolsHub, /Eleven established tools, three public-beta workflows/);
assert.match(toolsHub, /Connected governed decision workflows/);
assert.match(evidenceHub, /Three public-beta workflows, one governed record contract/);

console.log("Three public decision workflows passed release, privacy, discovery, manifest and export wiring checks.");
