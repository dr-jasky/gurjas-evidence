import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SITE = path.join(process.cwd(), '_site');

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

function visibleText(value) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const pages = await collectHtml(SITE);
assert.ok(pages.length > 0, 'Expected generated HTML pages');

const violations = [];
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const relativePath = path.relative(SITE, file);
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];

  if (headings.length !== 1) {
    violations.push(`${relativePath}: expected exactly one h1, found ${headings.length}`);
    continue;
  }

  const label = visibleText(headings[0][1]);
  if (!label) violations.push(`${relativePath}: h1 has no visible text`);
}

assert.deepEqual(
  violations,
  [],
  `Generated pages must expose one meaningful primary heading:\n${violations.join('\n')}`,
);

console.log(`Primary-heading integrity passed for ${pages.length} generated pages.`);
