import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const graph = JSON.parse(fs.readFileSync('data/content-graph.json', 'utf8'));
const site = '_site';
const failures = [];

const routeFile = (publicPath) => path.join(site, publicPath, 'index.html');
const sourcePublicPath = (source) => source.replace(/index\.html$/, '');

assert.equal(graph.version, 1, 'Expected supported graph version');
assert.ok(Object.keys(graph.nodes).length >= 8, 'Expected a substantive reusable node registry');
assert.ok(Object.keys(graph.relationships).length >= 8, 'Expected contextual navigation on the major evidence hubs');

for (const [nodeId, node] of Object.entries(graph.nodes)) {
  for (const field of ['type', 'title', 'description', 'path']) {
    if (!node[field]?.trim()) failures.push(`node ${nodeId} is missing ${field}`);
  }
  if (node.path.startsWith('/') || node.path.includes('?') || node.path.includes('#')) {
    failures.push(`node ${nodeId} must use a clean site-relative canonical path`);
  }
  if (!fs.existsSync(routeFile(node.path))) failures.push(`node ${nodeId} targets missing generated route ${node.path}`);
}

for (const [source, relatedIds] of Object.entries(graph.relationships)) {
  const file = path.join(site, source);
  if (!fs.existsSync(file)) {
    failures.push(`${source} is missing from generated output`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const sectionCount = (html.match(/class="contextual-knowledge"/g) || []).length;
  if (sectionCount !== 1) failures.push(`${source} renders ${sectionCount} contextual knowledge sections`);
  if (!html.includes('aria-label="Related Gurjas evidence and resources"')) failures.push(`${source} lacks labelled related navigation`);
  if (!html.includes('../assets/contextual-knowledge.css?v=1')) failures.push(`${source} does not load the governed contextual stylesheet`);
  if (relatedIds.length !== 4) failures.push(`${source} must expose exactly four focused relationships`);
  if (new Set(relatedIds).size !== relatedIds.length) failures.push(`${source} repeats a related node`);

  const sourcePath = sourcePublicPath(source);
  for (const nodeId of relatedIds) {
    const node = graph.nodes[nodeId];
    if (!node) {
      failures.push(`${source} references unknown node ${nodeId}`);
      continue;
    }
    if (node.path === sourcePath) failures.push(`${source} links to itself through ${nodeId}`);
    if (!html.includes(`href="../${node.path}"`)) failures.push(`${source} does not render relationship ${nodeId}`);
    if (!html.includes(node.title)) failures.push(`${source} omits relationship title for ${nodeId}`);
  }
}

assert.deepEqual(failures, [], `Contextual knowledge graph failures:\n${failures.join('\n')}`);
console.log(`Contextual knowledge graph passed for ${Object.keys(graph.relationships).length} hubs and ${Object.keys(graph.nodes).length} governed nodes.`);
