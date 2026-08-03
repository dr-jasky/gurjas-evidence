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

function routeFor(file) {
  const relative = path.relative(SITE, file).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const failures = [];
let checked = 0;

for (const file of await collectHtml(SITE)) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);
  checked += 1;

  const htmlTag = html.match(/<html\b([^>]*)>/i)?.[1] ?? '';
  const lang = htmlTag.match(/\blang\s*=\s*["']([^"']+)["']/i)?.[1]?.trim() ?? '';
  const charset = html.match(/<meta\s+charset\s*=\s*["']?([^\s"'>]+)/i)?.[1]?.toLowerCase() ?? '';
  const viewport = html.match(/<meta\s+name\s*=\s*["']viewport["'][^>]*content\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';

  if (!/^en(?:-|$)/i.test(lang)) failures.push(`${route}: missing or unexpected document language (${lang || 'none'})`);
  if (charset !== 'utf-8') failures.push(`${route}: charset must be utf-8`);
  if (!/\bwidth\s*=\s*device-width\b/i.test(viewport)) failures.push(`${route}: viewport must include width=device-width`);
  if (!/\binitial-scale\s*=\s*1(?:\.0+)?\b/i.test(viewport)) failures.push(`${route}: viewport must include initial-scale=1`);
  if (!title) failures.push(`${route}: document title is missing or empty`);
}

assert.ok(checked > 0, 'Expected at least one generated HTML document');
assert.deepEqual(
  failures,
  [],
  `Generated documents must preserve language, encoding, viewport and title basics:\n${failures.join('\n')}`,
);

console.log(`Document basics integrity passed for ${checked} generated HTML pages.`);
