(() => {
  'use strict';

  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const clock = document.getElementById('clock');

  function setMenu(open) {
    if (!start || !menu) return;
    menu.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
  }

  start?.addEventListener('click', (event) => {
    event.stopPropagation();
    setMenu(menu?.hidden ?? true);
  });

  menu?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-target]');
    if (target) {
      const selector = target.dataset.target;
      setMenu(false);
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (event.target.closest('[data-action="close"]')) setMenu(false);
  });

  document.addEventListener('click', (event) => {
    if (!menu?.hidden && !menu.contains(event.target) && event.target !== start) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  function updateClock() {
    if (clock) {
      clock.textContent = new Date().toLocaleTimeString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  updateClock();
  window.setInterval(updateClock, 1000);
})();
