import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SITE = path.join(ROOT, '_site');

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

function decodeBasicEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim();
}

function capture(html, pattern, label, relativePath) {
  const match = html.match(pattern);
  assert.ok(match?.[1], `${relativePath} is missing ${label}`);
  return decodeBasicEntities(match[1]);
}

function duplicates(entries) {
  const groups = new Map();
  for (const [file, value] of entries) {
    const key = value.toLocaleLowerCase('en-IN');
    const existing = groups.get(key) ?? [];
    existing.push(file);
    groups.set(key, existing);
  }
  return [...groups.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([value, files]) => `${JSON.stringify(value)}: ${files.join(', ')}`);
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const pages = await collectHtml(SITE);
const indexable = [];

for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const relativePath = path.relative(SITE, file);
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1] ?? '';
  if (/\bnoindex\b/i.test(robots)) continue;

  indexable.push({
    relativePath,
    title: capture(html, /<title>([^<]+)<\/title>/i, 'a title', relativePath),
    description: capture(
      html,
      /<meta\s+name="description"\s+content="([^"]+)"/i,
      'a meta description',
      relativePath,
    ),
    canonical: capture(
      html,
      /<link\s+rel="canonical"\s+href="([^"]+)"/i,
      'a canonical URL',
      relativePath,
    ),
  });
}

assert.ok(indexable.length > 0, 'Expected at least one indexable generated page');

for (const page of indexable) {
  assert.ok(page.title.length >= 20 && page.title.length <= 70, `${page.relativePath} title length is ${page.title.length}`);
  assert.ok(
    page.description.length >= 70 && page.description.length <= 180,
    `${page.relativePath} meta description length is ${page.description.length}`,
  );
  assert.match(page.canonical, /^https:\/\/gurjas\.org\/(?:[^?#]*)$/);
  assert.ok(page.canonical.endsWith('/') || page.canonical.endsWith('/404.html'), `${page.relativePath} canonical lacks trailing slash`);
}

const duplicateTitles = duplicates(indexable.map(({ relativePath, title }) => [relativePath, title]));
const duplicateDescriptions = duplicates(indexable.map(({ relativePath, description }) => [relativePath, description]));
const duplicateCanonicals = duplicates(indexable.map(({ relativePath, canonical }) => [relativePath, canonical]));

assert.deepEqual(duplicateTitles, [], `Duplicate indexable titles:\n${duplicateTitles.join('\n')}`);
assert.deepEqual(duplicateDescriptions, [], `Duplicate indexable descriptions:\n${duplicateDescriptions.join('\n')}`);
assert.deepEqual(duplicateCanonicals, [], `Duplicate indexable canonicals:\n${duplicateCanonicals.join('\n')}`);

console.log(`SEO metadata uniqueness checks passed for ${indexable.length} indexable generated pages.`);
