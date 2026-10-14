/* Gurjas Evidence Studio: small progressive enhancements, no remote search. */
(() => {
  'use strict';
  const root = document.querySelector('[data-product-front-door]');
  if (!root) return;

  const tabs = [...root.querySelectorAll('[data-studio-tab]')];
  const panels = [...root.querySelectorAll('[data-studio-panel]')];

  if (tabs.length === 3 && panels.length === tabs.length) {
    function activate(tab, focus = false) {
      tabs.forEach((candidate) => {
        const selected = candidate === tab;
        candidate.setAttribute('aria-selected', String(selected));
        candidate.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(candidate.getAttribute('aria-controls'));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = tabs[(i + tabs.length - 1) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        activate(next, true);
      });
    });
    activate(tabs[0]);
    root.classList.add('studio-enhanced');
  }

  const form = root.querySelector('[data-product-search]');
  const input = root.querySelector('[data-product-search-input]');
  const cards = [...root.querySelectorAll('[data-product-tool]')];
  const count = root.querySelector('[data-product-search-count]');
  const status = root.querySelector('[data-product-search-status]');
  const empty = root.querySelector('[data-product-search-empty]');
  const directory = root.querySelector('[data-studio-directory]');
  if (!form || !input || !cards.length || !count || !status || !empty || !directory) return;

  const normalize = (value) => String(value).toLocaleLowerCase('en').trim().replace(/\s+/g, ' ');
  function applyFilter() {
    const query = normalize(input.value);
    const terms = query.split(' ').filter(Boolean);
    let visible = 0;
    cards.forEach((card) => {
      const haystack = normalize(card.getAttribute('data-search-text') || card.textContent);
      const match = terms.every((term) => haystack.includes(term));
      card.hidden = !match;
      if (match) visible++;
    });
    count.textContent = String(visible);
    directory.open = Boolean(query) || directory.open;
    empty.hidden = visible !== 0;
    const suffix = status.lastChild;
    if (suffix && suffix.nodeType === 3) {
      suffix.textContent = !query
        ? ' tools available. Filtering stays in your browser.'
        : visible === 0
          ? ' matching tools. Try another phrase or browse all tools.'
          : visible === 1
            ? ' matching tool. Press Enter to open it.'
            : ' matching tools. Press Enter to focus the first result.';
    }
  }
  form.addEventListener('submit', (event) => {
    // Keep research terms local; do not submit them to a web service.
    event.preventDefault();
    applyFilter();
    const matches = cards.filter((card) => !card.hidden);
    directory.open = true;
    const target = matches.length === 0
      ? empty.querySelector('a[href]')
      : matches[0].querySelector('a[href]');
    if (!target) return;
    if (matches.length === 1) window.location.assign(target.href);
    else target.focus();
  });
  form.addEventListener('reset', () => {
    window.requestAnimationFrame(() => {
      input.value = '';
      cards.forEach((card) => { card.hidden = false; });
      directory.open = false;
      applyFilter();
      input.focus();
    });
  });
  input.addEventListener('input', applyFilter);
  applyFilter();
})();