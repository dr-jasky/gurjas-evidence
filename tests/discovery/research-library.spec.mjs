import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const registry = JSON.parse(fs.readFileSync('data/library-entries.json', 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync('data/knowledge-taxonomy.json', 'utf8'));
const indexHtml = fs.readFileSync('_site/knowledge/index.html', 'utf8');
const loopCss = fs.readFileSync('assets/tool-evidence-loop.css', 'utf8');
const allowedTypes = new Set(taxonomy.contentTypes);
const activePillars = new Set(taxonomy.pillars.filter((pillar) => pillar.status === 'active').map((pillar) => pillar.id));
const ids = new Set();
const paths = new Set();
const pillarCounts = new Map();
const evidenceByDestination = new Map();
const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#x27;');

assert.equal(registry.version, 1, 'library registry must use governed version 1');
assert.equal(registry.publicLabel, 'Research Library', 'registry must preserve the public label');
assert.equal(registry.entries.length, 12, 'governed registry must contain exactly twelve substantive entries');
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
  const destinationEntries = evidenceByDestination.get(entry.relatedTool) || [];
  destinationEntries.push(entry);
  evidenceByDestination.set(entry.relatedTool, destinationEntries);

  const outputPath = path.join('_site', entry.path, 'index.html');
  assert.ok(fs.existsSync(outputPath), `${entry.id} must build to its canonical route`);
  const html = fs.readFileSync(outputPath, 'utf8');

  assert.ok(html.includes(`<link rel="canonical" href="https://gurjas.org/${entry.path}">`), `${entry.id} requires its canonical URL`);
  assert.ok(html.includes('<strong>Direct answer</strong>'), `${entry.id} requires a direct answer`);
  assert.ok(html.includes('Evidence boundary'), `${entry.id} requires an explicit evidence boundary`);
  assert.ok(html.includes('Primary source') || html.includes('Official source') || html.includes('Primary research'), `${entry.id} requires a visible source section`);
  assert.ok(/Retrieved (4|5) August 2026/.test(html) || html.includes('doi.org/'), `${entry.id} must date web-source retrieval or provide DOI-linked primary research`);
  assert.ok(html.includes('data-copy-citation'), `${entry.id} requires a copyable citation`);
  assert.ok(html.includes('data-print-entry'), `${entry.id} requires a print control`);
  assert.ok(html.includes('../../../assets/research-library.js?v=1'), `${entry.id} must load the governed local interaction script`);
  assert.ok(html.includes('../../../assets/research-library.css?v=1'), `${entry.id} must load the governed entry stylesheet`);
  assert.ok(html.includes(`href="../../../${entry.relatedTool}"`) || html.includes(`href="../../../${entry.relatedTool.replace(/\/$/, '')}/"`), `${entry.id} must link its registered practical route`);
  assert.ok(html.includes('"@type":"Article"'), `${entry.id} must expose conservative Article semantics`);
  assert.ok(!/guaranteed|100% accurate|definitive blacklist|always sufficient/i.test(html), `${entry.id} contains an unsupported certainty claim`);
}

assert.equal(evidenceByDestination.size, 8, 'twelve governed entries must resolve to eight practical destinations');
for (const [destination, entries] of evidenceByDestination) {
  const outputPath = path.join('_site', destination, 'index.html');
  assert.ok(fs.existsSync(outputPath), `${destination} must exist as an evidence-linked practical route`);
  const html = fs.readFileSync(outputPath, 'utf8');
  const depth = destination.split('/').filter(Boolean).length;
  const root = '../'.repeat(depth);

  assert.equal((html.match(/class="tool-evidence-loop"/g) || []).length, 1, `${destination} must expose one evidence loop`);
  assert.equal((html.match(/class="tool-evidence-loop__card"/g) || []).length, entries.length, `${destination} must expose every registered evidence card`);
  assert.ok(html.includes(`${root}assets/tool-evidence-loop.css?v=1`), `${destination} must load the local evidence-loop stylesheet`);
  assert.ok(html.includes('Evidence behind this tool'), `${destination} must label the evidence relationship`);
  assert.ok(html.includes('Use the result. Check the reasoning.'), `${destination} must explain the reciprocal workflow`);
  assert.ok(html.includes('not an automatic verdict'), `${destination} must preserve the decision-aid boundary`);
  assert.ok(html.includes('quality, validity, eligibility, acceptance or institutional approval'), `${destination} must disclose what tool output cannot establish`);
  assert.ok(!/guaranteed|certified result|institutionally approved/i.test(html), `${destination} contains an unsupported outcome claim`);

  for (const entry of entries) {
    assert.ok(html.includes(escapeHtml(entry.title)), `${destination} must name ${entry.id}`);
    assert.ok(html.includes(`href="${root}${entry.path}"`), `${destination} must link back to ${entry.id}`);
    assert.ok(html.includes(`${entry.type} · v${entry.version}`), `${destination} must expose ${entry.id} version metadata`);
    assert.ok(html.includes(`${entry.sourceCount} cited sources · reviewed ${entry.reviewed}`), `${destination} must expose ${entry.id} source and review metadata`);
  }
}

assert.match(loopCss, /body:not\(\.home\):not\(\.offer\) main section\.tool-evidence-loop/, 'evidence loop must outrank the global non-home section background');
assert.match(loopCss, /@media \(prefers-reduced-motion: no-preference\)/, 'evidence loop motion must be opt-in');
assert.match(loopCss, /@media \(forced-colors: active\)/, 'evidence loop must support forced colours');

assert.equal(pillarCounts.get('research-integrity'), 6, 'research integrity must contain six governed entries');
assert.equal(pillarCounts.get('research-design'), 6, 'research design must contain six governed entries');
assert.equal((indexHtml.match(/class="library-card" href="library\//g) || []).length, 12, 'library index must expose all twelve entry routes');
assert.ok(indexHtml.includes('Answers that show their evidence.'), 'library index must lead with the evidence-first proposition');
assert.ok(indexHtml.includes('Twelve substantive entries are live.'), 'library index must state the bounded twelve-entry corpus');
assert.ok(!indexHtml.includes('<input'), 'the twelve-entry release must not add premature search controls');

console.log('Research Library contract passed for twelve governed entries and eight reciprocal practical evidence routes.');
