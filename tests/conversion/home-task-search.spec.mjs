import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Tiny deterministic DOM fixture: no network, browser profile or analytics data.
const source = fs.readFileSync('assets/product-front-door.js', 'utf8');
const listeners = () => Object.create(null);
const createLink = (href) => ({
  href, focused: false,
  focus() { this.focused = true; },
});
const journalLink = createLink('https://gurjas.org/tools/predatory-journal-checker/');
const invoiceLink = createLink('https://gurjas.org/tools/apc-invoice-triage/');
const semLink = createLink('https://gurjas.org/tools/sem-sample-size-calculator/');
const hubLink = createLink('https://gurjas.org/tools/');
const cards = [
  { dataset: { searchText: 'check a journal publishing integrity ISSN' }, hidden: false, querySelector: () => journalLink },
  { dataset: { searchText: 'journal invoice APC publication' }, hidden: false, querySelector: () => invoiceLink },
  { dataset: { searchText: 'SEM sample size research design' }, hidden: false, querySelector: () => semLink },
];
const form = { listeners: listeners(), addEventListener(type, cb) { this.listeners[type] = cb; } };
const input = { value: '', listeners: listeners(), addEventListener(type, cb) { this.listeners[type] = cb; }, focus() {} };
const count = { textContent: '' };
const status = { dataset: {}, lastChild: { nodeType: 3, textContent: '' } };
const empty = { hidden: true, querySelector: () => hubLink };
const root = {
  querySelector(selector) {
    return {
      '[data-product-search]': form,
      '[data-product-search-input]': input,
      '[data-product-search-count]': count,
      '[data-product-search-status]': status,
      '[data-product-search-empty]': empty,
    }[selector] ?? null;
  },
  querySelectorAll: () => cards,
};
const navigations = [];
const context = {
  document: { querySelector: (selector) => selector === '[data-product-front-door]' ? root : null },
  window: { location: { assign: (href) => navigations.push(href) }, requestAnimationFrame: (cb) => cb() },
  Node: { TEXT_NODE: 3 },
};
vm.runInNewContext(source, context, { filename: 'assets/product-front-door.js' });

assert.equal(count.textContent, '3', 'all tool results must appear with no query');
assert.match(status.lastChild.textContent, /tools available/, 'default announcement must identify the tool catalogue');
function type(value) { input.value = value; input.listeners.input(); }
function submit() {
  let prevented = false;
  form.listeners.submit({ preventDefault() { prevented = true; } });
  assert.ok(prevented, 'search submit must never leak research terms to the server');
}

type('SEM');
assert.equal(count.textContent, '1');
assert.match(status.lastChild.textContent, /Press Enter to open it/);
assert.equal(cards.filter(c => !c.hidden).length, 1);
submit();
assert.deepEqual(navigations, [semLink.href], 'unique match must navigate to the real tool');

type('journal');
assert.equal(count.textContent, '2');
submit();
assert.equal(journalLink.focused, true, 'multiple results should focus the first matching tool');
assert.equal(navigations.length, 1, 'multiple matches must not choose an arbitrary destination');

type('nonsense_missing_tool');
assert.equal(count.textContent, '0');
assert.equal(empty.hidden, false);
submit();
assert.equal(hubLink.focused, true, 'no results should focus the existing browse-all fallback');
assert.equal(navigations.length, 1);

input.value = '';
form.listeners.reset();
assert.equal(count.textContent, '3', 'reset must restore all choices');
assert.equal(empty.hidden, true);

console.log('Homepage tool search: match counts, Enter, keyboard focus, privacy and reset passed.');
