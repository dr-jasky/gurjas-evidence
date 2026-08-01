import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));

let failures = 0;
function check(condition, message) {
  if (condition) {
    console.log(`PASS — ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL — ${message}`);
  }
}

function walkFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "_site"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(target, predicate));
    else if (predicate(target)) files.push(target);
  }
  return files;
}

function jsonLdBlocks(document, label) {
  const blocks = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(document))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (error) {
      check(false, `${label} contains parseable JSON-LD (${error.message})`);
    }
  }
  return blocks;
}

function topLevelNodes(block) {
  if (!block || typeof block !== "object") return [];
  return Array.isArray(block["@graph"]) ? block["@graph"] : [block];
}

function types(node) {
  const value = node?.["@type"];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function findNode(nodes, type, predicate = () => true) {
  return nodes.find((node) => types(node).includes(type) && predicate(node));
}

function fullUrl(relativeUrl) {
  return new URL(relativeUrl, "https://gurjas.org/").href;
}

const registry = json("data/entity-graph.json");
const facts = json("data/site-facts.json");
const contracts = json("data/tool-contracts.json");
const offers = json("site/data/offers.json").offers;
const template = read("site/templates/base.html");
const nodes = registry["@graph"];
const ids = nodes.map((node) => node["@id"]).filter(Boolean);
const byId = new Map(nodes.map((node) => [node["@id"], node]));

check(registry["@context"] === "https://schema.org", "registry uses the canonical Schema.org context");
check(ids.length === new Set(ids).size, "every canonical entity ID is unique");
check(!JSON.stringify(registry).includes("ProfessionalService"), "registry excludes the deprecated ProfessionalService type");

const org = byId.get("https://gurjas.org/#org");
const website = byId.get("https://gurjas.org/#website");
const logo = byId.get("https://gurjas.org/#logo");
const founder = byId.get("https://gurjas.org/people/#gurpreet-kaur");
const principal = byId.get("https://gurjas.org/people/#jaskirat-singh");

check(types(org).includes("Organization"), "canonical Organization uses https://gurjas.org/#org");
check(types(website).includes("WebSite"), "canonical WebSite uses https://gurjas.org/#website");
check(types(logo).includes("ImageObject"), "canonical logo uses https://gurjas.org/#logo");
check(org?.foundingDate === facts.experience.practiceEstablished, "Organization founding date equals the central practice-established fact");
check(org?.email === facts.contact.email && org?.telephone === facts.contact.phoneE164, "Organization contact details equal central facts");
check(org?.founder?.["@id"] === founder?.["@id"], "Organization founder resolves to the named founder entity");
check(org?.member?.["@id"] === principal?.["@id"], "Organization methodological lead resolves to the named Person entity");
check(!Object.hasOwn(org || {}, "sameAs"), "Organization does not borrow the Principal Consultant's identity profiles");
check(!Object.hasOwn(founder || {}, "sameAs"), "Founder entity contains no invented external identity links");

const requiredProfiles = [
  "https://orcid.org/0000-0003-0337-7885",
  "https://scholar.google.com/citations?user=d8Kd4ywAAAAJ",
  "https://papers.ssrn.com/sol3/cf_dev/AbsByAuth.cfm?per_id=7349141",
  "https://www.webofscience.com/wos/author/record/IQW-3142-2023"
];
for (const profile of requiredProfiles) {
  check(principal?.sameAs?.includes(profile), `Principal Consultant entity links to ${profile}`);
}

const serviceNodes = nodes.filter((node) => types(node).includes("Service"));
check(serviceNodes.length === offers.length, "canonical graph contains exactly the four priority services");
for (const offer of offers) {
  const url = `https://gurjas.org/services/${offer.slug}/`;
  const service = findNode(serviceNodes, "Service", (node) => node.url === url);
  check(Boolean(service), `${offer.slug} has a canonical Service entity`);
  check(service?.["@id"] === `${url}#service`, `${offer.slug} has a stable service ID`);
  check(service?.serviceType === offer.serviceType, `${offer.slug} service type matches the offer register`);
  check(service?.provider?.["@id"] === org["@id"], `${offer.slug} provider resolves to Gurjas`);
}

const appNodes = nodes.filter((node) => types(node).includes("WebApplication"));
check(appNodes.length === contracts.tools.length, "canonical graph contains all eleven public tools");
for (const tool of contracts.tools) {
  const url = fullUrl(tool.url);
  const app = findNode(appNodes, "WebApplication", (node) => node.url === url);
  check(Boolean(app), `${tool.id} has a canonical WebApplication entity`);
  check(app?.["@id"] === `${url}#application`, `${tool.id} has a stable application ID`);
  check(app?.name === tool.name, `${tool.id} name matches its tool contract`);
  check(app?.softwareVersion === tool.methodVersion, `${tool.id} version matches its tool contract`);
  check(app?.publisher?.["@id"] === org["@id"], `${tool.id} publisher resolves to Gurjas`);
  check(app?.isAccessibleForFree === true && Number(app?.offers?.price) === 0, `${tool.id} is accurately marked free`);
  check(!Object.hasOwn(app || {}, "aggregateRating") && !Object.hasOwn(app || {}, "review"), `${tool.id} contains no invented rating or review data`);
}

const datasetNodes = nodes.filter((node) => types(node).includes("Dataset"));
check(datasetNodes.length === facts.researchAssets.publicRepositoryCount, "canonical graph contains the registered DOI-backed datasets");
for (const asset of [facts.researchAssets.globalFindex, facts.researchAssets.aucrIndia]) {
  const id = `https://doi.org/${asset.doi}`;
  const dataset = byId.get(id);
  check(types(dataset).includes("Dataset"), `${asset.doi} has a canonical Dataset entity`);
  check(dataset?.identifier === asset.doi, `${asset.doi} preserves its DOI identifier`);
  check(dataset?.creator?.["@id"] === principal["@id"], `${asset.doi} creator resolves to the Principal Consultant entity`);
}

check(template.includes('rel="alternate" type="application/ld+json"'), "every generated page links to the canonical entity registry");
check(template.includes('id="gurjas-core-entity-graph"'), "every generated page embeds the canonical core graph");
for (const id of [logo["@id"], org["@id"], website["@id"]]) {
  check(template.includes(id), `global template embeds ${id}`);
}

const sourceTextFiles = walkFiles(root, (file) => /\.(?:html|json|js|mjs|py|md|txt)$/i.test(file));
const deprecatedHits = sourceTextFiles.filter((file) => read(path.relative(root, file)).includes("ProfessionalService"));
check(deprecatedHits.length === 0, "source contains no deprecated ProfessionalService markup or recommendation");

const builtRoot = path.join(root, "_site");
check(fs.existsSync(builtRoot), "generated site exists for semantic validation");
const builtHtml = walkFiles(builtRoot, (file) => file.endsWith(".html"));
check(builtHtml.length >= 50, "semantic audit covers the full generated site");

for (const file of builtHtml) {
  const relative = path.relative(builtRoot, file);
  const document = fs.readFileSync(file, "utf8");
  const blocks = jsonLdBlocks(document, relative);
  const pageNodes = blocks.flatMap(topLevelNodes);
  check((document.match(/id="gurjas-core-entity-graph"/g) || []).length === 1, `${relative} contains one canonical core graph`);
  check(document.includes('type="application/ld+json" href=') && document.includes("data/entity-graph.json"), `${relative} links to the public entity registry`);

  const organisations = pageNodes.filter((node) => types(node).includes("Organization") && (node.url === "https://gurjas.org/" || node.name === facts.brand));
  check(organisations.length >= 1, `${relative} exposes the Gurjas Organization entity`);
  check(organisations.every((node) => node["@id"] === org["@id"]), `${relative} uses only the canonical Organization ID`);

  const sites = pageNodes.filter((node) => types(node).includes("WebSite") && node.url === "https://gurjas.org/");
  check(sites.length >= 1 && sites.every((node) => node["@id"] === website["@id"]), `${relative} uses the canonical WebSite ID`);
  check(!document.includes("ProfessionalService"), `${relative} contains no deprecated ProfessionalService type`);

  for (const article of pageNodes.filter((node) => types(node).includes("Article"))) {
    check(article.publisher?.["@id"] === org["@id"], `${relative} Article publisher resolves to Gurjas`);
    check(Boolean(article.author), `${relative} Article identifies its visible author`);
  }
}

for (const offer of offers) {
  const relative = path.join("services", offer.slug, "index.html");
  const document = fs.readFileSync(path.join(builtRoot, relative), "utf8");
  const pageNodes = jsonLdBlocks(document, relative).flatMap(topLevelNodes);
  const service = findNode(pageNodes, "Service", (node) => node.url === `https://gurjas.org/services/${offer.slug}/`);
  check(Boolean(service), `${offer.slug} generated page exposes its Service`);
  check(service?.provider?.["@id"] === org["@id"], `${offer.slug} generated Service provider resolves to Gurjas`);
}

for (const tool of contracts.tools) {
  const relative = path.join(tool.url.replace(/^\//, ""), "index.html");
  const document = fs.readFileSync(path.join(builtRoot, relative), "utf8");
  const pageNodes = jsonLdBlocks(document, relative).flatMap(topLevelNodes);
  const app = pageNodes.find((node) => ["SoftwareApplication", "WebApplication"].some((type) => types(node).includes(type)) && node.url === fullUrl(tool.url));
  check(Boolean(app), `${tool.id} page exposes application structured data`);
  check(app?.publisher?.["@id"] === org["@id"], `${tool.id} page publisher resolves to Gurjas`);
  check(Number(app?.offers?.price) === 0, `${tool.id} page accurately marks the tool free`);
}

if (failures) {
  console.error(`\n${failures} semantic entity graph check(s) failed.`);
  process.exit(1);
}
console.log("\nAll semantic entity graph checks passed.");
