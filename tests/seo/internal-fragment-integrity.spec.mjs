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

function decodeFragment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const files = await collectHtml(SITE);
const pages = new Map();

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);
  const targets = new Set();
  for (const match of html.matchAll(/\b(?:id|name)="([^"]+)"/gi)) targets.add(match[1]);
  pages.set(route, { html, targets });
}

const failures = [];
let checked = 0;

for (const [sourceRoute, { html }] of pages) {
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)) {
    const href = match[1];
    if (!href || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;

    let url;
    try {
      url = new URL(href, `${ORIGIN}${sourceRoute}`);
    } catch {
      continue;
    }

    if (url.origin !== ORIGIN || !url.hash) continue;
    checked += 1;

    let targetRoute = url.pathname;
    if (targetRoute === '/index.html') targetRoute = '/';
    else if (targetRoute.endsWith('/index.html')) targetRoute = targetRoute.slice(0, -'index.html'.length);

    const targetPage = pages.get(targetRoute);
    const fragment = decodeFragment(url.hash.slice(1));
    if (!targetPage) {
      failures.push(`${sourceRoute} -> ${href}: target page is not generated`);
    } else if (!targetPage.targets.has(fragment)) {
      failures.push(`${sourceRoute} -> ${href}: missing fragment target #${fragment}`);
    }
  }
}

assert.ok(checked > 0, 'Expected at least one internal fragment link to validate');
assert.deepEqual(failures, [], `Broken internal fragment links:\n${failures.join('\n')}`);
console.log(`Internal fragment integrity passed for ${checked} links across ${pages.size} generated pages.`);
