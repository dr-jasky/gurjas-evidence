import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../..');
const contactPath = path.join(repoRoot, 'contact', 'index.html');
const html = await readFile(contactPath, 'utf8');

const formMatch = html.match(/<form\b[^>]*id=["']gcContactForm["'][^>]*>/i);
assert.ok(formMatch, 'Contact form #gcContactForm must exist');

const formTag = formMatch[0];
const actionMatch = formTag.match(/\baction=["']([^"']+)["']/i);
assert.ok(actionMatch, 'Contact form must declare an action URL');

const actionUrl = new URL(actionMatch[1]);
assert.equal(actionUrl.protocol, 'https:', 'Contact form action must use HTTPS');
assert.equal(actionUrl.hostname, 'formsubmit.co', 'Contact form must post only to the approved FormSubmit host');
assert.ok(actionUrl.pathname.length > 1, 'Contact form action must include a configured recipient or routing token');

assert.match(
  html,
  /<input\b[^>]*name=["']_honey["'][^>]*>/i,
  'Contact form must retain the anti-spam honeypot field',
);
assert.match(
  html,
  /<input\b[^>]*name=["']_next["'][^>]*value=["']https:\/\/gurjas\.org\/contact\/\?sent=1["'][^>]*>/i,
  'Successful submissions must return to the trusted Gurjas contact route',
);
assert.match(
  html,
  /<div\b[^>]*class=["'][^"']*form-status[^"']*["'][^>]*role=["']status["'][^>]*aria-live=["']polite["'][^>]*>/i,
  'Submission status must remain available to assistive technology',
);

for (const id of ['cf-name', 'cf-email', 'cf-cat', 'cf-type', 'cf-msg']) {
  assert.match(
    html,
    new RegExp(`<label\\b[^>]*for=["']${id}["'][^>]*>`, 'i'),
    `Required control #${id} must have an explicitly associated label`,
  );
  assert.match(
    html,
    new RegExp(`<(?:input|select|textarea)\\b[^>]*id=["']${id}["'][^>]*`, 'i'),
    `Required control #${id} must exist`,
  );
}

assert.doesNotMatch(html, /action=["']http:\/\//i, 'Contact form action must never downgrade to HTTP');
assert.doesNotMatch(html, /action=["']javascript:/i, 'Contact form action must never execute JavaScript');

console.log('Contact form security regression checks passed.');
