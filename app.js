(() => {
  'use strict';

  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const context = document.getElementById('context-menu');
  const clock = document.getElementById('clock');

  function setStart(open) {
    menu.hidden = !open;
    start.classList.toggle('pressed', open);
    start.setAttribute('aria-expanded', String(open));
  }

  function closeContext() {
    context.hidden = true;
  }

  start.addEventListener('click', (event) => {
    event.stopPropagation();
    closeContext();
    setStart(menu.hidden);
  });

  menu.addEventListener('mouseover', (event) => {
    const item = event.target.closest('[data-submenu]');
    if (!item) return;
    menu.querySelectorAll('.submenu').forEach((panel) => { panel.hidden = true; });
    const panel = menu.querySelector(`[data-submenu-panel="${item.dataset.submenu}"]`);
    if (!panel) return;
    panel.hidden = false;
    const itemRect = item.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    panel.style.top = `${Math.max(0, itemRect.top - menuRect.top - 1)}px`;
  });

  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && event.target !== start) setStart(false);
    if (!context.hidden && !context.contains(event.target)) closeContext();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setStart(false);
      closeContext();
    }
  });

  desktop.addEventListener('click', (event) => {
    const icon = event.target.closest('.desktop-icon');
    if (!icon) return;
    icons.querySelectorAll('.desktop-icon.selected').forEach((item) => item.classList.remove('selected'));
    icon.classList.add('selected');
  });

  desktop.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.desktop-icon')) return;
    event.preventDefault();
    context.hidden = false;
    context.style.left = `${Math.min(event.clientX, window.innerWidth - 195)}px`;
    context.style.top = `${Math.min(event.clientY, window.innerHeight - 140)}px`;
  });

  context.addEventListener('click', (event) => {
    const action = event.target.closest('[data-context]')?.dataset.context;
    if (action === 'arrange' || action === 'lineup') {
      icons.style.left = '7px';
      icons.style.top = '7px';
    }
    if (action === 'refresh') window.location.reload();
    if (action === 'properties') setStart(false);
    closeContext();
  });

  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  updateClock();
  window.setInterval(updateClock, 1000);
})();
