import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const exists = relative => fs.existsSync(path.join(root, relative));
const fail = message => errors.push(message);

function readJson(relative) {
  const file = path.join(root, relative);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${relative}: invalid JSON (${error.message})`);
    return null;
  }
}

const jsonFiles = [];
function collectJson(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJson(relative);
    else if (entry.isFile() && entry.name.endsWith('.json')) jsonFiles.push(relative);
  }
}
collectJson('data');
for (const file of jsonFiles) readJson(file);

const catalog = readJson('data/links.json');
if (catalog) {
  const items = Array.isArray(catalog.items) ? catalog.items : [];
  const ids = new Set();
  const itemById = new Map();
  const parentRefs = new Map();
  const childOwners = new Map();

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      fail('data/links.json: catalog contains a non-object item');
      continue;
    }
    if (!item.id || ids.has(item.id)) fail(`data/links.json: duplicate or missing item id: ${item.id || '<empty>'}`);
    ids.add(item.id);
    itemById.set(item.id, item);
    if (!item.title) fail(`data/links.json: missing title for ${item.id || '<empty>'}`);
    if (!['folder', 'app'].includes(item.type)) fail(`data/links.json: invalid type on ${item.id}: ${item.type}`);
    if (item.type === 'folder' && !Array.isArray(item.children)) fail(`data/links.json: folder ${item.id} must have children[]`);
    if (item.type === 'app' && !/^https?:\/\//i.test(item.url || '')) fail(`data/links.json: app ${item.id} must have an http(s) URL`);
    if (item.type === 'app' && !item.parent) fail(`data/links.json: app ${item.id} must belong to a folder via parent`);
    if (item.parent) parentRefs.set(item.id, item.parent);
  }

  for (const item of items) {
    if (Array.isArray(item.children)) {
      for (const childId of item.children) {
        if (!ids.has(childId)) {
          fail(`data/links.json: ${item.id} references missing child ${childId}`);
          continue;
        }
        const child = itemById.get(childId);
        if (child?.parent && child.parent !== item.id) fail(`data/links.json: ${childId}.parent=${child.parent} conflicts with ${item.id}.children[]`);
        if (childOwners.has(childId) && childOwners.get(childId) !== item.id) fail(`data/links.json: ${childId} is owned by multiple folders`);
        childOwners.set(childId, item.id);
      }
    }
    if (item.parent && !ids.has(item.parent)) fail(`data/links.json: ${item.id} references missing parent ${item.parent}`);
    if (item.parent && itemById.get(item.parent)?.type !== 'folder') fail(`data/links.json: ${item.id}.parent must reference a folder`);
  }

  const desktop = Array.isArray(catalog.desktop) ? catalog.desktop : [];
  if (!Array.isArray(catalog.desktop)) fail('data/links.json: desktop must be an array');
  const rootSeen = new Set();
  for (const id of desktop) {
    if (!ids.has(id)) fail(`data/links.json: desktop references missing item ${id}`);
    else if (itemById.get(id)?.type !== 'folder') fail(`data/links.json: desktop root may contain folders only; ${id} is ${itemById.get(id)?.type}`);
    if (rootSeen.has(id)) fail(`data/links.json: duplicate desktop root item ${id}`);
    rootSeen.add(id);
  }

  for (const item of items) {
    if (item.type === 'app' && item.parent && childOwners.get(item.id) !== item.parent) fail(`data/links.json: app ${item.id} parent/children relationship is incomplete`);
    if (item.type === 'folder' && item.parent && childOwners.get(item.id) !== item.parent) fail(`data/links.json: folder ${item.id} parent/children relationship is incomplete`);
  }

  if (!Array.isArray(catalog.quickLaunch)) fail('data/links.json: quickLaunch must be an array');
  else for (const id of catalog.quickLaunch) {
    if (!ids.has(id)) fail(`data/links.json: quickLaunch references missing item ${id}`);
    else if (itemById.get(id)?.type !== 'app') fail(`data/links.json: quickLaunch may contain app links only; ${id} is ${itemById.get(id)?.type}`);
  }

  for (const [menuId, menuItems] of Object.entries(catalog.menus || {})) {
    if (!Array.isArray(menuItems)) fail(`data/links.json: menu ${menuId} must be an array`);
    for (const id of menuItems || []) if (!ids.has(id)) fail(`data/links.json: menu ${menuId} references missing item ${id}`);
  }

  for (const item of items) {
    let cursor = item.id;
    const seen = new Set();
    while (cursor) {
      if (seen.has(cursor)) {
        fail(`data/links.json: hierarchy cycle detected at ${item.id}`);
        break;
      }
      seen.add(cursor);
      cursor = parentRefs.get(cursor);
    }
  }
}

const html = exists('index.html') ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '';
if (!html) fail('index.html: missing');

const localRefs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(match => match[1]);
for (const ref of localRefs) {
  if (/^(?:https?:|data:|mailto:|javascript:|#|\/)/i.test(ref)) continue;
  const clean = ref.split(/[?#]/, 1)[0];
  if (clean && !exists(clean)) fail(`index.html: missing local asset ${clean}`);
}
if (/\b(?:src|href)=["']file:/i.test(html)) fail('index.html: file: URL remains in markup');

const requiredFiles = [
  'app.js', 'runtime-guard.js', 'hierarchy-tree.js', 'enhancements.css', 'desktop-metadata.js', 'desktop-metadata.css',
  'styles.css', 'top-taskbar.css', 'shortcut-template.css', 'menu.css', 'data/links.json'
];
for (const file of requiredFiles) if (!exists(file)) fail(`missing required file: ${file}`);

const tree = [];
function collectFiles(dir = '.') {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(relative);
    else tree.push(relative.replaceAll(path.sep, '/'));
  }
}
collectFiles();
for (const file of tree.filter(file => file.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (/data\/icons\/png|icons\/png/i.test(text)) fail(`${file}: stale local PNG icon reference remains`);
}

const hierarchy = exists('hierarchy-tree.js') ? fs.readFileSync(path.join(root, 'hierarchy-tree.js'), 'utf8') : '';
if (hierarchy && !/data\/links\.json/.test(hierarchy)) fail('hierarchy-tree.js: catalog source missing');
if (hierarchy && !/hierarchy-tree/.test(hierarchy)) fail('hierarchy-tree.js: tree root missing');
if (hierarchy && !/is-current/.test(hierarchy)) fail('hierarchy-tree.js: current hierarchy state missing');
if (hierarchy && !/navigateToFolder/.test(hierarchy)) fail('hierarchy-tree.js: tree navigation missing');
if (hierarchy && !/ArrowRight/.test(hierarchy) || hierarchy && !/ArrowLeft/.test(hierarchy) || hierarchy && !/ArrowDown/.test(hierarchy) || hierarchy && !/ArrowUp/.test(hierarchy)) fail('hierarchy-tree.js: keyboard navigation missing');

const enhancements = exists('enhancements.css') ? fs.readFileSync(path.join(root, 'enhancements.css'), 'utf8') : '';
if (enhancements && !/prefers-reduced-motion/.test(enhancements)) fail('enhancements.css: reduced-motion fallback missing');
if (enhancements && !/\.hierarchy-tree/.test(enhancements)) fail('enhancements.css: hierarchy styles missing');
if (enhancements && !/startMenuIn/.test(enhancements)) fail('enhancements.css: Start menu animation missing');
if (enhancements && !/shortcut-modal/.test(enhancements)) fail('enhancements.css: modal polish missing');

const metadata = exists('desktop-metadata.js') ? fs.readFileSync(path.join(root, 'desktop-metadata.js'), 'utf8') : '';
if (metadata && !/okenice:desktop-rendered/.test(metadata)) fail('desktop-metadata.js: render synchronization hook missing');
if (metadata && !/desktop-machine-url/.test(metadata)) fail('desktop-metadata.js: machine URL rendering missing');
if (metadata && !/desktop-tag/.test(metadata)) fail('desktop-metadata.js: tag rendering missing');

const folderCdn = 'https://cdn.jsdelivr.net/gh/ryokun6/ryos@main/public/resources/windows-icon-catalogs/win98/folders/directory-closed.png';
const folderRaw = 'https://raw.githubusercontent.com/ryokun6/ryos/main/public/resources/windows-icon-catalogs/win98/folders/directory-closed.png';
for (const url of [folderCdn, folderRaw]) {
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    if (!response.ok) fail(`remote folder icon unavailable: ${url} (${response.status})`);
  } catch (error) {
    fail(`remote folder icon check failed: ${url} (${error.message})`);
  }
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validation passed: ${jsonFiles.length} JSON file(s), ${tree.length} repository file(s), catalog ownership, hierarchy, keyboard navigation, icon mirrors and UI contracts checked.`);
