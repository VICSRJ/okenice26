(() => {
  const $ = s => document.querySelector(s);
  const tbody = $('#links'), search = $('#search'), categories = $('#categories'), empty = $('#empty');
  const dialog = $('#link-dialog'), form = $('#link-form');
  let db = { links: [] }, filter = 'Vše';

  async function load() {
    try { db = await (await fetch('data/links.json', { cache: 'no-store' })).json(); }
    catch { db = { links: JSON.parse(localStorage.getItem('okenice26.links') || '[]') }; }
    const local = JSON.parse(localStorage.getItem('okenice26.links') || '[]');
    db.links = [...db.links, ...local.filter(x => !db.links.some(y => y.id === x.id))];
    renderCategories(); render();
  }

  function renderCategories() {
    const cats = ['Vše', ...new Set(db.links.map(x => x.category).filter(Boolean))];
    categories.innerHTML = cats.map(c => `<button class="tab ${c === filter ? 'is-active' : ''}" data-category="${esc(c)}" type="button">${esc(c)}</button>`).join('');
    categories.querySelectorAll('.tab').forEach(b => b.onclick = () => { filter = b.dataset.category; renderCategories(); render(); });
  }

  function render() {
    const q = (search?.value || '').toLowerCase().trim();
    const rows = db.links.filter(x => (filter === 'Vše' || x.category === filter) && (!q || [x.title,x.url,x.category,x.description,...(x.tags || [])].join(' ').toLowerCase().includes(q)));
    tbody.innerHTML = rows.map(x => `<tr><td><strong>${esc(x.title)}</strong><small>${esc(x.description || '')}</small></td><td>${esc(x.category || '')}</td><td><a href="${safeUrl(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a></td><td>${(x.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</td><td><button class="open-link" data-url="${esc(x.url)}">Otevřít</button></td></tr>`).join('');
    empty.hidden = rows.length !== 0;
    $('#count').textContent = db.links.length;
    $('#category-count').textContent = new Set(db.links.map(x => x.category)).size;
    tbody.querySelectorAll('.open-link').forEach(b => b.onclick = () => window.open(b.dataset.url, '_blank', 'noopener,noreferrer'));
  }

  $('#add-link')?.addEventListener('click', () => { form.reset(); dialog.showModal(); $('#f-title').focus(); });
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const item = { id: 'local-' + Date.now(), title: $('#f-title').value.trim(), url: $('#f-url').value.trim(), category: $('#f-category').value.trim(), tags: $('#f-tags').value.split(',').map(x => x.trim()).filter(Boolean), description: $('#f-description').value.trim() };
    const local = JSON.parse(localStorage.getItem('okenice26.links') || '[]'); local.push(item); localStorage.setItem('okenice26.links', JSON.stringify(local));
    db.links.push(item); renderCategories(); render(); dialog.close();
  });
  $('#reset')?.addEventListener('click', () => { search.value = ''; filter = 'Vše'; renderCategories(); render(); search.focus(); });
  $('#export')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, updated: new Date().toISOString().slice(0,10), links: db.links }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'links.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  search?.addEventListener('input', render);
  $('#start-button')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  function clock() { $('#clock').textContent = new Date().toLocaleTimeString('cs-CZ', {hour:'2-digit',minute:'2-digit'}); } clock(); setInterval(clock, 1000);
  function esc(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function safeUrl(v) { try { const u = new URL(v); return ['http:','https:'].includes(u.protocol) ? u.href : '#'; } catch { return '#'; } }
  load();
})();
