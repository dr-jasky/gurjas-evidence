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

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const pages = await collectHtml(SITE);
assert.ok(pages.length > 0, 'Expected generated HTML pages');

const violations = [];
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const relativePath = path.relative(SITE, file);
  const anchors = html.matchAll(/<a\b[^>]*>/gi);

  for (const match of anchors) {
    const tag = match[0];
    if (!/\btarget=["']_blank["']/i.test(tag)) continue;

    const rel = tag.match(/\brel=["']([^"']*)["']/i)?.[1] ?? '';
    const tokens = new Set(rel.toLowerCase().split(/\s+/).filter(Boolean));
    if (!tokens.has('noopener')) {
      violations.push(`${relativePath}: ${tag.slice(0, 180)}`);
    }
  }
}

assert.deepEqual(
  violations,
  [],
  `Links opening a new tab must include rel="noopener":\n${violations.join('\n')}`,
);

console.log(`External-link opener isolation passed for ${pages.length} generated pages.`);
