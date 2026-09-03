(() => {
  'use strict';

  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const desktopBack = document.getElementById('desktop-back');
  if (!desktop || !icons) return;

  const catalogUrl = 'data/links.json';
  let items = new Map();
  let parents = new Map();
  let roots = [];
  let currentFolderId = null;
  let expanded = new Set();
  let navigating = false;

  const esc = value => String(value ?? '').replace(/[&<>\"]/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;'
  }[char]));

  const folders = () => [...items.values()].filter(item => item?.type === 'folder');
  const childrenOf = id => {
    const item = items.get(id);
    return Array.isArray(item?.children) ? item.children.map(child => items.get(child)).filter(child => child?.type === 'folder') : [];
  };

  function pathIds(id) {
    const chain = [];
    const seen = new Set();
    let cursor = id;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      chain.unshift(cursor);
      cursor = parents.get(cursor) || null;
    }
    return chain;
  }

  function buildRelations(catalog) {
    items = new Map((Array.isArray(catalog.items) ? catalog.items : []).map(item => [item.id, item]));
    parents = new Map();
    items.forEach(item => {
      if (item?.type !== 'folder' || !Array.isArray(item.children)) return;
      item.children.forEach(child => {
        const childItem = items.get(child);
        if (childItem?.type === 'folder' && !parents.has(child)) parents.set(child, item.id);
      });
    });
    const desktopIds = Array.isArray(catalog.desktop) ? catalog.desktop : [];
    roots = desktopIds.map(id => items.get(id)).filter(item => item?.type === 'folder');
  }

  function createPane() {
    let pane = document.getElementById('hierarchy-tree');
    if (pane) return pane;
    pane = document.createElement('aside');
    pane.id = 'hierarchy-tree';
    pane.className = 'hierarchy-tree is-visible';
    pane.setAttribute('aria-label', 'Folder hierarchy');
    pane.innerHTML = `
      <div class="hierarchy-titlebar">
        <span class="hierarchy-title-icon" aria-hidden="true"></span>
        <strong>Hierarchy</strong>
      </div>
      <div class="hierarchy-body">
        <button class="tree-root" type="button" data-tree-root="1" aria-current="page">
          <span class="tree-expander tree-expander-empty" aria-hidden="true"></span>
          <span class="tree-small-icon tree-desktop-icon" aria-hidden="true"></span>
          <span class="tree-label">Desktop</span>
        </button>
        <div class="tree-root-children"></div>
      </div>`;
    desktop.appendChild(pane);
    pane.querySelector('[data-tree-root]')?.addEventListener('click', () => navigateToFolder(null));
    return pane;
  }

  function folderButton(item, depth) {
    const hasChildren = childrenOf(item.id).length > 0;
    const isOpen = expanded.has(item.id);
    const isCurrent = currentFolderId === item.id;
    const isInPath = currentFolderId ? pathIds(currentFolderId).includes(item.id) : false;
    return `
      <div class="tree-node ${isCurrent ? 'is-current' : ''} ${isInPath ? 'is-path' : ''}" data-tree-node="${esc(item.id)}" style="--tree-depth:${depth}">
        <button class="tree-row" type="button" data-tree-folder="${esc(item.id)}" aria-current="${isCurrent ? 'page' : 'false'}" aria-expanded="${hasChildren ? String(isOpen) : 'false'}">
          <span class="tree-expander ${hasChildren ? '' : 'tree-expander-empty'}" aria-hidden="true">${hasChildren ? (isOpen ? '−' : '+') : ''}</span>
          <span class="tree-small-icon tree-folder-icon" aria-hidden="true"></span>
          <span class="tree-label">${esc(item.title)}</span>
        </button>
        ${hasChildren ? `<div class="tree-children ${isOpen ? 'is-open' : ''}" data-tree-children="${esc(item.id)}">${childrenOf(item.id).map(child => folderButton(child, depth + 1)).join('')}</div>` : ''}
      </div>`;
  }

  function render() {
    const pane = createPane();
    const body = pane.querySelector('.tree-root-children');
    body.innerHTML = roots.map(item => folderButton(item, 0)).join('');
    pane.classList.add('is-visible');

    const root = pane.querySelector('[data-tree-root]');
    const atRoot = !currentFolderId;
    root?.classList.toggle('is-active', atRoot);
    root?.setAttribute('aria-current', atRoot ? 'page' : 'false');

    pane.querySelectorAll('[data-tree-folder]').forEach(button => {
      button.addEventListener('click', event => {
        const id = event.currentTarget.dataset.treeFolder;
        const hasChildren = childrenOf(id).length > 0;
        if (hasChildren) {
          expanded.has(id) ? expanded.delete(id) : expanded.add(id);
          const node = pane.querySelector(`[data-tree-node="${CSS.escape(id)}"]`);
          const children = node?.querySelector(':scope > [data-tree-children]');
          children?.classList.toggle('is-open', expanded.has(id));
          event.currentTarget.setAttribute('aria-expanded', String(expanded.has(id)));
        }
        if (currentFolderId !== id) navigateToFolder(id);
        event.stopPropagation();
      });
    });

    if (currentFolderId) {
      pathIds(currentFolderId).forEach(id => expanded.add(id));
      queueMicrotask(() => {
        pane.querySelector(`[data-tree-node="${CSS.escape(currentFolderId)}"]`)?.scrollIntoView({ block: 'nearest' });
      });
    }
  }

  function resetToRoot() {
    if (!currentFolderId) return Promise.resolve();
    return new Promise(resolve => {
      const back = desktopBack;
      let guard = 0;
      const tick = () => {
        const navigation = document.getElementById('desktop-navigation');
        if (!navigation || navigation.hidden || guard++ > 32) {
          resolve();
          return;
        }
        back?.click();
        setTimeout(tick, 60);
      };
      tick();
    });
  }

  function findDesktopFolder(id) {
    return [...icons.querySelectorAll('.desktop-icon.is-folder')].find(node => node.dataset.shortcutId === id) || null;
  }

  function openVisibleFolder(id) {
    const folder = findDesktopFolder(id);
    if (!folder) return false;
    folder.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    return true;
  }

  async function navigateToFolder(targetId) {
    if (navigating || targetId === currentFolderId) return;
    navigating = true;
    try {
      const chain = targetId ? pathIds(targetId) : [];
      await resetToRoot();
      for (const id of chain) {
        if (!openVisibleFolder(id)) break;
        await new Promise(resolve => setTimeout(resolve, 110));
      }
      currentFolderId = targetId;
      expanded = new Set(chain);
      render();
    } finally {
      navigating = false;
    }
  }

  function syncFromDesktop() {
    const navigation = document.getElementById('desktop-navigation');
    const path = document.getElementById('desktop-path');
    if (!navigation || navigation.hidden) currentFolderId = null;
    else {
      const title = (path?.textContent || '').split(' > ').at(-1);
      currentFolderId = folders().find(item => item.title === title)?.id || currentFolderId;
    }
    render();
  }

  async function load() {
    try {
      const response = await fetch(catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      buildRelations(await response.json());
      createPane();
      syncFromDesktop();
      const observer = new MutationObserver(() => window.requestAnimationFrame(syncFromDesktop));
      observer.observe(icons, { childList: true });
    } catch (error) {
      console.warn('Hierarchy tree unavailable:', error);
    }
  }

  void load();
})();
