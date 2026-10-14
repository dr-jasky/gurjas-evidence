(() => {
  const root = document.querySelector('[data-product-front-door]');
  if (!root) return;

  const form = root.querySelector('[data-product-search]');
  const input = root.querySelector('[data-product-search-input]');
  const cards = [...root.querySelectorAll('[data-product-tool]')];
  const count = root.querySelector('[data-product-search-count]');
  const status = root.querySelector('[data-product-search-status]');
  const empty = root.querySelector('[data-product-search-empty]');

  if (!form || !input || !count || !status || !empty || cards.length === 0) return;

  const normalize = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ');

  const applyFilter = () => {
    const query = normalize(input.value);
    let visible = 0;

    cards.forEach((card) => {
      const haystack = normalize(card.dataset.searchText || card.textContent || '');
      const matches = !query || query.split(' ').every((term) => haystack.includes(term));
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    count.textContent = String(visible);
    empty.hidden = visible !== 0;
    status.dataset.filtered = query ? 'true' : 'false';
    // Announce the real scope of the interface: it filters our tool catalogue,
    // not research literature or the open web. The count remains a live region.
    const suffix = status.lastChild;
    if (suffix && suffix.nodeType === Node.TEXT_NODE) {
      suffix.textContent = !query
        ? ' tools available. Filtering happens only in your browser.'
        : visible === 0
          ? ' matching tools. Try another term or browse the tools hub.'
          : visible === 1
            ? ' matching tool. Press Enter to open it.'
            : ' matching tools. Press Enter to focus the first result.';
    }
  };

  // Enter should do something useful, rather than silently cancelling the form.
  // Only navigate directly when there is exactly one matching canonical tool.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const matches = cards.filter((card) => !card.hidden);
    if (matches.length === 1) {
      const link = matches[0].querySelector('a[href]');
      if (link) window.location.assign(link.href);
      return;
    }
    const target = matches.length > 0
      ? matches[0].querySelector('a[href]')
      : empty.querySelector('a[href]');
    if (target) target.focus();
  });
  form.addEventListener('reset', () => {
    window.requestAnimationFrame(() => {
      input.value = '';
      applyFilter();
      input.focus();
    });
  });
  input.addEventListener('input', applyFilter);

  applyFilter();
})();
