(() => {
  'use strict';

  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const desktopNavigation = document.getElementById('desktop-navigation');
  const desktopBack = document.getElementById('desktop-back');
  const desktopPath = document.getElementById('desktop-path');
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
  const iconBase = 'data/icons/png/';
  const folderIcon = 'icons/folder.icon.svg';

  const localIcons = {
    chatgpt:'chatgpt.png',deepseek:'deepseek.png',gemini:'gemini.png',claude:'claude.png',
    figma:'figma.png',youtube:'youtube.png',notion:'notion.png',spotify:'spotify.png',github:'github.png',
    discord:'discord.png',telegram:'telegram.png',whatsapp:'whatsapp.png',gmail:'gmail.png',steam:'steam.png',
    gog:'gog.png',davinci:'davinci.png',canva:'canva.png',nextjs:'nextjs.png',react:'react.png',vue:'vue.png',
    nuxt:'nuxt.png',vite:'vite.png',vercel:'vercel.png',docker:'docker.png',kubernetes:'kubernetes.png',
    tailwind:'tailwind.png',colab:'colab.png'
  };

  const DOUBLE_CLICK_DELAY = 320;
  let catalogItems = new Map();
  let selectedItem = null;
  let clickTimer = null;
  let currentFolderId = null;
  let rootDesktopIds = [];
  const parentFolders = new Map();

  const setStart = open => {
    menu.hidden = !open;
    start.classList.toggle('pressed', open);
    start.setAttribute('aria-expanded', String(open));
    if (!open) hideSubmenus();
  };

  const hideSubmenus = () => menu.querySelectorAll('.submenu').forEach(panel => { panel.hidden = true; });
  const escapeHtml = value => String(value).replace(/[&<>\"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[char]));

  function localIcon(item) {
    if (item?.type === 'folder') return folderIcon;
    const file = localIcons[item?.id];
    return file ? iconBase + file : '';
  }

  function faviconCandidates(item) {
    if (!item?.url || !/^https?:/i.test(item.url)) return [];
    try {
      const target = new URL(item.url);
      const origin = target.origin;
      const host = target.hostname;
      const local = localIcon(item);
      const remote = [
        `${origin}/apple-touch-icon.png`, `${origin}/favicon.svg`, `${origin}/favicon.png`, `${origin}/favicon.ico`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
      ];
      return [...new Set([local, ...remote, item.icon || ''].filter(Boolean))];
    } catch {
      return [localIcon(item), item.icon || ''].filter(Boolean);
    }
  }

  function iconMarkup(item, menuIcon = false) {
    if (item.type === 'folder') return `<img class="${menuIcon ? 'menu-icon shortcut-menu-icon' : 'shortcut-icon'} favicon-image local-icon" src="${folderIcon}" alt="" loading="eager" decoding="async">`;
    const candidates = faviconCandidates(item);
    if (!candidates.length) return '<span class="icon-art icon-folder"></span>';
    const sizeClass = menuIcon ? 'menu-icon shortcut-menu-icon' : 'shortcut-icon';
    return `<img class="${sizeClass} favicon-image" src="${escapeHtml(candidates[0])}" data-favicon-fallbacks="${escapeHtml(candidates.slice(1).join('|'))}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">`;
  }

  function bindFaviconImages(root = document) {
    root.querySelectorAll('img[data-favicon-fallbacks]').forEach(image => {
      if (image.dataset.faviconBound === '1') return;
      image.dataset.faviconBound = '1';
      image.addEventListener('error', () => {
        const queue = (image.dataset.faviconFallbacks || '').split('|').filter(Boolean);
        const next = queue.shift();
        image.dataset.faviconFallbacks = queue.join('|');
        if (next) image.src = next;
        else { image.classList.add('favicon-missing'); image.removeAttribute('src'); }
      });
    });
  }

  function shortcutMarkup(item, menuIcon = false, nested = false) {
    if (!menuIcon) return `<a class="desktop-icon" href="${escapeHtml(item.url || '#')}" data-shortcut-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}">${iconMarkup(item)}<span>${escapeHtml(item.title)}</span></a>`;
    const folderClass = item.type === 'folder' ? ' menu-folder-link' : '';
    return `<a class="menu-shortcut${folderClass}${nested ? ' nested' : ''}" href="${escapeHtml(item.url || '#')}" data-menu-shortcut-id="${escapeHtml(item.id)}">${iconMarkup(item, true)}<span>${escapeHtml(item.title)}</span>${item.type === 'folder' ? '<span class="submenu-arrow">▶</span>' : ''}</a>`;
  }

  const resolveItem = id => catalogItems.get(id) || null;

  function renderMenuEntries(ids, depth = 0) {
    return ids.map(id => resolveItem(id)).filter(Boolean).flatMap(item => {
      const entries = [shortcutMarkup(item, true, depth > 0)];
      if (item.type === 'folder' && Array.isArray(item.children) && item.children.length) entries.push(`<div class="nested-folder" data-folder-id="${escapeHtml(item.id)}">${renderMenuEntries(item.children, depth + 1).join('')}</div>`);
      return entries;
    });
  }

  function buildFolderRelations() {
    parentFolders.clear();
    catalogItems.forEach(item => {
      if (item.type !== 'folder' || !Array.isArray(item.children)) return;
      item.children.forEach(child => { if (!parentFolders.has(child)) parentFolders.set(child, item.id); });
    });
  }

  function folderPath(item) {
    const parts = [item.title];
    let parentId = parentFolders.get(item.id);
    const seen = new Set();
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = resolveItem(parentId);
      if (!parent) break;
      parts.unshift(parent.title);
      parentId = parentFolders.get(parent.id);
    }
    return ['Desktop', ...parts].join(' > ');
  }

  function renderDesktop(ids, folder = null) {
    icons.innerHTML = ids.map(resolveItem).filter(Boolean).map(item => shortcutMarkup(item)).join('');
    bindFaviconImages(icons);
    currentFolderId = folder ? folder.id : null;
    desktopNavigation.hidden = !folder;
    desktopBack.disabled = !folder;
    desktopPath.textContent = folder ? folderPath(folder) : 'Desktop';
    desktop.setAttribute('aria-label', folder ? `Windows 98 Desktop — ${folder.title}` : 'Windows 98 Desktop');
  }

  function openFolder(item) {
    if (!item || item.type !== 'folder') return;
    closeShortcutModal();
    renderDesktop(Array.isArray(item.children) ? item.children : [], item);
  }

  function goBackFolder() {
    if (!currentFolderId) return;
    const parentId = parentFolders.get(currentFolderId);
    const parent = parentId ? resolveItem(parentId) : null;
    renderDesktop(parent ? (parent.children || []) : rootDesktopIds, parent);
  }

  function renderCatalog(catalog) {
    const sourceItems = Array.isArray(catalog.items) ? catalog.items : (catalog.desktop || []);
    catalogItems = new Map(sourceItems.map(item => [item.id, item]));
    buildFolderRelations();
    rootDesktopIds = Array.isArray(catalog.desktop) ? catalog.desktop : sourceItems.map(item => item.id);
    renderDesktop(rootDesktopIds);
    const quickIds = Array.isArray(catalog.quickLaunch) ? catalog.quickLaunch : rootDesktopIds.slice(0, 4);
    quickLaunch.innerHTML = quickIds.map(resolveItem).filter(Boolean).map(item => `<a class="quick-button" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener" aria-label="${escapeHtml(item.title)}">${iconMarkup(item, true)}</a>`).join('');
    bindFaviconImages(quickLaunch);
    Object.entries(catalog.menus || {}).forEach(([menuId, ids]) => {
      const panel = menu.querySelector(`[data-submenu-panel="${menuId}"]`);
      if (panel) { panel.innerHTML = renderMenuEntries(ids).join(''); bindFaviconImages(panel); }
    });
  }

  async function loadCatalog() {
    try {
      const response = await fetch(catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      renderCatalog(await response.json());
    } catch (error) { console.error('Shortcut catalog unavailable:', error); }
  }

  function openTarget(item, newWindow = false) {
    if (!item) return;
    if (item.type === 'folder') return openFolder(item);
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
    link.classList.add('selected'); selectedItem = item; openShortcutModal(item);
  }

  function openShortcutModal(item) {
    const isFolder = item.type === 'folder';
    const childCount = Array.isArray(item.children) ? item.children.length : 0;
    modalName.textContent = item.title;
    modalKind.textContent = isFolder ? `Folder · ${childCount} item${childCount === 1 ? '' : 's'}` : 'Internet shortcut';
    modalPreview.innerHTML = iconMarkup(item); bindFaviconImages(modalPreview);
    detailName.textContent = item.title;
    detailTarget.textContent = isFolder ? folderPath(item) : (item.url || '—');
    detailType.textContent = item.type || 'app';
    detailCategory.textContent = item.category || '—';
    detailDescription.textContent = item.description || (isFolder ? 'Folder shortcut. This folder can contain links and other folders.' : 'Shortcut to a web application or page.');
    modal.hidden = false; openButton.disabled = false; openButton.textContent = isFolder ? 'Open Folder' : 'Open';
    newWindowButton.disabled = isFolder; copyButton.disabled = isFolder; openButton.focus();
  }

  function closeShortcutModal() {
    modal.hidden = true; selectedItem = null;
    icons.querySelectorAll('.desktop-icon.selected').forEach(node => node.classList.remove('selected'));
    openButton.disabled = false; openButton.textContent = 'Open'; newWindowButton.disabled = false; copyButton.disabled = false;
  }

  start.addEventListener('click', event => { event.stopPropagation(); closeContext(); setStart(menu.hidden); });

  menu.addEventListener('mouseover', event => {
    const item = event.target.closest('.start-item'); if (!item) return;
    const target = item.getAttribute('href')?.slice(1); const panel = menu.querySelector(`[data-submenu-panel="${target}"]`); if (!panel) return;
    hideSubmenus(); panel.hidden = false;
    const menuRect = menu.getBoundingClientRect(); const itemRect = item.getBoundingClientRect();
    panel.style.top = `${Math.max(0, itemRect.top - menuRect.top - 1)}px`;
  });

  menu.addEventListener('click', event => {
    const link = event.target.closest('.submenu a'); if (!link) return;
    const item = catalogItems.get(link.dataset.menuShortcutId);
    if (item?.type === 'folder') {
      event.preventDefault(); link.classList.toggle('expanded');
      const folder = menu.querySelector(`.nested-folder[data-folder-id="${CSS.escape(item.id)}"]`); if (folder) folder.classList.toggle('expanded'); return;
    }
    setStart(false);
  });

  document.addEventListener('click', event => {
    if (!menu.hidden && !menu.contains(event.target) && event.target !== start) setStart(false);
    if (!context.hidden && !context.contains(event.target)) closeContext();
    if (!modal.hidden && !event.target.closest('.shortcut-dialog')) closeShortcutModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { setStart(false); closeContext(); if (!modal.hidden) closeShortcutModal(); }
    if (!modal.hidden && event.key === 'Enter' && document.activeElement === openButton && !openButton.disabled) openTarget(selectedItem, false);
    if (modal.hidden && event.altKey && event.key === 'ArrowLeft' && currentFolderId) { event.preventDefault(); goBackFolder(); }
  });

  desktopBack.addEventListener('click', goBackFolder);

  icons.addEventListener('click', event => {
    const icon = event.target.closest('.desktop-icon'); if (!icon) return;
    event.preventDefault(); clearTimeout(clickTimer); clickTimer = setTimeout(() => selectDesktopShortcut(icon), DOUBLE_CLICK_DELAY);
  });

  icons.addEventListener('dblclick', event => {
    const icon = event.target.closest('.desktop-icon'); if (!icon) return;
    event.preventDefault(); clearTimeout(clickTimer);
    const item = catalogItems.get(icon.dataset.shortcutId); if (item) openTarget(item, false);
  });

  desktop.addEventListener('contextmenu', event => {
    if (event.target.closest('.desktop-icon') || event.target.closest('.desktop-navigation')) return;
    event.preventDefault(); context.hidden = false;
    context.style.left = `${Math.max(2, Math.min(event.clientX, window.innerWidth - 195))}px`;
    context.style.top = `${Math.max(30, Math.min(event.clientY, window.innerHeight - 135))}px`;
  });

  context.addEventListener('click', event => {
    const action = event.target.closest('[data-context]')?.dataset.context;
    if (action === 'arrange' || action === 'lineup') { icons.style.left = '7px'; icons.style.top = '7px'; }
    if (action === 'refresh') window.location.reload(); closeContext();
  });

  closeButton.addEventListener('click', closeShortcutModal); cancelButton.addEventListener('click', closeShortcutModal);
  openButton.addEventListener('click', () => openTarget(selectedItem, false));
  newWindowButton.addEventListener('click', () => openTarget(selectedItem, true));
  copyButton.addEventListener('click', async () => {
    if (!selectedItem || selectedItem.type === 'folder') return;
    try { await navigator.clipboard.writeText(selectedItem.url); copyButton.textContent = 'Copied'; }
    catch { copyButton.textContent = 'Copy failed'; }
    window.setTimeout(() => { copyButton.textContent = 'Copy Link'; }, 900);
  });

  function closeContext() { context.hidden = true; }
  function updateClock() { clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

  loadCatalog(); updateClock(); window.setInterval(updateClock, 1000);
})();
