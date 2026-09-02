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

  function shortcutMarkup(item, menuIcon = false, nested = false) {
    const external = /^https?:/i.test(item.url || '');
    if (!menuIcon) {
      return `<a class="desktop-icon" href="${escapeHtml(item.url || '#')}" data-shortcut-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}">${iconMarkup(item)}<span>${escapeHtml(item.title)}</span></a>`;
    }
    const folderClass = item.type === 'folder' ? ' menu-folder-link' : '';
    return `<a class="menu-shortcut${folderClass}${nested ? ' nested' : ''}" href="${escapeHtml(item.url || '#')}" data-menu-shortcut-id="${escapeHtml(item.id)}">${iconMarkup(item, true)}<span>${escapeHtml(item.title)}</span>${item.type === 'folder' ? '<span class="submenu-arrow">▶</span>' : ''}</a>`;
  }

  function resolveItem(id) {
    return catalogItems.get(id) || null;
  }

  function renderMenuEntries(ids, depth = 0) {
    const entries = [];
    ids.forEach(id => {
      const item = resolveItem(id);
      if (!item) return;
      entries.push(shortcutMarkup(item, true, depth > 0));
      if (item.type === 'folder' && Array.isArray(item.children) && item.children.length) {
        entries.push(`<div class="nested-folder" data-folder-id="${escapeHtml(item.id)}">${renderMenuEntries(item.children, depth + 1).join('')}</div>`);
      }
    });
    return entries;
  }

  function renderCatalog(catalog) {
    const sourceItems = Array.isArray(catalog.items) ? catalog.items : (catalog.desktop || []);
    catalogItems = new Map(sourceItems.map(item => [item.id, item]));

    const desktopIds = Array.isArray(catalog.desktop) ? catalog.desktop : sourceItems.map(item => item.id);
    icons.innerHTML = desktopIds.map(resolveItem).filter(Boolean).map(item => shortcutMarkup(item)).join('');

    const quickIds = Array.isArray(catalog.quickLaunch) ? catalog.quickLaunch : desktopIds.slice(0, 4);
    quickLaunch.innerHTML = quickIds.map(resolveItem).filter(Boolean).map(item => {
      const external = /^https?:/i.test(item.url || '');
      return `<a class="quick-button" href="${escapeHtml(item.url || '#')}"${external ? ' target="_blank" rel="noopener"' : ''} aria-label="${escapeHtml(item.title)}">${iconMarkup(item, true)}</a>`;
    }).join('');

    Object.entries(catalog.menus || {}).forEach(([menuId, ids]) => {
      const panel = menu.querySelector(`[data-submenu-panel="${menuId}"]`);
      if (!panel) return;
      panel.innerHTML = renderMenuEntries(ids);
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
    if (item.type === 'folder' && Array.isArray(item.children)) {
      selectedItem = item;
      openShortcutModal(item);
      return;
    }
    if (/^https?:/i.test(item.url || '')) {
      if (newWindow) window.open(item.url, '_blank', 'noopener,noreferrer');
      else window.location.href = item.url;
      return;
    }
    window.location.href = item.url || '#';
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
    const isFolder = item.type === 'folder';
    const childCount = Array.isArray(item.children) ? item.children.length : 0;
    modalName.textContent = item.title;
    modalKind.textContent = isFolder ? `Folder · ${childCount} item${childCount === 1 ? '' : 's'}` : 'Internet shortcut';
    modalPreview.innerHTML = iconMarkup(item);
    detailName.textContent = item.title;
    detailTarget.textContent = isFolder ? `${childCount} item${childCount === 1 ? '' : 's'} inside this folder` : (item.url || '—');
    detailType.textContent = item.type || 'app';
    detailCategory.textContent = item.category || '—';
    detailDescription.textContent = item.description || (isFolder ? 'Folder shortcut. This folder can contain links and other folders.' : 'Shortcut to a web application or page.');
    modal.hidden = false;
    openButton.disabled = isFolder;
    newWindowButton.disabled = isFolder;
    copyButton.disabled = isFolder;
    openButton.focus();
  }

  function closeShortcutModal() {
    modal.hidden = true;
    selectedItem = null;
    icons.querySelectorAll('.desktop-icon.selected').forEach(node => node.classList.remove('selected'));
    openButton.disabled = false;
    newWindowButton.disabled = false;
    copyButton.disabled = false;
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
    const link = event.target.closest('.submenu a');
    if (!link) return;
    const item = catalogItems.get(link.dataset.menuShortcutId);
    if (item?.type === 'folder') {
      event.preventDefault();
      link.classList.toggle('expanded');
      const folder = menu.querySelector(`.nested-folder[data-folder-id="${CSS.escape(item.id)}"]`);
      if (folder) folder.classList.toggle('expanded');
      return;
    }
    setStart(false);
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
    if (!modal.hidden && event.key === 'Enter' && document.activeElement === openButton && !openButton.disabled) {
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
    if (item.type === 'folder') {
      openShortcutModal(item);
      return;
    }
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
    if (!selectedItem || selectedItem.type === 'folder') return;
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
