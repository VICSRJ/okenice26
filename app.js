(() => {
  'use strict';

  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const context = document.getElementById('context-menu');
  const quickLaunch = document.getElementById('quick-launch');
  const clock = document.getElementById('clock');
  const catalogUrl = 'data/links.json';

  const setStart = open => {
    menu.hidden = !open;
    start.classList.toggle('pressed', open);
    start.setAttribute('aria-expanded', String(open));
    if (!open) hideSubmenus();
  };

  const hideSubmenus = () => menu.querySelectorAll('.submenu').forEach(panel => { panel.hidden = true; });

  const escapeHtml = value => String(value).replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));

  function iconMarkup(item, menuIcon = false) {
    if (item.icon) return `<img class="${menuIcon ? 'menu-icon shortcut-menu-icon' : 'shortcut-icon'}" src="${escapeHtml(item.icon)}" alt="">`;
    return `<span class="icon-art icon-folder ${menuIcon ? 'menu-icon' : ''}"></span>`;
  }

  function shortcutMarkup(item, menuIcon = false) {
    const external = /^https?:/i.test(item.url);
    return `<a ${menuIcon ? '' : 'aria-label="'+escapeHtml(item.title)+'"'} class="${menuIcon ? '' : 'desktop-icon'}" href="${escapeHtml(item.url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${iconMarkup(item, menuIcon)}<span>${escapeHtml(item.title)}</span></a>`;
  }

  function renderCatalog(catalog) {
    const items = new Map((catalog.desktop || []).map(item => [item.id, item]));
    icons.innerHTML = (catalog.desktop || []).map(item => shortcutMarkup(item)).join('');

    quickLaunch.innerHTML = (catalog.desktop || []).slice(0, 4).map(item => {
      const external = /^https?:/i.test(item.url);
      return `<a class="quick-button" href="${escapeHtml(item.url)}"${external ? ' target="_blank" rel="noopener"' : ''} aria-label="${escapeHtml(item.title)}">${iconMarkup(item, true)}</a>`;
    }).join('');

    Object.entries(catalog.menus || {}).forEach(([menuId, ids]) => {
      const panel = menu.querySelector(`[data-submenu-panel="${menuId}"]`);
      if (!panel) return;
      panel.innerHTML = ids.map(id => items.get(id)).filter(Boolean).map(item => shortcutMarkup(item, true)).join('');
    });
  }

  async function loadCatalog() {
    try {
      const response = await fetch(catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      const catalog = await response.json();
      renderCatalog(catalog);
    } catch (error) {
      console.error('Shortcut catalog unavailable:', error);
    }
  }

  start.addEventListener('click', event => {
    event.stopPropagation();
    closeContext();
    setStart(menu.hidden);
  });

  menu.addEventListener('mouseover', event => {
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
    if (event.key === 'Escape') { setStart(false); closeContext(); }
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
    context.style.left = `${Math.max(2, Math.min(event.clientX, window.innerWidth - 195))}px`;
    context.style.top = `${Math.max(30, Math.min(event.clientY, window.innerHeight - 135))}px`;
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

  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  loadCatalog();
  updateClock();
  window.setInterval(updateClock, 1000);
})();
