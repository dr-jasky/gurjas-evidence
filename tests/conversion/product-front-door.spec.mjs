import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync('data/product-front-door.json', 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync('data/knowledge-taxonomy.json', 'utf8'));
const html = fs.readFileSync('_site/index.html', 'utf8');

assert.equal(contract.version, 1, 'product front door must expose its governed version');
assert.equal(contract.status, 'pilot', 'front-door launch must remain explicitly classified as a pilot');
assert.equal(contract.tools.length, 11, 'front door must expose all eleven governed public tools');
assert.equal(new Set(contract.tools.map((tool) => tool.id)).size, 11, 'tool IDs must be unique');
assert.equal(new Set(contract.tools.map((tool) => tool.path)).size, 11, 'tool paths must be unique');

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

assert.ok(frontDoor.includes('Every research task.'), 'homepage must lead with the approved task-first proposition');
assert.ok(frontDoor.includes('One verified toolkit.'), 'homepage must retain the governed verification promise');
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
assert.ok(html.indexOf('product-front-door') < html.indexOf('home-academic-record'), 'founder academic metrics must no longer be the homepage front door');
assert.ok(html.includes('<a href="knowledge/">Research Library</a>'), 'homepage navigation must expose the Research Library label');
assert.ok(html.includes('assets/product-front-door.css?v=1'), 'homepage must load the governed front-door stylesheet');
assert.ok(html.includes('assets/product-front-door.js?v=1'), 'homepage must load the local-only task filter');
assert.match(html, /<title>Free Research Tools and Reviewed Research Library \| Gurjas<\/title>/, 'homepage title must describe the product front door');

for (const claim of contract.prohibitedClaims) {
  assert.ok(!html.toLowerCase().includes(claim.toLowerCase()), `homepage must exclude unsupported claim: ${claim}`);
}
assert.ok(!/₹499|pro subscription|five uses per day|5 uses\/day|create an account/i.test(frontDoor), 'pilot front door must not introduce unvalidated monetisation or account gates');

console.log('Product front-door contract passed for eleven tools, the governed Research Library and evidence-bounded homepage positioning.');
