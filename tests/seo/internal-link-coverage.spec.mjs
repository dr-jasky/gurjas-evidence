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

function normalizeInternalHref(href, sourceRoute) {
  if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  let url;
  try {
    url = new URL(href, `${ORIGIN}${sourceRoute}`);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;
  const pathname = url.pathname;
  if (/\.[a-z0-9]{2,8}$/i.test(pathname) && !pathname.endsWith('.html')) return null;
  if (pathname === '/index.html') return '/';
  if (pathname.endsWith('/index.html')) return pathname.slice(0, -'index.html'.length);
  return pathname;
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const files = await collectHtml(SITE);
const indexableRoutes = new Set();
const incoming = new Map();
const links = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const sourceRoute = routeFor(file);
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1] ?? '';
  if (!/\bnoindex\b/i.test(robots)) indexableRoutes.add(sourceRoute);

  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)) {
    const target = normalizeInternalHref(match[1], sourceRoute);
    if (target) links.push([sourceRoute, target]);
  }
}

for (const route of indexableRoutes) incoming.set(route, new Set());
for (const [source, target] of links) {
  if (source !== target && incoming.has(target)) incoming.get(target).add(source);
}

const orphaned = [...incoming.entries()]
  .filter(([route, sources]) => route !== '/' && sources.size === 0)
  .map(([route]) => route)
  .sort();

assert.deepEqual(
  orphaned,
  [],
  `Indexable pages must receive at least one internal link:\n${orphaned.join('\n')}`,
);

const weak = [...incoming.entries()]
  .filter(([route, sources]) => route !== '/' && sources.size > 0 && sources.size < 3)
  .map(([route, sources]) => `${route}: ${sources.size} linking page${sources.size === 1 ? '' : 's'}`)
  .sort();

console.log(`Internal-link coverage passed for ${indexableRoutes.size} indexable routes; no orphan pages found.`);
if (weak.length) {
  console.warn(`Weak internal-link coverage (${weak.length} non-blocking routes):\n${weak.join('\n')}`);
}
