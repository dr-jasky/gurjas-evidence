import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync('data/product-front-door.json', 'utf8'));
const proof = JSON.parse(fs.readFileSync('data/home-proof-system.json', 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync('data/knowledge-taxonomy.json', 'utf8'));
const html = fs.readFileSync('_site/index.html', 'utf8');

assert.equal(contract.version, 1, 'product front door must expose its governed version');
assert.equal(contract.status, 'pilot', 'front-door launch must remain explicitly classified as a pilot');
assert.equal(contract.tools.length, 11, 'front door must expose all eleven governed public tools');
assert.equal(new Set(contract.tools.map((tool) => tool.id)).size, 11, 'tool IDs must be unique');
assert.equal(new Set(contract.tools.map((tool) => tool.path)).size, 11, 'tool paths must be unique');

for (const group of ['hero', 'search', 'toolsIntro']) {
  assert.ok(contract[group] && typeof contract[group] === 'object', `${group} must be governed by the homepage contract`);
}
for (const field of ['eyebrow', 'title', 'summary']) {
  assert.ok(contract.hero[field], `hero.${field} must be governed`);
}
for (const field of ['label', 'placeholder']) {
  assert.ok(contract.search[field], `search.${field} must be governed`);
}
for (const field of ['eyebrow', 'title', 'summary', 'cta']) {
  assert.ok(contract.toolsIntro[field], `toolsIntro.${field} must be governed`);
}

for (const tool of contract.tools) {
  assert.ok(tool.id && tool.label && tool.category && tool.description && tool.path, `${tool.id || 'tool'} must be fully described`);
  assert.ok(Array.isArray(tool.keywords) && tool.keywords.length >= 3, `${tool.id} requires useful task-search vocabulary`);
  assert.match(tool.path, /^tools\/[a-z0-9-]+\/$/, `${tool.id} must retain its canonical task route`);
  assert.ok(fs.existsSync(`${tool.path}index.html`), `${tool.id} canonical page must exist`);
}

const activePillars = taxonomy.pillars.filter((pillar) => pillar.status === 'active');
assert.equal(activePillars.length, 2, 'knowledge taxonomy must retain two active launch pillars');
assert.equal(contract.library.path, 'knowledge/', 'Research Library must reuse the governed knowledge route');
assert.equal(contract.library.publicLabel, 'Research Library', 'knowledge system must have the approved public label');
assert.deepEqual(
  new Set(contract.library.activePillars.map((pillar) => pillar.path)),
  new Set(activePillars.map((pillar) => pillar.hub)),
  'front door must link the exact active knowledge pillars',
);

const sectionMatch = html.match(/<section class="product-front-door"[\s\S]*?<\/section>/);
assert.ok(sectionMatch, 'generated homepage must contain one product-front-door section');
assert.equal((html.match(/<section class="product-front-door"/g) || []).length, 1, 'product front door must render exactly once');
const frontDoor = sectionMatch[0];

assert.ok(frontDoor.includes(contract.hero.title), 'homepage must lead with the governed institutional proposition');
assert.ok(frontDoor.includes(contract.hero.summary), 'homepage must preserve the governed evidence-first summary');
assert.ok(frontDoor.includes(contract.search.label), 'homepage search must use the governed decision-led label');
assert.ok(frontDoor.includes(contract.search.placeholder), 'homepage search must use the governed task examples');
assert.ok(frontDoor.includes(contract.toolsIntro.eyebrow), 'tools section must use the governed institutional eyebrow');
assert.ok(frontDoor.includes(contract.toolsIntro.title), 'tools section must use the governed task-led title');
assert.ok(frontDoor.includes(contract.toolsIntro.summary), 'tools section must preserve the governed decision-boundary summary');
assert.equal((frontDoor.match(/Open tool ↗/g) || []).length, 11, 'every tool card must use the governed institutional CTA');
assert.ok(!frontDoor.includes('product-front-door__motion'), 'superseded kinetic policy/proof motif must be removed from generated output');
assert.ok(!frontDoor.includes('aria-label="Where policy meets proof"'), 'superseded kinetic identity must not remain in the generated homepage');
assert.ok(frontDoor.includes('data-product-search'), 'front door must expose a progressively enhanced task search');
assert.ok(frontDoor.includes('aria-live="polite"'), 'task-search result count must be announced accessibly');
assert.equal((frontDoor.match(/data-product-tool/g) || []).length, 11, 'all eleven tool cards must be present in the opening product section');
assert.equal((frontDoor.match(/data-product-tool[^>]*hidden/g) || []).length, 0, 'all tool cards must be visible before filtering');

for (const tool of contract.tools) {
  assert.ok(frontDoor.includes(`href="${tool.path}"`), `${tool.id} must be directly actionable from the homepage`);
  assert.ok(frontDoor.includes(tool.label), `${tool.id} must use the task-oriented public label`);
}
for (const item of contract.trustItems) {
  assert.ok(frontDoor.includes(item), `trust strip must preserve: ${item}`);
}

assert.ok(frontDoor.includes('href="knowledge/"'), 'front door must route to the existing Research Library');
for (const pillar of contract.library.activePillars) {
  assert.ok(frontDoor.includes(`href="${pillar.path}"`), `front door must link active pillar ${pillar.path}`);
}
assert.ok(!frontDoor.includes('href="library/"'), 'front door must not create a duplicate library architecture');
assert.ok(!html.includes('aria-labelledby="h-tools"'), 'the lower duplicate tool section must be removed from generated output');
assert.ok(html.indexOf('product-front-door') < html.indexOf('home-ledger'), 'tools and knowledge must appear before audience and capability proof');
assert.ok(html.indexOf('product-front-door') < html.indexOf('home-principal-profile'), 'Principal Consultant metrics must remain secondary to the product front door');
assert.equal((html.match(/<span class="icn" aria-hidden="true">/g) || []).length, 0, 'template-era audience emoji markers must be absent from generated output');

const primaryNav = html.match(/<nav id="nav" class="site-nav" aria-label="Primary">\s*(<ul>[\s\S]*?<\/ul>)/)?.[1] || '';
assert.ok(primaryNav, 'homepage must expose one deterministic primary-navigation list');
assert.equal((primaryNav.match(/<li>/g) || []).length, 6, 'homepage navigation must contain exactly six clean top-level destinations');
for (const [path, label] of [
  ['about/', 'About'],
  ['services/', 'Services'],
  ['tools/', 'Tools'],
  ['knowledge/', 'Library'],
  ['insights/', 'Insights'],
  ['contact/', 'Contact'],
]) {
  assert.ok(primaryNav.includes(`href="${path}"`), `${label} must remain directly available in the homepage navigation`);
}
assert.ok(!primaryNav.includes('Our Work'), 'homepage navigation must remove the crowded Our Work dropdown');
assert.ok(!primaryNav.includes('Find your route'), 'homepage navigation list must not include the route-finder label');
assert.ok(!primaryNav.includes('Research Library'), 'homepage navigation must use the concise Library label');
assert.equal((html.match(/data-site-guide/g) || []).length, 1, 'homepage must preserve exactly one governed route helper');
assert.ok(html.includes('class="nav-guide nav-guide--compact"'), 'route helper must render as a separate compact utility');
assert.ok(html.indexOf('</ul>') < html.indexOf('nav-guide--compact'), 'compact route helper must sit outside the six-link navigation list');

assert.equal(proof.version, 1, 'homepage proof system must expose its governed version');
assert.equal(proof.status, 'pilot', 'proof-system refinement must remain explicitly classified as a pilot');
assert.equal(proof.signals.length, 4, 'compact proof band must expose exactly four high-signal items');
assert.equal(new Set(proof.signals.map((signal) => signal.id)).size, 4, 'proof signal IDs must be unique');

const proofMatch = html.match(/<div class="home-proof-system"[\s\S]*?<\/details><\/div>/);
assert.ok(proofMatch, 'generated homepage must contain the compact institutional proof system');
const proofSystem = proofMatch[0];
const proofBand = proofSystem.split('<details class="home-principal-profile">')[0];
const profilePanel = proofSystem.slice(proofSystem.indexOf('<details class="home-principal-profile">'));

assert.equal((proofBand.match(/data-proof-signal=/g) || []).length, 4, 'proof band must render four infographic signals');
for (const signal of proof.signals) {
  assert.ok(proofBand.includes(`data-proof-signal="${signal.id}"`), `${signal.id} must render in the compact proof band`);
  assert.ok(proofBand.includes(signal.title), `${signal.id} must use its governed public title`);
  assert.ok(proofBand.includes(`href="${signal.path}"`), `${signal.id} must link to inspectable evidence`);
}
assert.ok(!proofBand.includes('30+'), 'the compact institutional proof band must not lead with the modest founder-project count');
assert.ok(!proofBand.includes('h-index'), 'the compact institutional proof band must not lead with personal bibliometric metrics');
assert.ok(!html.includes('home-capability-card'), 'oversized legacy evidence cards must be removed from generated output');
assert.ok(!html.includes('home-academic-record'), 'legacy always-open academic strip must be removed from generated output');

assert.ok(profilePanel.startsWith('<details class="home-principal-profile">'), 'Principal Consultant evidence must use a native expandable disclosure');
assert.ok(!profilePanel.startsWith('<details class="home-principal-profile" open'), 'Principal Consultant detail must remain collapsed by default');
for (const role of proof.profile.roles) {
  assert.ok(profilePanel.includes(role), `expanded profile must preserve verified role: ${role}`);
}
for (const metric of proof.profile.metrics) {
  assert.ok(profilePanel.includes(`data-fact="${metric.factPath}"`), `expanded profile must preserve governed metric ${metric.factPath}`);
}
for (const item of proof.profile.experience) {
  assert.ok(profilePanel.includes(item.value), `expanded profile must preserve contextual experience value ${item.value}`);
  assert.ok(profilePanel.includes(item.boundary), `expanded profile must expose the boundary for ${item.value}`);
}
assert.ok(profilePanel.includes('not Gurjas organisational performance metrics'), 'expanded metrics must remain separated from organisational performance');

assert.ok(html.includes('assets/home-institutional.css?v=2'), 'homepage must load the final institutional presentation layer');
assert.ok(html.includes('assets/product-front-door.css?v=2'), 'homepage must retain the governed product-front-door stylesheet');
assert.ok(html.includes('assets/home-proof-refinement.css?v=1'), 'homepage must retain the governed proof-system stylesheet');
assert.ok(html.includes('assets/site-nav-compact.css?v=1'), 'homepage must load the shared compact route-utility stylesheet');
assert.ok(html.includes('assets/product-front-door.js?v=1'), 'homepage must load the local-only task filter');
assert.ok(!html.includes('assets/capability-metrics.css?v=1'), 'generated homepage must not load the superseded capability-card stylesheet');
assert.match(html, /<title>Free Research Tools and Reviewed Research Library \| Gurjas<\/title>/, 'homepage title must describe the product front door');

for (const claim of contract.prohibitedClaims) {
  assert.ok(!html.toLowerCase().includes(claim.toLowerCase()), `homepage must exclude unsupported claim: ${claim}`);
}
assert.ok(!/₹499|pro subscription|five uses per day|5 uses\/day|create an account/i.test(frontDoor), 'pilot front door must not introduce unvalidated monetisation or account gates');

console.log('Institutional product front door, compact navigation and governed proof system passed.');
