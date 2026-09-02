(() => {
  'use strict';
  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const context = document.getElementById('context-menu');
  const clock = document.getElementById('clock');

  const setStart = (open) => {
    menu.hidden = !open;
    start.classList.toggle('pressed', open);
    start.setAttribute('aria-expanded', String(open));
    if (!open) hideSubmenus();
  };

  const hideSubmenus = () => menu.querySelectorAll('.submenu').forEach(panel => { panel.hidden = true; });

  start.addEventListener('click', (event) => {
    event.stopPropagation();
    closeContext();
    setStart(menu.hidden);
  });

  menu.addEventListener('mouseover', (event) => {
    const item = event.target.closest('.start-item');
    if (!item) return;
    const target = item.getAttribute('href')?.slice(1);
    const panel = menu.querySelector(`[data-submenu-panel="${target}"]`);
    if (!panel) return;
    hideSubmenus();
    panel.hidden = false;
    const menuRect = menu.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    panel.style.top = `${Math.max(0, itemRect.top - menuRect.top - 1)}px`;
  });

  menu.addEventListener('click', event => {
    if (event.target.closest('.submenu a')) setStart(false);
  });

  document.addEventListener('click', event => {
    if (!menu.hidden && !menu.contains(event.target) && event.target !== start) setStart(false);
    if (!context.hidden && !context.contains(event.target)) closeContext();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setStart(false);
      closeContext();
    }
  });

  icons.addEventListener('click', event => {
    const icon = event.target.closest('.desktop-icon');
    if (!icon) return;
    icons.querySelectorAll('.desktop-icon.selected').forEach(item => item.classList.remove('selected'));
    icon.classList.add('selected');
  });

  desktop.addEventListener('contextmenu', event => {
    if (event.target.closest('.desktop-icon')) return;
    event.preventDefault();
    context.hidden = false;
    context.style.left = `${Math.min(event.clientX, window.innerWidth - 195)}px`;
    context.style.top = `${Math.min(event.clientY, window.innerHeight - 135)}px`;
  });

  context.addEventListener('click', event => {
    const action = event.target.closest('[data-context]')?.dataset.context;
    if (action === 'arrange' || action === 'lineup') {
      icons.style.left = '7px';
      icons.style.top = '7px';
    }
    if (action === 'refresh') window.location.reload();
    closeContext();
  });

  function closeContext() { context.hidden = true; }
  function updateClock() { clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  updateClock();
  window.setInterval(updateClock, 1000);
})();
