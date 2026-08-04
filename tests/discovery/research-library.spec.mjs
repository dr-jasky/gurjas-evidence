import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const registry = JSON.parse(fs.readFileSync('data/library-entries.json', 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync('data/knowledge-taxonomy.json', 'utf8'));
const indexHtml = fs.readFileSync('_site/knowledge/index.html', 'utf8');
const allowedTypes = new Set(taxonomy.contentTypes);
const activePillars = new Set(taxonomy.pillars.filter((pillar) => pillar.status === 'active').map((pillar) => pillar.id));
const ids = new Set();
const paths = new Set();
const pillarCounts = new Map();

assert.equal(registry.version, 1, 'library registry must use governed version 1');
assert.equal(registry.publicLabel, 'Research Library', 'registry must preserve the public label');
assert.equal(registry.entries.length, 6, 'launch registry must contain exactly six flagship entries');
assert.ok(registry.reviewPolicy?.published && registry.reviewPolicy?.reviewed && registry.reviewPolicy?.updated, 'review policy must define all three date fields');

for (const entry of registry.entries) {
  assert.ok(entry.id && entry.title && entry.path && entry.pillar && entry.type, 'every entry requires identity, route, pillar and type');
  assert.ok(!ids.has(entry.id), `${entry.id} must be unique`);
  assert.ok(!paths.has(entry.path), `${entry.path} must be unique`);
  ids.add(entry.id);
  paths.add(entry.path);

  assert.ok(activePillars.has(entry.pillar), `${entry.id} must belong to an active pillar`);
  assert.ok(allowedTypes.has(entry.type), `${entry.id} uses an unsupported content type`);
  assert.match(entry.version, /^\d+\.\d+$/, `${entry.id} must expose a semantic version`);
  assert.match(entry.published, /^\d{4}-\d{2}-\d{2}$/, `${entry.id} needs an ISO published date`);
  assert.match(entry.reviewed, /^\d{4}-\d{2}-\d{2}$/, `${entry.id} needs an ISO reviewed date`);
  assert.ok(entry.updated === null || /^\d{4}-\d{2}-\d{2}$/.test(entry.updated), `${entry.id} has an invalid updated date`);
  assert.ok(entry.relatedTool, `${entry.id} requires a related practical route`);
  assert.ok(entry.sourceCount >= 2, `${entry.id} requires at least two primary or official sources`);

  pillarCounts.set(entry.pillar, (pillarCounts.get(entry.pillar) || 0) + 1);

  const outputPath = path.join('_site', entry.path, 'index.html');
  assert.ok(fs.existsSync(outputPath), `${entry.id} must build to its canonical route`);
  const html = fs.readFileSync(outputPath, 'utf8');

  assert.ok(html.includes(`<link rel="canonical" href="https://gurjas.org/${entry.path}">`), `${entry.id} requires its canonical URL`);
  assert.ok(html.includes('<strong>Direct answer</strong>'), `${entry.id} requires a direct answer`);
  assert.ok(html.includes('Evidence boundary'), `${entry.id} requires an explicit evidence boundary`);
  assert.ok(html.includes('Primary source') || html.includes('Official source') || html.includes('Primary research'), `${entry.id} requires a visible source section`);
  assert.ok(html.includes('Retrieved 4 August 2026') || entry.id === 'sem-sample-size-planning', `${entry.id} must date web-source retrieval or provide DOI-linked primary research`);
  assert.ok(html.includes('data-copy-citation'), `${entry.id} requires a copyable citation`);
  assert.ok(html.includes('data-print-entry'), `${entry.id} requires a print control`);
  assert.ok(html.includes('../../../assets/research-library.js?v=1'), `${entry.id} must load the governed local interaction script`);
  assert.ok(html.includes('../../../assets/research-library.css?v=1'), `${entry.id} must load the governed entry stylesheet`);
  assert.ok(html.includes(`href="../../../${entry.relatedTool}"`) || html.includes(`href="../../../${entry.relatedTool.replace(/\/$/, '')}/"`), `${entry.id} must link its registered practical route`);
  assert.ok(html.includes('"@type":"Article"'), `${entry.id} must expose conservative Article semantics`);
  assert.ok(!/guaranteed|100% accurate|definitive blacklist|always sufficient/i.test(html), `${entry.id} contains an unsupported certainty claim`);
}

assert.equal(pillarCounts.get('research-integrity'), 3, 'research integrity must launch with three entries');
assert.equal(pillarCounts.get('research-design'), 3, 'research design must launch with three entries');
assert.equal((indexHtml.match(/class="library-card" href="library\//g) || []).length, 6, 'library index must expose all six entry routes');
assert.ok(indexHtml.includes('Answers that show their evidence.'), 'library index must lead with the evidence-first proposition');
assert.ok(indexHtml.includes('Six flagship entries are live.'), 'library index must state the bounded launch corpus');
assert.ok(!indexHtml.includes('<input'), 'the six-entry launch must not add premature search controls');

console.log('Research Library contract passed for six governed entries across two active pillars.');
