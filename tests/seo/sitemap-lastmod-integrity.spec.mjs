import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const sitemap = await readFile(new URL('../../sitemap.xml', import.meta.url), 'utf8');
const entries = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];

assert.ok(entries.length > 0, 'sitemap.xml must contain URL entries with lastmod values');

const today = new Date();
today.setUTCHours(23, 59, 59, 999);
const seen = new Set();
const invalid = [];

for (const [, loc, lastmod] of entries) {
  if (seen.has(loc)) invalid.push(`${loc}: duplicate sitemap entry`);
  seen.add(loc);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
    invalid.push(`${loc}: lastmod must use YYYY-MM-DD (${lastmod})`);
    continue;
  }

  const parsed = new Date(`${lastmod}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== lastmod) {
    invalid.push(`${loc}: invalid calendar date (${lastmod})`);
  } else if (parsed > today) {
    invalid.push(`${loc}: lastmod is in the future (${lastmod})`);
  }
}

assert.deepEqual(invalid, [], `Sitemap lastmod integrity failures:\n${invalid.join('\n')}`);
console.log(`Sitemap lastmod integrity passed for ${entries.length} routes.`);
