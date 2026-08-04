import assert from 'node:assert/strict';
import fs from 'node:fs';

const taxonomy = JSON.parse(fs.readFileSync('data/knowledge-taxonomy.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('data/library-entries.json', 'utf8'));
const html = fs.readFileSync('_site/knowledge/index.html', 'utf8');
const contrastCss = fs.readFileSync('assets/research-library-contrast.css', 'utf8');
const active = taxonomy.pillars.filter((pillar) => pillar.status === 'active');
const planned = taxonomy.pillars.filter((pillar) => pillar.status === 'planned');
const pillarIds = new Set(taxonomy.pillars.map((pillar) => pillar.id));

assert.equal(taxonomy.version, 3, 'knowledge taxonomy must expose the governed version-3 library contract');
assert.equal(taxonomy.publicLabel, 'Research Library', 'the public knowledge label must be Research Library');
assert.equal(taxonomy.pillars.length, 6, 'the library must retain six governed pillars');
assert.equal(active.length, 2, 'only two evidence pillars may be active at launch');
assert.equal(planned.length, 4, 'four pillars must remain explicitly planned');
assert.deepEqual(new Set(taxonomy.contentTypes).size, taxonomy.contentTypes.length, 'content types must be unique');
assert.deepEqual(taxonomy.dateFields, ['published', 'reviewed', 'updated'], 'date semantics must remain explicit');
assert.equal(taxonomy.institutionalPathways, 'knowledge/institutional-pathways/', 'institutional pathways must retain a canonical route');
assert.equal(taxonomy.libraryRegistry, 'data/library-entries.json', 'taxonomy must register the governed library manifest');
assert.equal(taxonomy.libraryEntryCount, registry.entries.length, 'taxonomy entry count must equal the registry');
assert.ok(Array.isArray(taxonomy.resources) && taxonomy.resources.length === 2, 'the two governed launch resources must remain registered');

for (const pillar of taxonomy.pillars) {
  assert.ok(pillar.id && pillar.title && pillar.summary, `${pillar.id || 'pillar'} must be fully described`);
  assert.ok(['active', 'planned'].includes(pillar.status), `${pillar.id} uses an unsupported status`);
  assert.ok(Array.isArray(pillar.entryPoints) && pillar.entryPoints.length >= 2, `${pillar.id} requires meaningful entry points`);
  assert.ok(html.includes(pillar.title), `${pillar.id} must appear on the library index`);
  if (pillar.status === 'active') {
    assert.ok(pillar.hub, `${pillar.id} requires a canonical pillar hub`);
    assert.ok(pillar.entryPoints.includes(pillar.hub), `${pillar.id} must expose its hub as an entry point`);
  }
}

const resourceIds = new Set();
const resourcePaths = new Set();
for (const resource of taxonomy.resources) {
  assert.ok(resource.id && resource.type && resource.version && resource.path && resource.pillar, 'every governed resource requires complete metadata');
  assert.ok(taxonomy.contentTypes.includes(resource.type), `${resource.id} uses an unsupported content type`);
  assert.match(resource.version, /^\d+\.\d+$/, `${resource.id} must expose a semantic resource version`);
  assert.ok(pillarIds.has(resource.pillar), `${resource.id} must reference a governed pillar`);
  assert.ok(!resourceIds.has(resource.id), `${resource.id} must be unique`);
  assert.ok(!resourcePaths.has(resource.path), `${resource.path} must be unique`);
  resourceIds.add(resource.id);
  resourcePaths.add(resource.path);
}

assert.equal((html.match(/class="library-card" href="library\//g) || []).length, 6, 'exactly six flagship reference cards must render');
assert.equal((html.match(/<article class="library-card">/g) || []).length, 4, 'exactly four planned pillar cards must remain non-links');
assert.ok(html.includes('Published') && html.includes('Reviewed') && html.includes('Updated'), 'date governance must be visible');
assert.ok(html.includes('CollectionPage'), 'Research Library must expose conservative collection-page semantics');
assert.ok(!html.includes('Search the Research Library'), 'search must not launch before the corpus warrants it');
assert.ok(!/guaranteed|market leader|best consultancy/i.test(html), 'Research Library must avoid unsupported promotional claims');

assert.ok(html.includes('research-library-contrast.css?v=1'), 'Library index must load the cache-safe contrast guard');
assert.match(contrastCss, /\.library-hero,[\s\S]*background-color:\s*#041226/i, 'contrast guard must force a navy hero surface');
assert.match(contrastCss, /\.library-hero h1,[\s\S]*color:\s*#ffffff\s*!important/i, 'contrast guard must force a white Library heading');
assert.match(contrastCss, /\.library-hero \.lede,[\s\S]*rgba\(255,\s*255,\s*255,\s*\.84\)\s*!important/i, 'contrast guard must preserve readable supporting copy');
assert.match(contrastCss, /@media \(forced-colors: active\)/, 'contrast guard must retain forced-colors support');

console.log('Research Library foundation version 3 passed for six entries, two active pillars, four planned areas, two governed resources and the cache-safe contrast contract.');
