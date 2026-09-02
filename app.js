(() => {
  const grid = document.querySelector('#project-grid');
  const cards = [...document.querySelectorAll('.project-card')];
  const tabs = [...document.querySelectorAll('.tab[data-filter]')];
  const search = document.querySelector('#project-search');
  const reset = document.querySelector('#reset-search');
  const empty = document.querySelector('#empty-state');
  const dialog = document.querySelector('#project-dialog');
  const dialogTitle = document.querySelector('#dialog-title');
  const dialogCopy = document.querySelector('#dialog-copy');
  const close = document.querySelector('#dialog-close');
  const start = document.querySelector('#start-button');
  const clock = document.querySelector('#clock');
  let activeFilter = 'all';

  function render() {
    const q = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
      const matchesSearch = !q || (card.dataset.name || '').includes(q);
      const show = matchesFilter && matchesSearch;
      card.hidden = !show;
      if (show) visible++;
    });
    if (grid) grid.setAttribute('aria-hidden', visible === 0 ? 'true' : 'false');
    if (empty) empty.hidden = visible !== 0;
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    activeFilter = tab.dataset.filter || 'all';
    tabs.forEach(t => {
      const selected = t === tab;
      t.classList.toggle('is-active', selected);
      t.setAttribute('aria-selected', String(selected));
    });
    render();
  }));

  search?.addEventListener('input', render);
  reset?.addEventListener('click', () => {
    if (search) search.value = '';
    activeFilter = 'all';
    tabs.forEach(t => {
      const selected = t.dataset.filter === 'all';
      t.classList.toggle('is-active', selected);
      t.setAttribute('aria-selected', String(selected));
    });
    render();
    search?.focus();
  });

  document.querySelectorAll('.project-open').forEach(button => {
    button.addEventListener('click', () => {
      const name = button.dataset.project || 'Projekt';
      if (dialogTitle) dialogTitle.textContent = name;
      if (dialogCopy) dialogCopy.textContent = `${name} je součástí rozhraní Okenice26. Tato karta je připravená pro napojení na samostatnou stránku nebo další repozitář.`;
      if (dialog?.showModal) dialog.showModal();
      else dialog?.setAttribute('open', '');
    });
  });

  close?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  start?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    start.classList.add('is-active');
    setTimeout(() => start.classList.remove('is-active'), 180);
  });

  function updateClock() {
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 1000);
  render();
})();
