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
  const folderIcon = `${iconBase}folder.png`;
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
      return url.pathname + url.search + url.hash;
    } catch { return ''; }
  }

  function localIcon(item) {
    if (item?.type === 'folder') return folderIcon;
    return localIcons[item?.id] ? `${iconBase}${localIcons[item.id]}` : '';
  }

  function faviconCandidates(item) {
    const local = localIcon(item);
    const saved = safeIconSource(item?.icon);
    const targetUrl = safeHttpUrl(item?.url);
    if (!targetUrl) return [...new Set([local, saved].filter(Boolean))];
    const target = new URL(targetUrl);
    const remote = [
      `${target.origin}/apple-touch-icon.png`,
      `${target.origin}/favicon.svg`,
      `${target.origin}/favicon.png`,
      `${target.origin}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(target.hostname)}&sz=128`
    ];
    return [...new Set([local, ...remote, saved].filter(Boolean))];
  }

  function iconMarkup(item, menuIcon = false) {
    if (item.type === 'folder') {
      return `<img class="${menuIcon ? 'menu-icon shortcut-menu-icon' : 'shortcut-icon'} favicon-image local-icon" src="${folderIcon}" alt="" loading="eager" decoding="async">`;
    }
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

  function shortcutMarkup(item, menuIcon = false) {
    if (!menuIcon) {
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
    quickLaunch.innerHTML = quickIds.map(resolveItem).filter(Boolean).map(item => {
      const href = safeHttpUrl(item.url);
      if (!href) return '';
      return `<a class="quick-button" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.title)}">${iconMarkup(item, true)}</a>`;
    }).join('');
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
    detailDescription.textContent = item.description || (isFolder ? 'Folder shortcut. This folder can contain links and other folders.' : 'Shortcut to a web application or page.');
    modal.hidden = false;
    openButton.disabled = false;
    openButton.textContent = isFolder ? 'Open Folder' : 'Open';
    newWindowButton.disabled = isFolder || !safeHttpUrl(item.url);
    copyButton.disabled = isFolder || !safeHttpUrl(item.url);
    openButton.focus();
  }

  function closeShortcutModal() {
    modal.hidden = true;
    selectedItem = null;
    icons.querySelectorAll('.desktop-icon.selected').forEach(node => node.classList.remove('selected'));
    openButton.disabled = false; openButton.textContent = 'Open';
    newWindowButton.disabled = false; copyButton.disabled = false;
  }

  function hideSubmenus() {
    menu.querySelectorAll('.submenu').forEach(panel => { panel.hidden = true; });
    menu.querySelectorAll('[data-menu-folder-toggle].active').forEach(button => button.classList.remove('active'));
    menu.querySelectorAll('.start-item.has-submenu.active').forEach(button => button.classList.remove('active'));
  }

  function showPanel(panel, trigger) {
    hideSubmenus();
    panel.hidden = false;
    if (trigger) trigger.classList.add('active');
    const menuRect = menu.getBoundingClientRect();
    if (panel.classList.contains('nested-submenu')) {
      const triggerRect = trigger.getBoundingClientRect();
      panel.style.top = `${Math.max(0, triggerRect.top - menuRect.top - 2)}px`;
    } else {
      const target = trigger || null;
      const top = target ? target.getBoundingClientRect().top - menuRect.top - 2 : 0;
      panel.style.top = `${Math.max(0, top)}px`;
    }
  }

  start.addEventListener('click', event => { event.stopPropagation(); closeContext(); setStart(menu.hidden); });

  menu.addEventListener('pointerover', event => {
    const trigger = event.target.closest('.start-item.has-submenu');
    if (!trigger || !menu.contains(trigger)) return;
    const panel = menu.querySelector(`[data-submenu-panel="${CSS.escape(trigger.dataset.menuTarget)}"]`);
    if (panel) showPanel(panel, trigger);
  });

  menu.addEventListener('click', event => {
    const top = event.target.closest('.start-item.has-submenu');
    if (top) {
      event.preventDefault();
      const panel = menu.querySelector(`[data-submenu-panel="${CSS.escape(top.dataset.menuTarget)}"]`);
      if (panel) {
        const nextOpen = panel.hidden;
        nextOpen ? showPanel(panel, top) : hideSubmenus();
      }
      return;
    }

    const folderToggle = event.target.closest('[data-menu-folder-toggle]');
    if (folderToggle) {
      event.preventDefault();
      const panel = menu.querySelector(`[data-menu-nested="${CSS.escape(folderToggle.dataset.menuFolderToggle)}"]`);
      if (!panel) return;
      const nextOpen = panel.hidden;
      if (nextOpen) {
        menu.querySelectorAll('.nested-submenu').forEach(node => { if (node !== panel) node.hidden = true; });
        menu.querySelectorAll('[data-menu-folder-toggle].active').forEach(node => { if (node !== folderToggle) node.classList.remove('active'); });
      }
      panel.hidden = !nextOpen;
      folderToggle.classList.toggle('active', nextOpen);
      if (nextOpen && window.matchMedia('(max-width:700px)').matches) panel.scrollIntoView({ block:'nearest' });
      return;
    }

    const link = event.target.closest('.submenu a[data-menu-shortcut-id]');
    if (link) setStart(false);
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
    const icon = event.target.closest('.desktop-icon');
    if (!icon) return;
    event.preventDefault();
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => selectDesktopShortcut(icon), DOUBLE_CLICK_DELAY);
  });

  icons.addEventListener('dblclick', event => {
    const icon = event.target.closest('.desktop-icon');
    if (!icon) return;
    event.preventDefault();
    clearTimeout(clickTimer);
    const item = catalogItems.get(icon.dataset.shortcutId);
    if (item) openTarget(item, false);
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
    if (action === 'refresh') window.location.reload();
    closeContext();
  });

  closeButton.addEventListener('click', closeShortcutModal);
  cancelButton.addEventListener('click', closeShortcutModal);
  openButton.addEventListener('click', () => openTarget(selectedItem, false));
  newWindowButton.addEventListener('click', () => openTarget(selectedItem, true));
  copyButton.addEventListener('click', async () => {
    const href = safeHttpUrl(selectedItem?.url);
    if (!href) return;
    try { await navigator.clipboard.writeText(href); copyButton.textContent = 'Copied'; }
    catch { copyButton.textContent = 'Copy failed'; }
    window.setTimeout(() => { copyButton.textContent = 'Copy Link'; }, 900);
  });

  function closeContext() { context.hidden = true; }
  function setStart(open) {
    menu.hidden = !open;
    start.classList.toggle('pressed', open);
    start.setAttribute('aria-expanded', String(open));
    if (!open) hideSubmenus();
  }

  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  }

  loadCatalog();
  updateClock();
  window.setInterval(updateClock, 1000);
})();
