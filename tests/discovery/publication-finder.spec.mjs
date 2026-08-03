import fs from 'node:fs';

const html = fs.readFileSync('_site/publications/index.html', 'utf8');
const script = fs.readFileSync('assets/publication-discovery.js', 'utf8');
let failures = 0;
const check = (condition, message) => {
  if (condition) console.log(`PASS — ${message}`);
  else { failures += 1; console.error(`FAIL — ${message}`); }
};

check((html.match(/class="publication-discovery"/g) || []).length === 1, 'publication discovery appears exactly once in generated output');
check(html.includes('role="search"') && html.includes('data-publication-finder'), 'finder exposes a search landmark');
check(html.includes('<label for="publication-query">') && html.includes('<label for="publication-type">'), 'finder controls have visible labels');
check(html.includes('role="status"') && html.includes('aria-live="polite"'), 'result count is announced without moving focus');
for (const id of ['journal-articles', 'book-chapters', 'working-papers', 'research-profiles']) {
  check(html.includes(`id="${id}"`), `${id} has a stable deep-link target`);
  check(html.includes(`href="#${id}"`), `${id} is available from the output navigation`);
}
check(html.includes('../assets/publication-discovery.css?v=1'), 'generated page loads the governed finder stylesheet');
check(html.includes('../assets/publication-discovery.js?v=1'), 'generated page loads the governed finder script');
check(script.includes("event.preventDefault()"), 'filter submission is progressively enhanced');
check(script.includes('item.hidden'), 'filtering preserves the original bibliography and toggles visibility only');
check(script.includes('form.reset()') && script.includes('queryInput.focus()'), 'reset restores the full record and returns focus predictably');
check(!/fetch\(|localStorage|sessionStorage|document\.cookie/.test(script), 'finder sends no publication queries or browsing data elsewhere');

if (failures) process.exit(1);
console.log('\nAll publication discovery checks passed.');
