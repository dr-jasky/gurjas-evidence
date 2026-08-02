import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SITE = path.join(process.cwd(), '_site');
const PROHIBITED_CLAIMS = [
  /\b100\s*%\s*(?:acceptance|publication|success)\b/i,
  /\bguaranteed\s+(?:acceptance|publication|approval|degree|viva)\b/i,
  /\bassured\s+(?:acceptance|publication|approval)\b/i,
  /\bpublication\s+guarantee(?:d)?\b/i,
  /\bfabricat(?:e|ed|ing)\s+(?:data|responses|results)\b/i,
  /\bmanufactur(?:e|ed|ing)\s+(?:data|responses|results)\b/i,
];

async function collectHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    const fullPath = path.join(directory, entry);
    const details = await stat(fullPath);
    if (details.isDirectory()) files.push(...await collectHtml(fullPath));
    else if (entry.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const pages = await collectHtml(SITE);
assert.ok(pages.length > 0, 'Expected generated HTML pages');

const violations = [];
for (const file of pages) {
  const relativePath = path.relative(SITE, file);
  const html = await readFile(file, 'utf8');
  const visibleText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  for (const pattern of PROHIBITED_CLAIMS) {
    if (pattern.test(visibleText)) violations.push(`${relativePath}: ${pattern}`);
  }
}

assert.deepEqual(
  violations,
  [],
  `Unsupported or unethical public claims detected:\n${violations.join('\n')}`,
);

console.log(`Site-wide claim-integrity checks passed for ${pages.length} generated pages.`);
