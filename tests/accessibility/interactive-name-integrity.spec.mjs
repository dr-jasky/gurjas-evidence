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
  return markup.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]?.trim() ?? '';
}

function hasBooleanAttribute(markup, name) {
  return new RegExp(`(?:^|\\s)${name}(?:\\s|=|>|$)`, 'i').test(markup);
}

function decodeEntities(value) {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function visibleText(innerHtml) {
  return decodeEntities(
    innerHtml
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function imageAlternative(innerHtml) {
  return [...innerHtml.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => attribute(match[0], 'alt'))
    .filter(Boolean)
    .join(' ')
    .trim();
}

function hasProgrammaticName(openingTag, innerHtml) {
  return Boolean(
    attribute(openingTag, 'aria-label') ||
    attribute(openingTag, 'aria-labelledby') ||
    attribute(openingTag, 'title') ||
    visibleText(innerHtml) ||
    imageAlternative(innerHtml),
  );
}

await stat(SITE).catch(() => {
  throw new Error('_site does not exist. Run python scripts/build_site.py --clean first.');
});

const failures = [];
let checked = 0;

for (const file of await collectHtml(SITE)) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);

  for (const match of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const tag = match[1].toLowerCase();
    const openingTag = `<${tag}${match[2]}>`;
    const innerHtml = match[3];
    if (attribute(openingTag, 'aria-hidden').toLowerCase() === 'true') continue;
    if (hasBooleanAttribute(openingTag, 'hidden')) continue;

    checked += 1;
    if (hasProgrammaticName(openingTag, innerHtml)) continue;

    const target = tag === 'a'
      ? attribute(openingTag, 'href') || `anchor at byte ${match.index}`
      : attribute(openingTag, 'id') || attribute(openingTag, 'name') || `button at byte ${match.index}`;
    failures.push(`${route}: ${tag} ${target}`);
  }
}

assert.ok(checked > 0, 'Expected generated pages to contain at least one user-facing link or button');
assert.deepEqual(
  failures,
  [],
  `Every user-facing link and button must expose an accessible name:\n${failures.join('\n')}`,
);

console.log(`Static interactive accessible-name integrity passed for ${checked} links and buttons.`);
