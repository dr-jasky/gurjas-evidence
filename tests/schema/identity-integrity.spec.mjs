import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const THIS_TEST = path.normalize('tests/schema/identity-integrity.spec.mjs');
const VERIFIED_ORCID = '0000-0003-0337-7885';
const PLACEHOLDER_ORCIDS = [
  '0000-0002-1234-5678',
  '0000-0000-0000-0000',
  '0000-0001-2345-6789',
];
const TEXT_EXTENSIONS = new Set(['.html', '.json', '.md', '.js', '.mjs', '.py', '.xml', '.txt']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '_site']);

async function collectTextFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = path.join(directory, entry);
    const details = await stat(fullPath);
    if (details.isDirectory()) {
      files.push(...await collectTextFiles(fullPath));
    } else if (TEXT_EXTENSIONS.has(path.extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = await collectTextFiles(ROOT);
const placeholderHits = [];
const verifiedHits = [];

for (const file of files) {
  const relativePath = path.normalize(path.relative(ROOT, file));
  const content = await readFile(file, 'utf8');

  // The deny-list necessarily appears in this test file itself. Excluding only this
  // exact path keeps the repository-wide guard strict without creating a self-hit.
  if (relativePath !== THIS_TEST) {
    for (const placeholder of PLACEHOLDER_ORCIDS) {
      if (content.includes(placeholder)) placeholderHits.push(`${relativePath}: ${placeholder}`);
    }
  }
  if (content.includes(VERIFIED_ORCID)) verifiedHits.push(relativePath);
}

assert.deepEqual(
  placeholderHits,
  [],
  `Placeholder ORCID identifiers must never ship:\n${placeholderHits.join('\n')}`,
);
assert.ok(
  verifiedHits.length >= 3,
  `Expected the verified ORCID ${VERIFIED_ORCID} in multiple identity surfaces; found ${verifiedHits.length}`,
);

const baseTemplate = await readFile(path.join(ROOT, 'site/templates/base.html'), 'utf8');
assert.match(baseTemplate, /https:\/\/gurjas\.org\/#org/);
assert.match(baseTemplate, /UDYAM-PB-17-0132009/);

console.log(`Identity integrity checks passed across ${files.length} repository text files.`);
console.log(`Verified ORCID appears in ${verifiedHits.length} files; no placeholder identifiers found.`);
