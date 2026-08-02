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

for (const file of pages) {
  const relativePath = path.relative(SITE, file);
  const html = await readFile(file, 'utf8');

  assert.match(html, /<html\s+[^>]*lang=["']en["']/i, `${relativePath} must declare English document language`);
  assert.match(html, /<meta\s+name=["']viewport["']/i, `${relativePath} must include a responsive viewport`);

  const mains = html.match(/<main\b/gi) ?? [];
  assert.equal(mains.length, 1, `${relativePath} must contain exactly one main landmark`);
  assert.match(html, /<main\s+[^>]*id=["']main["']/i, `${relativePath} main landmark must expose the stable #main target`);
}

console.log(`Accessibility landmark checks passed for ${pages.length} generated pages.`);
