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

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]?.trim() ?? '';
}

function hasImplicitLabel(html, controlIndex) {
  const before = html.slice(0, controlIndex);
  const lastOpen = before.lastIndexOf('<label');
  const lastClose = before.lastIndexOf('</label>');
  if (lastOpen <= lastClose) return false;
  return html.indexOf('</label>', controlIndex) !== -1;
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const failures = [];
const placeholderFallbacks = [];
let checked = 0;

for (const file of await collectHtml(SITE)) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);
  const explicitLabels = new Set(
    [...html.matchAll(/<label\b[^>]*\bfor\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]),
  );

  for (const match of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const markup = match[0];
    const tag = match[1].toLowerCase();
    const type = attribute(markup, 'type').toLowerCase();
    const ariaHidden = attribute(markup, 'aria-hidden').toLowerCase();
    if (ariaHidden === 'true') continue;
    if (tag === 'input' && ['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) continue;

    checked += 1;
    const id = attribute(markup, 'id');
    const name = attribute(markup, 'name') || id || `${tag} at byte ${match.index}`;
    const persistentName = Boolean(
      attribute(markup, 'aria-label') ||
      attribute(markup, 'aria-labelledby') ||
      attribute(markup, 'title') ||
      (id && explicitLabels.has(id)) ||
      hasImplicitLabel(html, match.index),
    );
    const placeholder = attribute(markup, 'placeholder');

    if (!persistentName && placeholder) placeholderFallbacks.push(`${route}: ${name}`);
    if (!persistentName && !placeholder) failures.push(`${route}: ${name}`);
  }
}

assert.ok(checked > 0, 'Expected generated pages to contain at least one user-facing form control');
assert.deepEqual(
  failures,
  [],
  `Every user-facing form control must expose an accessible name:\n${failures.join('\n')}`,
);

console.log(`Static form-control accessible-name integrity passed for ${checked} user-facing controls.`);
if (placeholderFallbacks.length) {
  console.warn(`Placeholder-only names (${placeholderFallbacks.length} non-blocking controls; add persistent labels when editing these tools):\n${placeholderFallbacks.join('\n')}`);
}
