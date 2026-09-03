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

  if (!start || !menu || !desktop || !icons || !desktopNavigation || !desktopBack) return;

  const catalogUrl = 'data/links.json';
  const folderIcons = [
    'https://cdn.jsdelivr.net/gh/ryokun6/ryos@main/public/resources/windows-icon-catalogs/win98/folders/directory-closed.png',
    'https://raw.githubusercontent.com/ryokun6/ryos/main/public/resources/windows-icon-catalogs/win98/folders/directory-closed.png'
  ];

  const DOUBLE_CLICK_DELAY = 300;
  let catalogItems = new Map();
  let selectedItem = null;
  let clickTimer = null;
  let clickTarget = null;
  let currentFolderId = null;
  let rootDesktopIds = [];
  const parentFolders = new Map();

  const escapeHtml = value => String(value).replace(/[&<>\"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[char]));

  function safeHttpUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value), document.baseURI);
      return /^(https?:)$/i.test(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function safeIconSource(value) {
    if (!value) return '';
    const raw = String(value).trim();
    if (/^data:image\//i.test(raw)) return raw;
    try {
      const url = new URL(raw, document.baseURI);
      if (/^(https?:)$/i.test(url.protocol)) return url.href;
      if (url.protocol === 'file:') return '';
      if (url.origin === window.location.origin) return `${url.pathname}${url.search}${url.hash}`;
    } catch {}
    return '';
  }

  function faviconCandidates(item) {
    if (item?.type === 'folder') return folderIcons;
    const saved = safeIconSource(item?.icon);
    const targetUrl = safeHttpUrl(item?.url);
    if (!targetUrl) return [...new Set([saved].filter(Boolean))];
    const target = new URL(targetUrl);
    const remote = [
      `${target.origin}/apple-touch-icon.png`,
      `${target.origin}/apple-touch-icon-precomposed.png`,
      `${target.origin}/favicon.svg`,
      `${target.origin}/favicon.png`,
      `${target.origin}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(target.hostname)}&sz=128`
    ];
    return [...new Set([...remote, saved].filter(Boolean))];
  }

  function iconMarkup(item, menuIcon = false) {
    const sizeClass = menuIcon ? 'menu-icon shortcut-menu-icon' : 'shortcut-icon';
    const candidates = faviconCandidates(item);
    if (!candidates.length) return '<span class="icon-art icon-folder" aria-hidden="true"></span>';
    return `<img class="${sizeClass} favicon-image${item.type === 'folder' ? ' folder-icon' : ''}" src="${escapeHtml(candidates[0])}" data-favicon-fallbacks="${escapeHtml(candidates.slice(1).join('|'))}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer">`;
  }

  function replaceWithFolderFallback(image) {
    if (!image.classList.contains('folder-icon')) return false;
    const fallback = document.createElement('span');
    fallback.className = 'icon-art icon-folder folder-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    image.replaceWith(fallback);
    return true;
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
        else if (!replaceWithFolderFallback(image)) {
          image.classList.add('favicon-missing');
          image.removeAttribute('src');
        }
      });
    });
  }

  function shortcutMarkup(item, menuIcon = false) {
    if (!menuIcon) {
      if (item.type === 'folder') {
        return `<button class="desktop-icon is-folder" type="button" data-shortcut-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}">${iconMarkup(item)}<span>${escapeHtml(item.title)}</span></button>`;
      }
      const href = safeHttpUrl(item.url);
      return `<a class="desktop-icon"${href ? ` href="${escapeHtml(href)}"` : ''} data-shortcut-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}">${iconMarkup(item)}<span>${escapeHtml(item.title)}</span></a>`;
    }
    if (item.type === 'folder') {
      return `<div class="menu-group" data-menu-folder="${escapeHtml(item.id)}"><button class="menu-shortcut menu-folder-link" type="button" data-menu-folder-toggle="${escapeHtml(item.id)}">${iconMarkup(item, true)}<span>${escapeHtml(item.title)}</span><span class="submenu-arrow">▶</span></button><div class="submenu nested-submenu" data-menu-nested="${escapeHtml(item.id)}" hidden>${renderMenuEntries(item.children || []).join('')}</div></div>`;
    }
    const href = safeHttpUrl(item.url);
    if (!href) return `<button class="menu-shortcut" type="button" data-menu-invalid="1">${iconMarkup(item, true)}<span>${escapeHtml(item.title)}</span></button>`;
    return `<a class="menu-shortcut" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" data-menu-shortcut-id="${escapeHtml(item.id)}">${iconMarkup(item, true)}<span>${escapeHtml(item.title)}</span></a>`;
  }

  function renderMenuEntries(ids) {
    return ids.map(id => resolveItem(id)).filter(Boolean).map(item => shortcutMarkup(item, true));
  }

  const resolveItem = id => catalogItems.get(id) || null;

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

  function dispatchDesktopRender(folder) {
    window.dispatchEvent(new CustomEvent('okenice:desktop-rendered', {
      detail: { folderId: folder?.id || null, itemCount: icons.children.length }
    }));
  }

  function renderDesktop(ids, folder = null) {
    icons.innerHTML = ids.map(resolveItem).filter(Boolean).map(item => shortcutMarkup(item)).join('');
    bindFaviconImages(icons);
    currentFolderId = folder ? folder.id : null;
    desktopNavigation.hidden = !folder;
    desktopBack.disabled = !folder;
    desktopPath.textContent = folder ? folderPath(folder) : 'Desktop';
    desktop.setAttribute('aria-label', folder ? `Windows 98 Desktop — ${folder.title}` : 'Windows 98 Desktop');
    dispatchDesktopRender(folder);
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
    const sourceItems = Array.isArray(catalog.items) ? catalog.items : [];
    catalogItems = new Map(sourceItems.map(item => [item.id, item]));
    buildFolderRelations();
    rootDesktopIds = (Array.isArray(catalog.desktop) ? catalog.desktop : [])
      .filter(id => resolveItem(id)?.type === 'folder');
    renderDesktop(rootDesktopIds);

    const quickIds = Array.isArray(catalog.quickLaunch) ? catalog.quickLaunch : [];
    quickLaunch.innerHTML = quickIds.map(resolveItem).filter(item => item && item.type !== 'folder').map(item => {
      const href = safeHttpUrl(item.url);
      if (!href) return '';
      return `<a class="quick-button" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.title)}">${iconMarkup(item, true)}</a>`;
    }).join('');
    bindFaviconImages(quickLaunch);

    Object.entries(catalog.menus || {}).forEach(([menuId, ids]) => {
      const panel = menu.querySelector(`[data-submenu-panel="${menuId}"]`);
      if (panel) {
        panel.innerHTML = renderMenuEntries(ids).join('');
        bindFaviconImages(panel);
      }
    });

    document.documentElement.dataset.appReady = 'true';
  }

  async function loadCatalog() {
    try {
      const response = await fetch(catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      renderCatalog(await response.json());
    } catch (error) {
      console.error('Shortcut catalog unavailable:', error);
      document.documentElement.dataset.appReady = 'error';
    }
  }

  function openTarget(item, newWindow = false) {
    if (!item) return;
    if (item.type === 'folder') return openFolder(item);
    const href = safeHttpUrl(item.url);
    if (!href) return;
    if (newWindow) window.open(href, '_blank', 'noopener,noreferrer');
    else window.location.assign(href);
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
    if (!item) return;
    const isFolder = item.type === 'folder';
    const childCount = Array.isArray(item.children) ? item.children.length : 0;
    modalName.textContent = item.title;
    modalKind.textContent = isFolder ? `Folder · ${childCount} item${childCount === 1 ? '' : 's'}` : 'Internet shortcut';
    modalPreview.innerHTML = iconMarkup(item);
    bindFaviconImages(modalPreview);
    detailName.textContent = item.title;
    detailTarget.textContent = isFolder ? folderPath(item) : (safeHttpUrl(item.url) || '—');
    detailType.textContent = item.type || 'app';
    detailCategory.textContent = item.category || '—';
    detailDescription.textContent = item.description || (isFolder ? 'Folder shortcut. Double-click opens the folder.' : 'Shortcut to a web application or page.');
    modal.hidden = false;
    openButton.disabled = false;
    openButton.textContent = isFolder ? 'Open Folder' : 'Open';
    newWindowButton.disabled = isFolder || !safeHttpUrl(item.url);
    copyButton.textContent = 'Copy Link';
    copyButton.disabled = isFolder;
  }

  function closeShortcutModal() {
    modal.hidden = true;
    selectedItem = null;
    icons.querySelectorAll('.desktop-icon.selected').forEach(node => node.classList.remove('selected'));
  }

  function openStartMenu() {
    menu.hidden = false;
    start.setAttribute('aria-expanded', 'true');
  }

  function closeStartMenu() {
    menu.hidden = true;
    start.setAttribute('aria-expanded', 'false');
    menu.querySelectorAll('.menu-group.open').forEach(group => group.classList.remove('open'));
    menu.querySelectorAll('.nested-submenu:not([hidden])').forEach(panel => { panel.hidden = true; });
  }

  function toggleNestedFolder(button) {
    const group = button.closest('.menu-group');
    const nested = group?.querySelector('.nested-submenu');
    if (!nested) return;
    const willOpen = nested.hidden;
    group.classList.toggle('open', willOpen);
    nested.hidden = !willOpen;
  }

  document.addEventListener('click', event => {
    const desktopLink = event.target.closest('#desktop-icons .desktop-icon');
    if (desktopLink) {
      event.preventDefault();
      const item = catalogItems.get(desktopLink.dataset.shortcutId);
      if (!item) return;

      if (clickTimer && clickTarget === desktopLink) {
        clearTimeout(clickTimer);
        clickTimer = null;
        clickTarget = null;
        return;
      }

      if (clickTimer) clearTimeout(clickTimer);
      clickTarget = desktopLink;
      clickTimer = setTimeout(() => {
        selectDesktopShortcut(desktopLink);
        clickTimer = null;
        clickTarget = null;
      }, DOUBLE_CLICK_DELAY);
      return;
    }

    const nestedButton = event.target.closest('[data-menu-folder-toggle]');
    if (nestedButton) {
      event.preventDefault();
      toggleNestedFolder(nestedButton);
      return;
    }

    if (event.target.closest('#start-button')) return;
    if (!event.target.closest('#start-menu')) closeStartMenu();
  });

  icons.addEventListener('dblclick', event => {
    const link = event.target.closest('.desktop-icon');
    if (!link) return;
    event.preventDefault();
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = null;
    clickTarget = null;
    openTarget(catalogItems.get(link.dataset.shortcutId));
  });

  desktopBack.addEventListener('click', goBackFolder);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeStartMenu();
      closeShortcutModal();
    }
    if (event.altKey && event.key === 'ArrowLeft' && currentFolderId) {
      event.preventDefault();
      goBackFolder();
    }
  });

  openButton?.addEventListener('click', () => openTarget(selectedItem));
  newWindowButton?.addEventListener('click', () => openTarget(selectedItem, true));
  closeButton?.addEventListener('click', closeShortcutModal);
  cancelButton?.addEventListener('click', closeShortcutModal);

  copyButton?.addEventListener('click', async () => {
    if (!selectedItem || selectedItem.type === 'folder') return;
    const value = safeHttpUrl(selectedItem.url);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copyButton.textContent = 'Copied';
      setTimeout(() => { copyButton.textContent = 'Copy Link'; }, 1000);
    } catch {}
  });

  start.addEventListener('click', event => {
    event.stopPropagation();
    if (menu.hidden) openStartMenu();
    else closeStartMenu();
  });

  if (clock) {
    const updateClock = () => {
      clock.textContent = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    };
    updateClock();
    setInterval(updateClock, 15000);
  }

  context?.addEventListener('contextmenu', event => event.preventDefault());

  loadCatalog();
})();
