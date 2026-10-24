import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const events = {};
const link = (href) => ({ href, clicks: 0, focuses: 0, click() { this.clicks++; }, focus() { this.focuses++; } });
const cards = [
  { dataset: { searchText: 'journal evidence checker' }, hidden: false, anchor: link('/tools/journal/') },
  { dataset: { searchText: 'journal shortlist publications' }, hidden: false, anchor: link('/tools/shortlist/') },
  { dataset: { searchText: 'reference doi integrity' }, hidden: false, anchor: link('/tools/reference/') },
].map((card) => ({ ...card, querySelector: () => card.anchor }));
const input = { value: '', focuses: 0, focus() { this.focuses++; }, addEventListener(type, cb) { events[`input:${type}`] = cb; } };
const count = { textContent: '' };
const status = { dataset: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
const fallback = link('/tools/');
const empty = { hidden: true, querySelector() { return fallback; } };
const form = { addEventListener(type, cb) { events[`form:${type}`] = cb; } };
const elements = { '[data-product-search]': form, '[data-product-search-input]': input, '[data-product-search-count]': count, '[data-product-search-status]': status, '[data-product-search-empty]': empty };
const root = { querySelector(sel) { return elements[sel]; }, querySelectorAll(sel) { assert.equal(sel, '[data-product-tool]'); return cards; } };
const document = { querySelector(sel) { assert.equal(sel, '[data-product-front-door]'); return root; } };
const window = { requestAnimationFrame(callback) { callback(); } };
const source = fs.readFileSync('assets/product-front-door.js', 'utf8');
vm.runInNewContext(source, { document, window });
assert.equal(count.textContent, '3');
assert.equal(empty.hidden, true);
const type = (value) => { input.value = value; events['input:input'](); };
const submit = () => { let prevented = false; events['form:submit']({ preventDefault() { prevented = true; } }); assert.ok(prevented, 'the query must never submit externally'); };
type('doi'); assert.equal(count.textContent, '1'); assert.equal(cards.filter(c => !c.hidden).length, 1);
submit(); assert.equal(cards[2].anchor.clicks, 1, 'unique result must open');
type('journal'); assert.equal(count.textContent, '2'); submit(); assert.equal(cards[0].anchor.focuses, 1, 'multiple results must focus first');
type('unmatched term'); assert.equal(count.textContent, '0'); assert.equal(empty.hidden, false); submit(); assert.equal(fallback.focuses, 1, 'no result must focus available fallback');
events['form:reset'](); assert.equal(input.value, ''); assert.equal(count.textContent, '3'); assert.equal(input.focuses, 1);
console.log('Homepage tool finder: unique/multiple/zero result, submit prevention and reset passed.');
