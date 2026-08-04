import assert from 'node:assert/strict';
import fs from 'node:fs';

const taxonomy = JSON.parse(fs.readFileSync('data/knowledge-taxonomy.json', 'utf8'));
const html = fs.readFileSync('_site/knowledge/index.html', 'utf8');
const active = taxonomy.pillars.filter((pillar) => pillar.status === 'active');
const planned = taxonomy.pillars.filter((pillar) => pillar.status === 'planned');

assert.equal(taxonomy.version, 1, 'knowledge taxonomy must expose a version');
assert.equal(taxonomy.pillars.length, 6, 'knowledge hub must retain six governed pillars');
assert.equal(active.length, 2, 'only two pilot pillars may launch as active');
assert.equal(planned.length, 4, 'four pillars must remain explicitly planned');
assert.deepEqual(new Set(taxonomy.contentTypes).size, taxonomy.contentTypes.length, 'content types must be unique');
assert.deepEqual(taxonomy.dateFields, ['published', 'reviewed', 'updated'], 'date semantics must remain explicit');

for (const pillar of taxonomy.pillars) {
  assert.ok(pillar.id && pillar.title && pillar.summary, `${pillar.id || 'pillar'} must be fully described`);
  assert.ok(['active', 'planned'].includes(pillar.status), `${pillar.id} uses an unsupported status`);
  assert.ok(Array.isArray(pillar.entryPoints) && pillar.entryPoints.length >= 2, `${pillar.id} requires meaningful entry points`);
  assert.ok(html.includes(pillar.title), `${pillar.id} must appear on the hub`);
}

assert.equal((html.match(/class="pillar-card"/g) || []).length, 2, 'exactly two active pillar links must render');
assert.equal((html.match(/pillar-card pillar-card--planned/g) || []).length, 4, 'planned pillars must render as non-link roadmap cards');
assert.ok(html.includes('Published') && html.includes('Reviewed') && html.includes('Updated'), 'date governance must be visible');
assert.ok(html.includes('CollectionPage'), 'knowledge hub must expose conservative collection-page semantics');
assert.ok(!html.includes('Search the knowledge hub'), 'search must not launch before the corpus warrants it');
assert.ok(!/guaranteed|market leader|best consultancy/i.test(html), 'knowledge hub must avoid unsupported promotional claims');

console.log('Knowledge foundation passed for six governed pillars, two active pilots and four planned areas.');
