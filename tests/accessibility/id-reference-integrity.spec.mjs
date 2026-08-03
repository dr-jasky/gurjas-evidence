import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SITE = path.join(ROOT, '_site');
const REFERENCE_ATTRIBUTES = ['aria-controls', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-labelledby', 'for', 'headers'];

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

function routeFor(file) {
  const relative = path.relative(SITE, file).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]?.trim() ?? '';
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const failures = [];
let pagesChecked = 0;
let referencesChecked = 0;

for (const file of await collectHtml(SITE)) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);
  pagesChecked += 1;

  const ids = new Map();
  for (const match of html.matchAll(/<[^>]+\bid\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const id = match[1].trim();
    if (!id) continue;
    ids.set(id, (ids.get(id) ?? 0) + 1);
  }

  for (const [id, count] of ids) {
    if (count > 1) failures.push(`${route}: duplicate id "${id}" appears ${count} times`);
  }

  for (const match of html.matchAll(/<[^>]+>/g)) {
    const element = match[0];
    for (const name of REFERENCE_ATTRIBUTES) {
      const value = attribute(element, name);
      if (!value) continue;
      for (const id of value.split(/\s+/).filter(Boolean)) {
        referencesChecked += 1;
        if (!ids.has(id)) failures.push(`${route}: ${name} references missing id "${id}" in ${element.slice(0, 180)}`);
      }
    }
  }

  for (const match of html.matchAll(/href\s*=\s*["']#([^"']+)["']/gi)) {
    const id = decodeURIComponent(match[1]);
    referencesChecked += 1;
    if (!ids.has(id)) failures.push(`${route}: fragment link references missing id "${id}"`);
  }
}

assert.ok(pagesChecked > 0, 'Expected at least one generated HTML page');
assert.ok(referencesChecked > 0, 'Expected generated pages to contain ID references');
assert.deepEqual(
  failures,
  [],
  `Generated pages must use unique IDs and resolve every local ID reference:\n${failures.join('\n')}`,
);

console.log(`Static ID-reference integrity passed across ${pagesChecked} pages and ${referencesChecked} references.`);
