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

  function machineUrl(value) {
    try {
      const url = new URL(String(value || ''));
      if (!/^https?:$/i.test(url.protocol)) return '';
      const host = url.hostname.replace(/^www\./i, '');
      const path = `${url.pathname || '/'}${url.search || ''}${url.hash || ''}`;
      const value = `${host}${path === '/' ? '' : path}`;
      return value.length > 54 ? `${value.slice(0, 51)}…` : value;
    } catch { return ''; }
  }

  function shortTags(item) {
    const values = [];
    if (Array.isArray(item?.tags)) values.push(...item.tags);
    if (item?.category) values.push(item.category);
    const parent = item?.parent ? items.get(item.parent) : null;
    if (parent?.title) values.push(parent.title);
    if (item?.url) values.push('Web');
    return [...new Set(values.map(value => String(value).trim()).filter(Boolean))].slice(0, 3);
  }

  function decorateLink(link, item) {
    if (!item || item.type === 'folder' || link.dataset.desktopMetaBound === '1') return;

    const url = machineUrl(item.url);
    const tags = shortTags(item);
    link.classList.add('is-app');
    link.dataset.desktopMetaBound = '1';
    link.title = item.url || item.title;

    const meta = document.createElement('span');
    meta.className = 'desktop-link-meta';
    meta.setAttribute('aria-hidden', 'true');

    if (url) {
      const urlNode = document.createElement('span');
      urlNode.className = 'desktop-machine-url';
      urlNode.textContent = url;
      urlNode.title = item.url || url;
      meta.appendChild(urlNode);
    }

    if (tags.length) {
      const tagsNode = document.createElement('span');
      tagsNode.className = 'desktop-tags';
      tagsNode.innerHTML = tags.map(tag => `<span class="desktop-tag">${esc(tag)}</span>`).join('');
      meta.appendChild(tagsNode);
    }

    link.appendChild(meta);
  }

  function decorate() {
    icons.querySelectorAll('.desktop-icon[data-shortcut-id]').forEach(link => {
      decorateLink(link, items.get(link.dataset.shortcutId));
    });
  }

  async function load() {
    try {
      const response = await fetch(catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      const catalog = await response.json();
      const source = Array.isArray(catalog.items) ? catalog.items : [];
      items = new Map(source.map(item => [item.id, item]));
      parents = new Map(source.filter(item => item?.id && item?.parent).map(item => [item.id, item.parent]));

      decorate();
      window.addEventListener('okenice:desktop-rendered', decorate);
      const observer = new MutationObserver(() => window.requestAnimationFrame(decorate));
      observer.observe(icons, { childList: true, subtree: true });
    } catch (error) {
      console.warn('Desktop metadata unavailable:', error);
    }
  }

  void load();
})();
