import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = JSON.parse(fs.readFileSync('data/case-notes.json', 'utf8'));
assert.equal(registry.version, 1, 'case-note registry must expose version 1');
assert.equal(registry.privacyStandard.directIdentifiers, 'prohibited');
assert.equal(registry.privacyStandard.privateResearchData, 'prohibited');
assert.ok(registry.entries.length >= 1, 'at least one substantive case note must be registered');

const ids = new Set();
for (const entry of registry.entries) {
  assert.ok(!ids.has(entry.id), `${entry.id} must be unique`);
  ids.add(entry.id);
  assert.equal(entry.type, 'composite', `${entry.id} must disclose its composite basis`);
  assert.match(entry.version, /^\d+\.\d+$/, `${entry.id} must be versioned`);
  assert.ok(entry.privacyBoundary && entry.claimBoundary, `${entry.id} requires explicit boundaries`);
  const html = fs.readFileSync(entry.path + 'index.html', 'utf8');
  assert.ok(html.includes('Composite account'), `${entry.id} must visibly disclose its basis`);
  assert.ok(html.includes('Privacy and evidence boundary'), `${entry.id} must expose its privacy boundary`);
  assert.ok(html.includes('What this case note cannot establish'), `${entry.id} must expose its claim boundary`);
  assert.ok(!/guaranteed acceptance|guaranteed completion|100% success|named client|confidential dataset/i.test(html), `${entry.id} contains a prohibited claim or private-data cue`);
}

const pathway = fs.readFileSync('knowledge/institutional-pathways/index.html', 'utf8');
for (const entry of registry.entries) {
  const relative = entry.path.replace('knowledge/institutional-pathways/', '');
  assert.ok(pathway.includes(relative), `${entry.id} must have an inbound institutional-pathway link`);
}

console.log(`Anonymised case-note governance passed for ${registry.entries.length} composite entry.`);
