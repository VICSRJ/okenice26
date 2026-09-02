(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'okenice26.links';

  const tbody = $('#links');
  const search = $('#search');
  const categories = $('#categories');
  const empty = $('#empty');
  const dialog = $('#link-dialog');
  const form = $('#link-form');
  const navItems = $$('.nav-item');

  let db = { version: 1, links: [] };
  let filter = 'Vše';

  function readLocalLinks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(isValidLink) : [];
    } catch {
      return [];
    }
  }

  function isValidLink(item) {
    return item && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string';
  }

  async function load() {
    let remote = { version: 1, links: [] };
    try {
      const response = await fetch('data/links.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = await response.json();
      remote = { ...parsed, links: Array.isArray(parsed.links) ? parsed.links.filter(isValidLink) : [] };
      setStatus('ONLINE / JSON');
    } catch {
      setStatus('LOCAL / FALLBACK');
    }

    const local = readLocalLinks();
    const remoteIds = new Set(remote.links.map(item => item.id));
    db = { ...remote, links: [...remote.links, ...local.filter(item => !remoteIds.has(item.id))] };

    renderCategories();
    render();
    updateActiveNav();
  }

  function setStatus(text) {
    const status = $('.system-pill');
    if (status) status.setAttribute('aria-label', text);
    const label = $('.system-pill span');
    if (label) label.textContent = text;
  }

  function renderCategories() {
    const cats = ['Vše', ...new Set(db.links.map(item => item.category).filter(Boolean))];
    if (!cats.includes(filter)) filter = 'Vše';

    categories.innerHTML = cats.map(category => `
      <button class="tab ${category === filter ? 'is-active' : ''}" data-category="${esc(category)}" type="button" role="tab" aria-selected="${category === filter}">
        ${esc(category)}
      </button>
    `).join('');

    $$('.tab', categories).forEach(button => {
      button.addEventListener('click', () => {
        filter = button.dataset.category || 'Vše';
        renderCategories();
        render();
      });
    });
  }

  function render() {
    const query = (search?.value || '').toLowerCase().trim();
    const rows = db.links.filter(item => {
      const matchesCategory = filter === 'Vše' || item.category === filter;
      const haystack = [item.title, item.url, item.category, item.description, ...(Array.isArray(item.tags) ? item.tags : [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });

    tbody.innerHTML = rows.map(item => {
      const url = safeUrl(item.url);
      const tags = Array.isArray(item.tags) ? item.tags : [];
      return `
        <tr>
          <td><strong>${esc(item.title)}</strong>${item.description ? `<small>${esc(item.description)}</small>` : ''}</td>
          <td>${esc(item.category || '')}</td>
          <td><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(item.url)}</a></td>
          <td>${tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join(' ')}</td>
          <td><button class="open-link" data-url="${esc(url)}" type="button">Otevřít</button></td>
        </tr>`;
    }).join('');

    empty.hidden = rows.length !== 0;
    const count = $('#count');
    const categoryCount = $('#category-count');
    if (count) count.textContent = db.links.length;
    if (categoryCount) categoryCount.textContent = new Set(db.links.map(item => item.category).filter(Boolean)).size;
  }

  tbody?.addEventListener('click', event => {
    const button = event.target.closest('.open-link');
    if (!button) return;
    const url = safeUrl(button.dataset.url || '');
    if (url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
  });

  $('#add-link')?.addEventListener('click', () => {
    form?.reset();
    dialog?.showModal();
    $('#f-title')?.focus();
  });

  form?.addEventListener('submit', event => {
    event.preventDefault();

    const url = safeUrl($('#f-url')?.value.trim() || '');
    if (url === '#') {
      $('#f-url')?.focus();
      return;
    }

    const item = {
      id: `local-${Date.now()}`,
      title: $('#f-title').value.trim(),
      url,
      category: $('#f-category').value.trim(),
      tags: $('#f-tags').value.split(',').map(value => value.trim()).filter(Boolean),
      description: $('#f-description').value.trim()
    };

    const local = readLocalLinks().filter(existing => existing.id !== item.id);
    local.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));

    db.links = [...db.links.filter(existing => existing.id !== item.id), item];
    renderCategories();
    render();
    dialog?.close();
  });

  $('#reset')?.addEventListener('click', () => {
    if (search) search.value = '';
    filter = 'Vše';
    renderCategories();
    render();
    search?.focus();
  });

  $('#export')?.addEventListener('click', () => {
    const payload = {
      version: db.version || 1,
      updated: new Date().toISOString().slice(0, 10),
      links: db.links
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'links.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  search?.addEventListener('input', render);

  navItems.forEach(item => item.addEventListener('click', () => {
    navItems.forEach(nav => nav.classList.toggle('is-active', nav === item));
  }));

  const sections = ['home', 'database', 'about'].map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navItems.forEach(item => item.classList.toggle('is-active', item.getAttribute('href') === `#${visible.target.id}`));
    }, { rootMargin: '-20% 0px -60% 0px', threshold: [0.1, 0.35, 0.6] });
    sections.forEach(section => observer.observe(section));
  }

  $('#start-button')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  function clock() {
    const target = $('#clock');
    if (target) target.textContent = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }
  clock();
  setInterval(clock, 1000);

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search?.focus();
      search?.select();
      document.getElementById('database')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (event.key === 'Escape' && dialog?.open) dialog.close();
  });

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch {
      return '#';
    }
  }

  load();
})();
