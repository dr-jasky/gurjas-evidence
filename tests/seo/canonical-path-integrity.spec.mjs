import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_DIR = path.resolve('_site');
const SITE_ORIGIN = 'https://gurjas.org';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function canonicalFrom(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] ?? null;
}

const failures = [];
const files = await htmlFiles(SITE_DIR);

for (const file of files) {
  const relative = path.relative(SITE_DIR, file).replaceAll(path.sep, '/');
  if (relative === '404.html') continue;

  const html = await readFile(file, 'utf8');
  if (/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;

  const canonical = canonicalFrom(html);
  if (!canonical) {
    failures.push(`${relative}: missing canonical URL`);
    continue;
  }

  let url;
  try {
    url = new URL(canonical);
  } catch {
    failures.push(`${relative}: invalid canonical URL ${canonical}`);
    continue;
  }

  if (url.origin !== SITE_ORIGIN) failures.push(`${relative}: non-canonical origin ${url.origin}`);
  if (url.search || url.hash) failures.push(`${relative}: canonical contains query or fragment ${canonical}`);
  if (url.pathname !== '/' && !url.pathname.endsWith('/')) {
    failures.push(`${relative}: canonical route must end with a trailing slash ${canonical}`);
  }
}

assert.equal(failures.length, 0, `Canonical path integrity failures:\n${failures.join('\n')}`);
console.log(`Canonical path integrity passed for ${files.length - 1} generated HTML pages.`);
