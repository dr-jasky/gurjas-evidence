import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const site = JSON.parse(fs.readFileSync('site/data/site.json', 'utf8'));
const expected = [
  { label: 'About', path: 'about/', section: 'about' },
  { label: 'Services', path: 'services/', section: 'services' },
  { label: 'Tools', path: 'tools/', section: 'tools' },
  { label: 'Library', path: 'knowledge/', section: 'knowledge' },
  { label: 'Insights', path: 'insights/', section: 'insights' },
  { label: 'Contact', path: 'contact/', section: 'contact', cta: true },
];

assert.equal(site.navigationVersion, 2, 'sitewide navigation must expose governed version 2');
assert.equal(site.assetVersion, '31', 'shared navigation release requires a fresh asset version');
assert.deepEqual(site.navigation, expected, 'site data must define the exact six approved destinations');
assert.ok(site.navigation.every((item) => !item.children), 'sitewide navigation must contain no dropdown children');

function htmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...htmlFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

const pages = htmlFiles('_site');
assert.ok(pages.length >= 60, 'navigation contract must inspect the complete generated site');

for (const file of pages) {
  const relative = path.relative('_site', file).replaceAll(path.sep, '/');
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.includes('data-site-system="header"'), `${relative} must use the authoritative shared header`);

  const navMatch = html.match(/<nav id="nav" class="site-nav" aria-label="Primary">([\s\S]*?)<\/nav>/);
  assert.ok(navMatch, `${relative} must expose one primary navigation region`);
  const nav = navMatch[1];
  const listMatch = nav.match(/<ul>([\s\S]*?)<\/ul>/);
  assert.ok(listMatch, `${relative} must expose one deterministic navigation list`);
  const list = listMatch[1];

  assert.equal((list.match(/<li(?:\s|>)/g) || []).length, 6, `${relative} must expose exactly six primary destinations`);
  assert.ok(!/has-sub|subnav|sub-btn|Our Work/i.test(list), `${relative} must contain no obsolete dropdown navigation`);
  for (const item of expected) {
    const href = new RegExp(`href="(?:\\.\\./)*${item.path.replaceAll('/', '\\/')}"[^>]*>${item.label}<\\/a>`, 'i');
    assert.match(list, href, `${relative} must link directly to ${item.label}`);
  }
  assert.match(list, /href="(?:\.\.\/)*contact\/" class="nav-cta"/, `${relative} must preserve Contact as the restrained primary action`);

  assert.equal((html.match(/data-site-guide/g) || []).length, 1, `${relative} must contain exactly one governed route helper`);
  assert.ok(nav.indexOf('</ul>') < nav.indexOf('nav-guide--compact'), `${relative} must keep the route helper outside the six-link list`);
  assert.ok(nav.includes('aria-label="Find your route"'), `${relative} must give the compact helper an accessible name`);
  assert.match(html, /assets\/site-nav-compact\.css\?v=1/, `${relative} must load the shared compact-navigation stylesheet`);
}

console.log(`One governed six-link navigation passed across ${pages.length} generated pages.`);
