(() => {
  'use strict';

  const icons = document.getElementById('desktop-icons');
  if (!icons) return;

  const catalogUrl = 'data/links.json';
  let items = new Map();
  let parents = new Map();

  const esc = value => String(value ?? '').replace(/[&<>\"]/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;'
  }[char]));

  function normalizeHost(hostname) {
    return String(hostname || '').replace(/^www\./i, '');
  }

  function machineUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value));
      if (!/^https?:$/i.test(url.protocol)) return '';
      const path = `${url.pathname || '/'}${url.search || ''}${url.hash || ''}`;
      const compact = `${normalizeHost(url.hostname)}${path === '/' ? '' : path}`;
      return compact.length > 42 ? `${compact.slice(0, 39)}…` : compact;
    } catch {
      return '';
    }
  }

  function shortTags(item) {
    const values = [];
    const explicit = Array.isArray(item?.tags) ? item.tags : [];
    explicit.forEach(tag => values.push(String(tag).trim()));
    if (item?.category) values.push(String(item.category).trim());
    const parent = item?.parent ? items.get(item.parent) : null;
    if (parent?.title) values.push(String(parent.title).trim());

    const target = String(item?.url || '');
    if (/^https?:\/\//i.test(target)) values.push('Web');

    return [...new Set(values.filter(Boolean))].slice(0, 3);
  }

  function parentTitle(item) {
    const parent = parents.get(item.id);
    return parent ? items.get(parent)?.title || '' : '';
  }

  function decorate() {
    icons.querySelectorAll('.desktop-icon:not(.is-folder)').forEach(link => {
      if (link.dataset.desktopMetaBound === '1') return;
      const item = items.get(link.dataset.shortcutId);
      if (!item || item.type === 'folder') return;

      const href = item.url || '';
      const url = machineUrl(href);
      const parent = parentTitle(item);
      const tags = shortTags(item);

      link.classList.add('is-app');
      link.dataset.desktopMetaBound = '1';
      link.title = href || item.title;

      const meta = document.createElement('span');
      meta.className = 'desktop-link-meta';
      meta.setAttribute('aria-label', [parent, url, ...tags].filter(Boolean).join(', '));

      if (url) {
        const urlNode = document.createElement('span');
        urlNode.className = 'desktop-machine-url';
        urlNode.textContent = url;
        urlNode.title = href;
        meta.appendChild(urlNode);
      }

      if (tags.length) {
        const tagsNode = document.createElement('span');
        tagsNode.className = 'desktop-tags';
        tagsNode.innerHTML = tags.map(tag => `<span class="desktop-tag">${esc(tag)}</span>`).join('');
        meta.appendChild(tagsNode);
      }

      link.appendChild(meta);
    });
  }

  function buildRelations(catalog) {
    const source = Array.isArray(catalog.items) ? catalog.items : [];
    items = new Map(source.map(item => [item.id, item]));
    parents = new Map();
    source.forEach(item => {
      if (!item?.id || !item?.parent) return;
      parents.set(item.id, item.parent);
    });
  }

  async function load() {
    try {
      const response = await fetch(catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      buildRelations(await response.json());
      decorate();
      const observer = new MutationObserver(() => window.requestAnimationFrame(decorate));
      observer.observe(icons, { childList: true, subtree: true });
    } catch (error) {
      console.warn('Desktop metadata unavailable:', error);
    }
  }

  void load();
})();
