(() => {
  'use strict';

  const modal = document.getElementById('shortcut-modal');
  const preview = document.getElementById('shortcut-preview');
  const name = document.getElementById('shortcut-name');
  const kind = document.getElementById('shortcut-kind');
  const detailName = document.getElementById('shortcut-detail-name');
  const detailTarget = document.getElementById('shortcut-target');
  const detailType = document.getElementById('shortcut-detail-type');
  const detailCategory = document.getElementById('shortcut-category');
  const description = document.getElementById('shortcut-description');
  const openButton = document.getElementById('shortcut-open');
  const newWindowButton = document.getElementById('shortcut-new-window');
  const copyButton = document.getElementById('shortcut-copy');
  const closeButton = document.getElementById('shortcut-close');
  const cancelButton = document.getElementById('shortcut-cancel');

  const items = new Map();
  const parents = new Map();

  const esc = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[char]));

  function itemPath(item) {
    const parts = [item.title];
    const seen = new Set();
    let parent = parents.get(item.id);
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const parentItem = items.get(parent);
      if (!parentItem) break;
      parts.unshift(parentItem.title);
      parent = parents.get(parentItem.id);
    }
    return ['Desktop', ...parts].join(' > ');
  }

  function showFolderProperties(button, item) {
    document.querySelectorAll('#desktop-icons .desktop-icon.selected').forEach(node => node.classList.remove('selected'));
    button.classList.add('selected');

    const childCount = Array.isArray(item.children) ? item.children.length : 0;
    name.textContent = item.title;
    kind.textContent = `Folder · ${childCount} item${childCount === 1 ? '' : 's'}`;
    detailName.textContent = item.title;
    detailTarget.textContent = itemPath(item);
    detailType.textContent = 'folder';
    detailCategory.textContent = item.category || '—';
    description.textContent = item.description || 'Folder shortcut. Double-click opens the folder.';

    preview.innerHTML = '';
    const source = button.querySelector('img, .folder-fallback, .icon-folder');
    if (source) preview.appendChild(source.cloneNode(true));

    openButton.disabled = false;
    openButton.textContent = 'Open Folder';
    newWindowButton.disabled = true;
    copyButton.disabled = true;
    copyButton.textContent = 'Copy Link';
    modal.hidden = false;
  }

  async function loadRelations() {
    try {
      const response = await fetch('data/links.json', { cache: 'no-store' });
      if (!response.ok) return;
      const catalog = await response.json();
      for (const item of Array.isArray(catalog.items) ? catalog.items : []) items.set(item.id, item);
      items.forEach(item => {
        if (!Array.isArray(item.children)) return;
        item.children.forEach(child => parents.set(child, item.id));
      });
    } catch {}
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#desktop-icons .desktop-icon.is-folder');
    if (!button) return;
    const item = items.get(button.dataset.shortcutId);
    if (!item || item.type !== 'folder') return;

    event.preventDefault();
    event.stopPropagation();
    showFolderProperties(button, item);
  }, true);

  closeButton?.addEventListener('click', () => { modal.hidden = true; });
  cancelButton?.addEventListener('click', () => { modal.hidden = true; });

  modal?.addEventListener('click', event => {
    if (event.target === modal) modal.hidden = true;
  });

  openButton?.addEventListener('click', () => {
    const selected = document.querySelector('#desktop-icons .desktop-icon.is-folder.selected');
    if (selected) selected.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) modal.hidden = true;
  });

  void loadRelations();
})();
