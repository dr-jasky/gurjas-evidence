import assert from 'node:assert/strict';
import fs from 'node:fs';

const taxonomy = JSON.parse(fs.readFileSync('data/knowledge-taxonomy.json', 'utf8'));
const html = fs.readFileSync('_site/knowledge/index.html', 'utf8');
const active = taxonomy.pillars.filter((pillar) => pillar.status === 'active');
const planned = taxonomy.pillars.filter((pillar) => pillar.status === 'planned');
const pillarIds = new Set(taxonomy.pillars.map((pillar) => pillar.id));

assert.equal(taxonomy.version, 2, 'knowledge taxonomy must expose the governed version-2 contract');
assert.equal(taxonomy.pillars.length, 6, 'knowledge hub must retain six governed pillars');
assert.equal(active.length, 2, 'only two pilot pillars may launch as active');
assert.equal(planned.length, 4, 'four pillars must remain explicitly planned');
assert.deepEqual(new Set(taxonomy.contentTypes).size, taxonomy.contentTypes.length, 'content types must be unique');
assert.deepEqual(taxonomy.dateFields, ['published', 'reviewed', 'updated'], 'date semantics must remain explicit');
assert.equal(taxonomy.institutionalPathways, 'knowledge/institutional-pathways/', 'institutional pathways must retain a canonical route');
assert.ok(Array.isArray(taxonomy.resources) && taxonomy.resources.length === 2, 'version 2 must register the two governed launch resources');

for (const pillar of taxonomy.pillars) {
  assert.ok(pillar.id && pillar.title && pillar.summary, `${pillar.id || 'pillar'} must be fully described`);
  assert.ok(['active', 'planned'].includes(pillar.status), `${pillar.id} uses an unsupported status`);
  assert.ok(Array.isArray(pillar.entryPoints) && pillar.entryPoints.length >= 2, `${pillar.id} requires meaningful entry points`);
  assert.ok(html.includes(pillar.title), `${pillar.id} must appear on the hub`);
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

assert.equal((html.match(/class="pillar-card"/g) || []).length, 2, 'exactly two active pillar links must render');
assert.equal((html.match(/pillar-card pillar-card--planned/g) || []).length, 4, 'planned pillars must render as non-link roadmap cards');
assert.ok(html.includes('Published') && html.includes('Reviewed') && html.includes('Updated'), 'date governance must be visible');
assert.ok(html.includes('CollectionPage'), 'knowledge hub must expose conservative collection-page semantics');
assert.ok(!html.includes('Search the knowledge hub'), 'search must not launch before the corpus warrants it');
assert.ok(!/guaranteed|market leader|best consultancy/i.test(html), 'knowledge hub must avoid unsupported promotional claims');

console.log('Knowledge foundation version 2 passed for six governed pillars, two active pilots, four planned areas and two governed resources.');
