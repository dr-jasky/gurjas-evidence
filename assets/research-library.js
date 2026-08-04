(() => {
  'use strict';

  const copyButton = document.querySelector('[data-copy-citation]');
  const printButton = document.querySelector('[data-print-entry]');
  const status = document.querySelector('[data-copy-status]');

  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const citation = copyButton.getAttribute('data-citation') || '';
      if (!citation) return;

      try {
        await navigator.clipboard.writeText(citation);
        if (status) status.textContent = 'Citation copied.';
      } catch {
        const area = document.createElement('textarea');
        area.value = citation;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (status) status.textContent = copied ? 'Citation copied.' : 'Copy unavailable; select the citation from the source panel.';
      }
    });
  }

  if (printButton) {
    printButton.addEventListener('click', () => window.print());
  }
})();
