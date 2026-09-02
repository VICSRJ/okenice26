(() => {
  'use strict';

  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const context = document.getElementById('context-menu');
  const quickLaunch = document.getElementById('quick-launch');
  const clock = document.getElementById('clock');
  const modal = document.getElementById('shortcut-modal');
  const modalName = document.getElementById('shortcut-name');
  const modalKind = document.getElementById('shortcut-kind');
  const modalPreview = document.getElementById('shortcut-preview');
  const detailName = document.getElementById('shortcut-detail-name');
  const detailTarget = document.getElementById('shortcut-target');
  const detailType = document.getElementById('shortcut-detail-type');
  const detailCategory = document.getElementById('shortcut-category');
  const detailDescription = document.getElementById('shortcut-description');
  const openButton = document.getElementById('shortcut-open');
  const newWindowButton = document.getElementById('shortcut-new-window');
  const copyButton = document.getElementById('shortcut-copy');
  const closeButton = document.getElementById('shortcut-close');
  const cancelButton = document.getElementById('shortcut-cancel');
  const catalogUrl = 'data/links.json';

  const DOUBLE_CLICK_DELAY = 320;
  let catalogItems = new Map();
  let selectedItem = null;
  let clickTimer = null;

  const setStart = open => {
    menu.hidden = !open;
    start.classList.toggle('pressed', open);
    start.setAttribute('aria-expanded', String(open));
    if (!open) hideSubmenus();
  };

  const hideSubmenus = () => menu.querySelectorAll('.submenu').forEach(panel => { panel.hidden = true; });

  const escapeHtml = value => String(value).replace(/[&<>\"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[char]));

  function iconMarkup(item, menuIcon = false) {
    if (item.icon) return `<img class="${menuIcon ? 'menu-icon shortcut-menu-icon' : 'shortcut-icon'}" src="${escapeHtml(item.icon)}" alt="">`;
    return `<span class="icon-art icon-folder ${menuIcon ? 'menu-icon' : ''}"></span>`;
  }

  function shortcutMarkup(item, menuIcon = false) {
    const external = /^https?:/i.test(item.url);
    if (!menuIcon) {
      return `<a class="desktop-icon" href="${escapeHtml(item.url)}" data-shortcut-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}">${iconMarkup(item)}<span>${escapeHtml(item.title)}</span></a>`;
    }
    return `<a href="${escapeHtml(item.url)}" data-menu-shortcut-id="${escapeHtml(item.id)}"${external ? ' target="_blank" rel="noopener"' : ''}>${iconMarkup(item, true)}<span>${escapeHtml(item.title)}</span></a>`;
  }

  function renderCatalog(catalog) {
    catalogItems = new Map((catalog.desktop || []).map(item => [item.id, item]));
    icons.innerHTML = (catalog.desktop || []).map(item => shortcutMarkup(item)).join('');

    quickLaunch.innerHTML = (catalog.desktop || []).slice(0, 4).map(item => {
      const external = /^https?:/i.test(item.url);
      return `<a class="quick-button" href="${escapeHtml(item.url)}"${external ? ' target="_blank" rel="noopener"' : ''} aria-label="${escapeHtml(item.title)}">${iconMarkup(item, true)}</a>`;
    }).join('');

    Object.entries(catalog.menus || {}).forEach(([menuId, ids]) => {
      const panel = menu.querySelector(`[data-submenu-panel="${menuId}"]`);
      if (!panel) return;
      panel.innerHTML = ids.map(id => catalogItems.get(id)).filter(Boolean).map(item => shortcutMarkup(item, true)).join('');
    });
  }

  async function loadCatalog() {
    try {
      const response = await fetch(catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      renderCatalog(await response.json());
    } catch (error) {
      console.error('Shortcut catalog unavailable:', error);
    }
  }

  function openTarget(item, newWindow = false) {
    if (!item) return;
    if (/^https?:/i.test(item.url)) {
      if (newWindow) window.open(item.url, '_blank', 'noopener,noreferrer');
      else window.location.href = item.url;
      return;
    }
    window.location.href = item.url;
  }

  function selectDesktopShortcut(link) {
    const item = catalogItems.get(link.dataset.shortcutId);
    if (!item) return;
    icons.querySelectorAll('.desktop-icon.selected').forEach(node => node.classList.remove('selected'));
    link.classList.add('selected');
    selectedItem = item;
    openShortcutModal(item);
  }

  function openShortcutModal(item) {
    modalName.textContent = item.title;
    modalKind.textContent = item.type === 'folder' ? 'Folder shortcut' : 'Internet shortcut';
    modalPreview.innerHTML = iconMarkup(item);
    detailName.textContent = item.title;
    detailTarget.textContent = item.url;
    detailType.textContent = item.type || 'app';
    detailCategory.textContent = item.category || '—';
    detailDescription.textContent = item.description || (item.type === 'folder' ? 'Shortcut to a folder or collection.' : 'Shortcut to a web application or page.');
    modal.hidden = false;
    openButton.focus();
  }

  function closeShortcutModal() {
    modal.hidden = true;
    selectedItem = null;
    icons.querySelectorAll('.desktop-icon.selected').forEach(node => node.classList.remove('selected'));
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
    if (!modal.hidden && !event.target.closest('.shortcut-dialog')) closeShortcutModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setStart(false);
      closeContext();
      if (!modal.hidden) closeShortcutModal();
    }
    if (!modal.hidden && event.key === 'Enter' && document.activeElement === openButton) {
      openTarget(selectedItem, false);
    }
  });

  icons.addEventListener('click', event => {
    const icon = event.target.closest('.desktop-icon');
    if (!icon) return;
    event.preventDefault();
    window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => selectDesktopShortcut(icon), DOUBLE_CLICK_DELAY);
  });

  icons.addEventListener('dblclick', event => {
    const icon = event.target.closest('.desktop-icon');
    if (!icon) return;
    event.preventDefault();
    window.clearTimeout(clickTimer);
    const item = catalogItems.get(icon.dataset.shortcutId);
    if (!item) return;
    selectedItem = item;
    openTarget(item, false);
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

  closeButton.addEventListener('click', closeShortcutModal);
  cancelButton.addEventListener('click', closeShortcutModal);
  openButton.addEventListener('click', () => openTarget(selectedItem, false));
  newWindowButton.addEventListener('click', () => openTarget(selectedItem, true));
  copyButton.addEventListener('click', async () => {
    if (!selectedItem) return;
    try {
      await navigator.clipboard.writeText(selectedItem.url);
      copyButton.textContent = 'Copied';
      window.setTimeout(() => { copyButton.textContent = 'Copy Link'; }, 900);
    } catch {
      copyButton.textContent = 'Copy failed';
      window.setTimeout(() => { copyButton.textContent = 'Copy Link'; }, 900);
    }
  });

  function closeContext() { context.hidden = true; }

  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  loadCatalog();
  updateClock();
  window.setInterval(updateClock, 1000);
})();
