(() => {
  'use strict';

  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const layer = document.getElementById('windows-layer');
  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const taskButtons = document.getElementById('task-buttons');
  const clock = document.getElementById('clock');
  const context = document.getElementById('context-menu');
  const shutdownOverlay = document.getElementById('shutdown-overlay');
  const z = { value: 50 };
  const windows = new Map();
  let drag = null;

  const apps = {
    computer: {
      title: 'My Computer', icon: 'computer-mini', size: [560, 360],
      body: '<div class="explorer-toolbar"><button class="win-button">Back</button><button class="win-button">Forward</button><button class="win-button">Up</button></div><div class="addressbar"><strong>Address</strong><input value="My Computer" readonly></div><div class="file-view"><div class="file-item"><span class="icon-art icon-folder"></span><span>Windows (C:)</span></div><div class="file-item"><span class="icon-art icon-folder"></span><span>Data (D:)</span></div><div class="file-item"><span class="icon-art icon-network"></span><span>Network Neighborhood</span></div><div class="file-item"><span class="icon-art icon-trash"></span><span>Recycle Bin</span></div></div>'
    },
    documents: {
      title: 'My Documents', icon: 'folder-mini', size: [520, 330],
      body: '<div class="explorer-toolbar"><button class="win-button">Back</button><button class="win-button">Up</button></div><div class="addressbar"><strong>Address</strong><input value="C:\\My Documents" readonly></div><div class="file-view"><div class="file-item"><span class="icon-art icon-notepad"></span><span>README.TXT</span></div><div class="file-item"><span class="icon-art icon-notepad"></span><span>NOTES.TXT</span></div><div class="file-item"><span class="icon-art icon-folder"></span><span>Projects</span></div></div>'
    },
    network: {
      title: 'Network Neighborhood', icon: 'network-mini', size: [520, 330],
      body: '<div class="addressbar"><strong>Address</strong><input value="Network Neighborhood" readonly></div><div class="file-view"><div class="file-item"><span class="icon-art icon-computer"></span><span>OK-PC</span></div><div class="file-item"><span class="icon-art icon-computer"></span><span>SERVER</span></div><div class="file-item"><span class="icon-art icon-network"></span><span>Workgroup</span></div></div>'
    },
    recycle: {
      title: 'Recycle Bin', icon: 'trash-mini', size: [470, 290],
      body: '<div class="addressbar"><strong>Recycle Bin</strong></div><div class="file-view"><div class="about-copy"><strong>Recycle Bin is empty.</strong><p>Objects you delete from the desktop appear here until permanently removed.</p></div></div>'
    },
    about: {
      title: 'Okenice26', icon: 'notepad-mini', size: [500, 330],
      body: '<div class="about-copy"><h2>Okenice26</h2><p>Webový desktop inspirovaný Windows 95/98.</p><p>Rozhraní obsahuje desktopové ikony, Start menu, taskbar, okna, minimalizaci, maximalizaci, focus a kontextové menu.</p><hr><p><strong>System:</strong> Windows 98-compatible web shell</p><p><strong>Mode:</strong> Standalone Desktop</p></div>'
    },
    notepad: {
      title: 'Notepad', icon: 'notepad-mini', size: [560, 370],
      body: '<textarea class="notepad" spellcheck="false">Okenice26

Windows 95/98 desktop simulation.

Type here...</textarea>'
    },
    internet: {
      title: 'Internet Explorer', icon: 'ie-mini', size: [620, 420],
      body: '<div class="explorer-toolbar"><button class="win-button">Back</button><button class="win-button">Forward</button><button class="win-button">Home</button></div><div class="addressbar"><strong>Address</strong><input value="http://okenice26/" readonly></div><div class="ie-page"><div class="ie-logo">e</div><h2>Internet Explorer</h2><p>This page is part of the Okenice26 desktop simulation.</p><p>You can open windows, drag them around, minimize and maximize them just like a classic desktop shell.</p></div>'
    }
  };

  function setStart(open) {
    menu.hidden = !open;
    start.classList.toggle('pressed', open);
    start.setAttribute('aria-expanded', String(open));
  }

  start.addEventListener('click', (e) => { e.stopPropagation(); setStart(menu.hidden); closeContext(); });

  menu.addEventListener('click', (e) => {
    const appButton = e.target.closest('[data-app]');
    if (appButton) { openApp(appButton.dataset.app); setStart(false); return; }
    const action = e.target.closest('[data-menu-action]')?.dataset.menuAction;
    if (action === 'shutdown') shutdownOverlay.hidden = false;
    if (action === 'run') openApp('internet');
    setStart(false);
  });

  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== start) setStart(false);
    if (!context.hidden && !context.contains(e.target)) closeContext();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setStart(false); closeContext(); shutdownOverlay.hidden = true; }
  });

  icons.addEventListener('click', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    icons.querySelectorAll('.desktop-icon.selected').forEach((el) => el.classList.remove('selected'));
    icon.classList.add('selected');
  });

  icons.addEventListener('dblclick', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (icon) openApp(icon.dataset.app);
  });

  desktop.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.app-window,.desktop-icon')) return;
    e.preventDefault();
    context.hidden = false;
    context.style.left = `${Math.min(e.clientX, window.innerWidth - 205)}px`;
    context.style.top = `${Math.min(e.clientY, window.innerHeight - 160)}px`;
  });

  context.addEventListener('click', (e) => {
    const action = e.target.closest('[data-menu-action]')?.dataset.menuAction;
    if (action === 'arrange') arrangeIcons();
    if (action === 'refresh') window.location.reload();
    if (action === 'new') openApp('notepad');
    if (action === 'properties') openApp('about');
    closeContext();
  });

  function closeContext() { context.hidden = true; }

  function arrangeIcons() {
    icons.style.left = '8px';
    icons.style.top = '8px';
  }

  function openApp(id) {
    const spec = apps[id];
    if (!spec) return;
    const existing = windows.get(id);
    if (existing) { if (existing.el.classList.contains('minimized')) restoreWindow(existing); else focusWindow(existing); return; }

    const el = document.createElement('section');
    el.className = 'app-window active';
    el.dataset.app = id;
    el.style.width = `${spec.size[0]}px`;
    el.style.height = `${spec.size[1]}px`;
    const offset = 35 + windows.size * 24;
    el.style.left = `${Math.min(offset, Math.max(8, window.innerWidth - spec.size[0] - 12))}px`;
    el.style.top = `${Math.min(offset, Math.max(8, window.innerHeight - 100 - spec.size[1]))}px`;
    el.innerHTML = `<div class="titlebar"><span class="title-icon ${spec.icon}"></span><span class="title-text">${spec.title}</span><div class="window-controls"><button class="window-control" data-win="min" title="Minimize">_</button><button class="window-control" data-win="max" title="Maximize">□</button><button class="window-control" data-win="close" title="Close">×</button></div></div><div class="window-content">${spec.body}</div><div class="window-status"><span class="status-panel">${spec.title}</span><span class="status-grip"></span></div>`;
    layer.appendChild(el);

    const task = document.createElement('button');
    task.type = 'button'; task.className = 'task-button';
    task.dataset.app = id; task.innerHTML = `<span class="${spec.icon}"></span><span>${spec.title}</span>`;
    taskButtons.appendChild(task);

    const record = { el, task, id, minimized: false };
    windows.set(id, record);
    bindWindow(record);
    focusWindow(record);
  }

  function bindWindow(record) {
    const { el, task } = record;
    el.addEventListener('mousedown', () => focusWindow(record));
    el.querySelector('[data-win="close"]').addEventListener('click', () => closeWindow(record));
    el.querySelector('[data-win="min"]').addEventListener('click', () => minimizeWindow(record));
    el.querySelector('[data-win="max"]').addEventListener('click', () => toggleMaximize(record));
    task.addEventListener('click', () => {
      if (record.minimized) restoreWindow(record);
      else if (el.classList.contains('active')) minimizeWindow(record);
      else focusWindow(record);
    });
    el.querySelector('.titlebar').addEventListener('mousedown', (e) => startDrag(e, record));
  }

  function focusWindow(record) {
    windows.forEach((w) => w.el.classList.remove('active'));
    record.el.classList.add('active');
    record.el.style.zIndex = String(++z.value);
    record.task.classList.add('active');
    windows.forEach((w) => { if (w !== record) w.task.classList.remove('active'); });
  }

  function minimizeWindow(record) {
    record.el.classList.add('minimized');
    record.el.style.display = 'none';
    record.minimized = true;
    record.task.classList.remove('active');
  }

  function restoreWindow(record) {
    record.el.classList.remove('minimized');
    record.el.style.display = 'flex';
    record.minimized = false;
    focusWindow(record);
  }

  function toggleMaximize(record) {
    record.el.classList.toggle('maximized');
    focusWindow(record);
  }

  function closeWindow(record) {
    record.el.remove(); record.task.remove(); windows.delete(record.id);
  }

  function startDrag(e, record) {
    if (e.button !== 0 || record.el.classList.contains('maximized') || e.target.closest('.window-control')) return;
    const rect = record.el.getBoundingClientRect();
    drag = { record, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', stopDrag, { once: true });
    e.preventDefault();
  }

  function moveDrag(e) {
    if (!drag) return;
    const w = drag.record.el;
    const maxX = Math.max(0, window.innerWidth - w.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - 28 - w.offsetHeight);
    w.style.left = `${Math.min(maxX, Math.max(0, e.clientX - drag.dx))}px`;
    w.style.top = `${Math.min(maxY, Math.max(0, e.clientY - drag.dy))}px`;
  }

  function stopDrag() { drag = null; document.removeEventListener('mousemove', moveDrag); }

  document.querySelectorAll('[data-app]').forEach((node) => {
    if (node.closest('.desktop-icon,.quick-button,.start-column')) {
      node.addEventListener('dblclick', () => openApp(node.dataset.app));
      node.addEventListener('click', () => { if (node.classList.contains('quick-button')) openApp(node.dataset.app); });
    }
  });

  document.getElementById('shutdown-cancel').addEventListener('click', () => { shutdownOverlay.hidden = true; });
  document.getElementById('shutdown-ok').addEventListener('click', () => {
    shutdownOverlay.hidden = true;
    layer.innerHTML = '<div class="shutdown-screen">It is now safe to turn off your computer.</div>';
    windows.clear(); taskButtons.innerHTML = '';
  });

  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }
  updateClock();
  window.setInterval(updateClock, 1000);
})();
