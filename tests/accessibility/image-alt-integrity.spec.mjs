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
let imageCount = 0;

for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const relativePath = path.relative(SITE, file);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  imageCount += images.length;

  for (const match of images) {
    const tag = match[0];
    if (!/\balt\s*=\s*(?:"[^"]*"|'[^']*')/i.test(tag)) {
      const line = html.slice(0, match.index).split('\n').length;
      violations.push(`${relativePath}:${line}: img is missing an alt attribute`);
    }
  }
}

assert.deepEqual(
  violations,
  [],
  `Every generated image must declare alt text or an explicit empty alt for decorative use:\n${violations.join('\n')}`,
);

console.log(`Image alternative-text integrity passed for ${imageCount} images across ${pages.length} generated pages.`);
