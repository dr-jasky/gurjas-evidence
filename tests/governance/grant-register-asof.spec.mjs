import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = JSON.parse(fs.readFileSync('data/tool-contracts.json', 'utf8'));
const entry = registry.tools.find((tool) => tool.id === 'grant-deadline-tracker');
const html = fs.readFileSync('tools/grant-deadline-tracker/index.html', 'utf8');
assert.ok(entry, 'grant reference contract must exist');
assert.equal(entry.reviewed, '2026-10-15', 'a dated and evidenced source review must be recorded');
assert.equal(entry.methodVersion, '2026-10 dated reference register');
assert.match(html, /not a live opportunities feed/, 'page must declare that availability is not real time');
assert.match(html, /3 Aug 2026/, 'the expired Taiwan submission deadline must remain accurate');
assert.match(html, /18 Sep 2026/, 'the extended 2026–27 Major\/Minor deadline must be recorded');
assert.doesNotMatch(html, /<td[^>]*>Open<\/td>/i, 'page must not advertise unverified scheme availability');
assert.doesNotMatch(html, /Expect late 2026|updated monthly|Nov–Dec 2025/, 'retired claims must not leak back in');
assert.ok(html.includes('https://icssr.org/announcements/call-project-proposals-under-scheme-major-and-minor-research-projects-2026-27'), 'scheme must link to its actual 2026–27 call');
assert.ok(entry.sources.some((source) => source.url.includes('extension-last-date-submission-major-and-minor')), 'official deadline extension must be documented in the source contract');
assert.ok(entry.limitations.includes('not an automated grant availability service'), 'contract must restrict its decision scope');
console.log('Dated grant register: official deadlines, uncertainty and no-stale-open claims passed.');
