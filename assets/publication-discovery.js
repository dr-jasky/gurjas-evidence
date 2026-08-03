(() => {
  const form = document.querySelector('[data-publication-finder]');
  if (!form) return;

  const queryInput = form.querySelector('#publication-query');
  const typeSelect = form.querySelector('#publication-type');
  const resetButton = form.querySelector('[data-publication-reset]');
  const status = document.querySelector('[data-publication-status]');
  const sections = ['journal-articles', 'book-chapters', 'working-papers']
    .map((id) => document.getElementById(id)?.closest('section'))
    .filter(Boolean);

  const normalize = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  const apply = () => {
    const query = normalize(queryInput.value);
    const selectedType = typeSelect.value;
    let visible = 0;
    let total = 0;

    sections.forEach((section) => {
      const heading = section.querySelector('h2[id]');
      const sectionType = heading?.id || '';
      const list = heading?.nextElementSibling?.matches('ol.pub-list')
        ? heading.nextElementSibling
        : section.querySelector('ol.pub-list');
      if (!list) return;

      [...list.children].forEach((item) => {
        total += 1;
        const matchesType = selectedType === 'all' || selectedType === sectionType;
        const matchesQuery = !query || normalize(item.textContent).includes(query);
        item.hidden = !(matchesType && matchesQuery);
        if (!item.hidden) visible += 1;
      });
    });

    status.textContent = visible === total
      ? `Showing all ${total} publication records.`
      : `Showing ${visible} of ${total} publication records.`;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    apply();
  });

  resetButton.addEventListener('click', () => {
    form.reset();
    apply();
    queryInput.focus();
  });
})();
