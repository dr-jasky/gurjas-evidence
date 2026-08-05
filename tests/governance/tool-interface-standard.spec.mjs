import assert from 'node:assert/strict';
import fs from 'node:fs';

const standard = JSON.parse(fs.readFileSync('data/tool-interface-standard.json', 'utf8'));
const contracts = JSON.parse(fs.readFileSync('data/tool-contracts.json', 'utf8'));
const buildSource = fs.readFileSync('scripts/build_site.py', 'utf8');
const composerSource = fs.readFileSync('scripts/tool_standard_composition.py', 'utf8');
const panelCss = fs.readFileSync('assets/tool-standard.css', 'utf8');

assert.equal(standard.schemaVersion, '1.0', 'tool standard must expose a stable schema version');
assert.equal(contracts.tools.length, 11, 'the public inventory must retain exactly eleven governed tools');
assert.deepEqual(new Set(contracts.tools.map((tool) => tool.id)).size, 11, 'tool IDs must be unique');
assert.deepEqual(new Set(contracts.tools.map((tool) => tool.url)).size, 11, 'tool URLs must be unique');
assert.ok(buildSource.includes('compose_tool_standard'), 'the authoritative builder must compose the visible tool standard');
assert.ok(buildSource.includes('standard_count != 11'), 'the build must fail closed unless all eleven panels are composed');
assert.ok(composerSource.includes('data-tool-standard="1"'), 'the composer requires one stable public panel marker');
assert.ok(panelCss.includes('.tool-standard__boundary'), 'the shared stylesheet must expose the decision boundary visibly');
assert.ok(panelCss.includes('@media print'), 'the shared standard must remain printable');

const allowedMaturity = new Set(standard.allowedMaturity);
const semanticVersion = /^\d+(?:\.\d+)+(?:-[a-z0-9.-]+)?$/i;
const datedSnapshot = /^\d{4}-\d{2} snapshot$/;
const prohibitedClaims = /guaranteed acceptance|guaranteed publication|guaranteed accreditation|certified legitimate|safe to pay|100% success/i;

for (const tool of contracts.tools) {
  for (const field of standard.requiredContractFields) {
    assert.ok(Object.hasOwn(tool, field), `${tool.id} is missing required contract field ${field}`);
  }

  assert.ok(allowedMaturity.has(tool.status), `${tool.id} uses unsupported maturity ${tool.status}`);
  assert.match(tool.reviewed, /^\d{4}-\d{2}-\d{2}$/, `${tool.id} requires an ISO review date`);

  const versionRule = standard.versionRules[tool.status];
  assert.ok(versionRule, `${tool.id} maturity ${tool.status} requires an explicit version rule`);
  if (versionRule === 'semantic-version') {
    assert.match(tool.methodVersion, semanticVersion, `${tool.id} requires a semantic method version`);
  } else if (versionRule === 'dated-snapshot') {
    assert.match(tool.methodVersion, datedSnapshot, `${tool.id} requires a governed YYYY-MM snapshot version`);
    assert.equal(tool.methodVersion.slice(0, 7), tool.reviewed.slice(0, 7), `${tool.id} snapshot month must match its review month`);
  } else {
    assert.fail(`${tool.id} uses unsupported version rule ${versionRule}`);
  }

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

  const generatedPath = `_site${tool.url}index.html`;
  if (fs.existsSync(generatedPath)) {
    const page = fs.readFileSync(generatedPath, 'utf8');
    assert.equal((page.match(/data-tool-standard="1"/g) || []).length, 1, `${tool.id} must render exactly one governed standard panel`);
    assert.ok(page.includes('tool-standard.css?v=1'), `${tool.id} must load the shared standard stylesheet`);
    assert.ok(page.includes(tool.methodVersion), `${tool.id} must expose its governed version`);
    assert.ok(page.includes(tool.reviewed), `${tool.id} must expose its review date`);
    assert.ok(page.includes('Decision boundary'), `${tool.id} must expose its decision boundary`);
    assert.ok(page.includes('Privacy and processing'), `${tool.id} must expose privacy and processing`);
  }
}

assert.equal(standard.privacyRules.length, 4, 'privacy standard must remain explicit and compact');
assert.ok(standard.claimRules.length >= 3, 'claim standard must prohibit unsupported verdicts');
assert.ok(standard.exportRules.permitted.includes('local JSON'), 'inspectable local JSON export must remain permitted');
assert.ok(standard.exportRules.prohibited.includes('remote storage by default'), 'remote default storage must remain prohibited');

console.log('Gurjas Tool Standard passed for eleven governed tools and their shared visible method, evidence, privacy and decision-boundary panels.');
