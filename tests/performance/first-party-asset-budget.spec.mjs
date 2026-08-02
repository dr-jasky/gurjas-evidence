import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SITE = path.join(ROOT, '_site');
const ORIGIN = 'https://gurjas.org';
const MAX_SINGLE_ASSET_BYTES = 300 * 1024;
const MAX_UNIQUE_ASSET_BYTES = 1500 * 1024;

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

function localAssetPath(reference, sourceRoute) {
  let url;
  try {
    url = new URL(reference, `${ORIGIN}${sourceRoute}`);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;
  if (!/\.(?:css|js)$/i.test(url.pathname)) return null;
  return decodeURIComponent(url.pathname).replace(/^\//, '');
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const htmlFiles = await collectHtml(SITE);
const assets = new Set();

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const sourceRoute = routeFor(file);
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/gi)) {
    const asset = localAssetPath(match[1], sourceRoute);
    if (asset) assets.add(asset);
  }
}

assert.ok(assets.size > 0, 'Expected generated pages to reference first-party CSS or JavaScript assets');

const missing = [];
const oversized = [];
let totalBytes = 0;

for (const asset of [...assets].sort()) {
  const fullPath = path.join(SITE, asset);
  const details = await stat(fullPath).catch(() => null);
  if (!details?.isFile()) {
    missing.push(asset);
    continue;
  }
  totalBytes += details.size;
  if (details.size > MAX_SINGLE_ASSET_BYTES) {
    oversized.push(`${asset}: ${(details.size / 1024).toFixed(1)} KiB`);
  }
}

assert.deepEqual(missing, [], `Referenced first-party assets must exist:\n${missing.join('\n')}`);
assert.deepEqual(
  oversized,
  [],
  `A first-party CSS or JavaScript asset exceeded ${MAX_SINGLE_ASSET_BYTES / 1024} KiB:\n${oversized.join('\n')}`,
);
assert.ok(
  totalBytes <= MAX_UNIQUE_ASSET_BYTES,
  `Unique first-party CSS and JavaScript total ${(totalBytes / 1024).toFixed(1)} KiB, exceeding ${MAX_UNIQUE_ASSET_BYTES / 1024} KiB`,
);

console.log(
  `First-party asset budget passed for ${assets.size} unique CSS/JS files (${(totalBytes / 1024).toFixed(1)} KiB total).`,
);
