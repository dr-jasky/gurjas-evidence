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
  };

  form.addEventListener('submit', (event) => event.preventDefault());
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
