import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SITE = path.join(ROOT, '_site');
const ORIGIN = 'https://gurjas.org';

async function collectHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    const fullPath = path.join(directory, entry);
    const details = await stat(fullPath);
    if (details.isDirectory()) files.push(...await collectHtml(fullPath));
    else if (entry.endsWith('.html') && entry !== '404.html') files.push(fullPath);
  }
  return files;
}

function routeFor(file) {
  const relative = path.relative(SITE, file).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const sitemapPath = path.join(SITE, 'sitemap.xml');
const sitemap = await readFile(sitemapPath, 'utf8');
const sitemapUrls = new Set(
  [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]),
);

assert.ok(sitemapUrls.size > 0, 'Expected sitemap.xml to contain at least one URL');

const indexableUrls = new Set();
for (const file of await collectHtml(SITE)) {
  const html = await readFile(file, 'utf8');
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1] ?? '';
  if (/\bnoindex\b/i.test(robots)) continue;
  indexableUrls.add(`${ORIGIN}${routeFor(file)}`);
}

const missing = [...indexableUrls].filter((url) => !sitemapUrls.has(url)).sort();
const unexpected = [...sitemapUrls].filter((url) => !indexableUrls.has(url)).sort();

assert.deepEqual(
  missing,
  [],
  `Indexable generated pages missing from sitemap.xml:\n${missing.join('\n')}`,
);
assert.deepEqual(
  unexpected,
  [],
  `Sitemap URLs without a matching indexable generated page:\n${unexpected.join('\n')}`,
);

for (const url of sitemapUrls) {
  assert.ok(url.startsWith(`${ORIGIN}/`), `Sitemap URL must use the canonical Gurjas origin: ${url}`);
  assert.equal(url.includes('?'), false, `Sitemap URL must not contain a query string: ${url}`);
  assert.equal(url.includes('#'), false, `Sitemap URL must not contain a fragment: ${url}`);
}

console.log(`Sitemap coverage passed for ${indexableUrls.size} indexable generated routes.`);
