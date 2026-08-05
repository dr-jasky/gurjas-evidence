import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = JSON.parse(fs.readFileSync('data/benchmark-products.json', 'utf8'));
const entityGraph = JSON.parse(fs.readFileSync('data/entity-graph.json', 'utf8'));
const page = fs.readFileSync('research/benchmarks/aucr-dpi-inclusion/index.html', 'utf8');

assert.equal(registry.version, 1, 'benchmark registry must expose version 1');
assert.equal(registry.products.length, 1, 'the first release must govern exactly one benchmark product');

const product = registry.products[0];
assert.equal(product.id, 'aucr-dpi-inclusion-benchmark');
assert.equal(product.status, 'methodology-preview', 'comparative results must remain withheld until reproduction');
assert.equal(product.source.doi, '10.5281/zenodo.20860992');
assert.equal(product.source.version, '0.1');
assert.equal(product.path, 'research/benchmarks/aucr-dpi-inclusion/');
assert.deepEqual(product.dimensions, ['access', 'use', 'capability', 'resilience']);

for (const gate of [
  'requiresDepositedInputs',
  'requiresReproduciblePipeline',
  'requiresVersionedMethodology',
  'requiresSourceAndTransformationLedger',
  'requiresUncertaintyAndMissingnessDisclosure',
  'requiresHumanReviewBeforePublicRanking'
]) {
  assert.equal(product.releaseRules[gate], true, `${gate} must remain mandatory`);
}

const datasets = entityGraph['@graph'].filter((node) => node['@type'] === 'Dataset');
const source = datasets.find((node) => node.identifier === product.source.doi);
assert.ok(source, 'benchmark DOI must resolve to the governed entity graph');
assert.equal(source.version, product.source.version, 'benchmark source version must match the entity graph');
assert.equal(source.license, product.source.license, 'benchmark license must match the entity graph');

assert.ok(page.includes('10.5281/zenodo.20860992'), 'public methodology must expose the source DOI');
assert.ok(page.includes('Method registered; comparative results withheld'), 'public page must state the release status');
assert.ok(page.includes('accepts no private institutional, respondent-level or client research data'), 'privacy boundary must be visible');
assert.ok(page.includes('cannot certify institutional quality'), 'decision boundary must be visible');
assert.ok(page.includes('without implying causality'), 'causal boundary must be visible');
assert.ok(!/rank(?:ing)?\s*[:#-]?\s*\d|top\s+\d|score\s*[:=]\s*\d/i.test(page), 'methodology preview must not publish comparative scores or rankings');
assert.ok(!/best state|worst state|guaranteed|certified policy success/i.test(page), 'benchmark must avoid unsupported verdicts');

console.log('DOI-backed benchmark foundation passed source, version, privacy, release-gate and claim-boundary checks.');
