import assert from 'node:assert/strict';
import fs from 'node:fs';

const standard = JSON.parse(fs.readFileSync('data/tool-interface-standard.json', 'utf8'));
const contracts = JSON.parse(fs.readFileSync('data/tool-contracts.json', 'utf8'));

assert.equal(standard.schemaVersion, '1.0', 'tool standard must expose a stable schema version');
assert.equal(contracts.tools.length, 11, 'the public inventory must retain exactly eleven governed tools');
assert.deepEqual(new Set(contracts.tools.map((tool) => tool.id)).size, 11, 'tool IDs must be unique');
assert.deepEqual(new Set(contracts.tools.map((tool) => tool.url)).size, 11, 'tool URLs must be unique');

const allowedMaturity = new Set(standard.allowedMaturity);
const prohibitedClaims = /guaranteed acceptance|guaranteed publication|guaranteed accreditation|certified legitimate|safe to pay|100% success/i;

for (const tool of contracts.tools) {
  for (const field of standard.requiredContractFields) {
    assert.ok(Object.hasOwn(tool, field), `${tool.id} is missing required contract field ${field}`);
  }

  assert.ok(allowedMaturity.has(tool.status), `${tool.id} uses unsupported maturity ${tool.status}`);
  assert.match(tool.methodVersion, /^\d+(?:\.\d+)+(?:-[a-z0-9.-]+)?$/i, `${tool.id} requires a governed method version`);
  assert.match(tool.reviewed, /^\d{4}-\d{2}-\d{2}$/, `${tool.id} requires an ISO review date`);
  assert.match(tool.url, /^\/tools\/[a-z0-9-]+\/$/, `${tool.id} requires a canonical tool route`);
  assert.ok(tool.purpose.length >= 25, `${tool.id} requires a substantive purpose statement`);
  assert.ok(tool.processing.length >= 10, `${tool.id} requires a disclosed processing model`);
  assert.ok(Array.isArray(tool.outboundRequests), `${tool.id} outboundRequests must be an array`);
  assert.ok(Array.isArray(tool.sources) && tool.sources.length >= 1, `${tool.id} requires at least one evidence source`);
  assert.ok(Array.isArray(tool.outputs) && tool.outputs.length >= 1, `${tool.id} requires at least one named output`);
  assert.ok(Array.isArray(tool.notChecked) && tool.notChecked.length >= 1, `${tool.id} requires explicit evidence boundaries`);
  assert.ok(tool.limitations.length >= 40, `${tool.id} requires a substantive limitation`);
  assert.ok(tool.decisionBoundary.length >= 30, `${tool.id} requires an explicit decision boundary`);
  assert.ok(tool.userDataStorage.length >= 20, `${tool.id} requires a privacy statement`);

  const combined = [tool.purpose, tool.limitations, tool.decisionBoundary, ...tool.outputs].join(' ');
  assert.ok(!prohibitedClaims.test(combined), `${tool.id} contains an unsupported outcome claim`);

  for (const request of tool.outboundRequests) {
    assert.ok(request.recipient && request.data && request.trigger && request.url, `${tool.id} must disclose every outbound request completely`);
    assert.match(request.url, /^https:\/\//, `${tool.id} outbound recipient must use HTTPS`);
  }

  for (const source of tool.sources) {
    assert.ok(source.name && source.url && source.access, `${tool.id} evidence sources require name, URL and access mode`);
  }
}

assert.equal(standard.privacyRules.length, 4, 'privacy standard must remain explicit and compact');
assert.ok(standard.claimRules.length >= 3, 'claim standard must prohibit unsupported verdicts');
assert.ok(standard.exportRules.permitted.includes('local JSON'), 'inspectable local JSON export must remain permitted');
assert.ok(standard.exportRules.prohibited.includes('remote storage by default'), 'remote default storage must remain prohibited');

console.log('Gurjas Tool Standard passed for eleven governed tools, including maturity, evidence, privacy, limitations, decisions and export boundaries.');
