import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const standard = JSON.parse(fs.readFileSync('data/tool-interface-standard.json', 'utf8'));
const contracts = JSON.parse(fs.readFileSync('data/tool-contracts.json', 'utf8'));
const css = fs.readFileSync('assets/tool-standard-panel.css', 'utf8');

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#x27;');

assert.equal(standard.interfaceComponent?.version, '1.0', 'shared interface component requires a governed version');
assert.ok(standard.requiredPageSignals?.standardPanel, 'tool standard must require the shared disclosure panel');
assert.equal(contracts.tools.length, 11, 'shared disclosure panel must cover exactly eleven tools');

for (const tool of contracts.tools) {
  const relativeRoute = tool.url.replace(/^\/+/, '');
  const outputPath = path.join('_site', relativeRoute, 'index.html');
  assert.ok(fs.existsSync(outputPath), `${tool.id} must build to its governed route`);

  const html = fs.readFileSync(outputPath, 'utf8');
  const markerCount = (html.match(/data-tool-standard="1"/g) || []).length;
  const stylesheetCount = (html.match(/assets\/tool-standard-panel\.css\?v=1/g) || []).length;

  assert.equal(markerCount, 1, `${tool.id} must expose exactly one shared disclosure panel`);
  assert.equal(stylesheetCount, 1, `${tool.id} must load the shared disclosure stylesheet once`);
  assert.ok(html.includes(`data-tool-standard-version="${standard.interfaceComponent.version}"`), `${tool.id} must expose the component version`);
  assert.ok(html.includes(`data-tool-id="${tool.id}"`), `${tool.id} must expose its governed identity`);
  assert.ok(html.includes(`data-tool-status="${tool.status}"`), `${tool.id} must expose its maturity state`);
  assert.ok(html.includes('Gurjas Tool Standard'), `${tool.id} must visibly label the shared standard`);
  assert.ok(html.includes('How to read this tool'), `${tool.id} must frame the disclosure for users`);
  assert.ok(html.includes('<dt>Maturity</dt>'), `${tool.id} must label maturity`);
  assert.ok(html.includes(tool.status === 'living-resource' ? '<dt>Snapshot</dt>' : '<dt>Method version</dt>'), `${tool.id} must label its governed version`);
  assert.ok(html.includes('<dt>Reviewed</dt>'), `${tool.id} must label the review date`);
  assert.ok(html.includes('<dt>Processing</dt>'), `${tool.id} must label the processing model`);
  assert.ok(html.includes('Evidence basis'), `${tool.id} must label its evidence basis`);
  assert.ok(html.includes('Privacy'), `${tool.id} must label its privacy boundary`);
  assert.ok(html.includes('Limitations'), `${tool.id} must label its limitations`);
  assert.ok(html.includes('Decision boundary'), `${tool.id} must label its decision boundary`);

  for (const value of [
    tool.purpose,
    tool.methodVersion,
    tool.reviewed,
    tool.userDataStorage,
    tool.limitations,
    tool.decisionBoundary,
  ]) {
    assert.ok(html.includes(escapeHtml(value)), `${tool.id} must render its governed contract text`);
  }

  for (const source of tool.sources) {
    assert.ok(html.includes(escapeHtml(source.name)), `${tool.id} must name evidence source ${source.name}`);
    assert.ok(html.includes(escapeHtml(source.access)), `${tool.id} must disclose the access mode for ${source.name}`);
  }

  const panelIndex = html.indexOf('data-tool-standard="1"');
  const evidenceLoopIndex = html.indexOf('class="tool-evidence-loop"');
  if (evidenceLoopIndex !== -1) {
    assert.ok(panelIndex < evidenceLoopIndex, `${tool.id} standard disclosure must precede the reciprocal Library evidence panel`);
  }

  const panelStart = html.lastIndexOf('<section class="tool-standard-panel"', panelIndex);
  const panelEnd = html.indexOf('</section>', panelIndex);
  const panelOpening = html.slice(panelStart, panelIndex + 80);
  assert.ok(!/\bhidden\b|aria-hidden="true"/.test(panelOpening), `${tool.id} disclosure must not be hidden or collapsed`);
  assert.ok(panelEnd > panelIndex, `${tool.id} disclosure must be valid visible content`);
}

assert.match(css, /main section\.tool-standard-panel/, 'shared panel must outrank generic section backgrounds');
assert.match(css, /@media \(max-width: 620px\)/, 'shared panel requires a mobile layout');
assert.match(css, /@media print/, 'shared panel requires a printable treatment');
assert.match(css, /@media \(forced-colors: active\)/, 'shared panel must support forced colours');
assert.doesNotMatch(css, /\.tool-standard-panel[^{]*\{[^}]*display:\s*none/is, 'shared panel must never be hidden by its own stylesheet');

console.log('Shared Gurjas Tool Standard disclosure panel passed across all eleven governed tools.');
