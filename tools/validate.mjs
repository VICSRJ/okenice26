import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
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
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      fail('data/links.json: catalog contains a non-object item');
      continue;
    }
    if (!item.id || ids.has(item.id)) fail(`data/links.json: duplicate or missing item id: ${item.id || '<empty>'}`);
    ids.add(item.id);
    if (!item.title) fail(`data/links.json: missing title for ${item.id || '<empty>'}`);
    if (item.type === 'folder' && !Array.isArray(item.children)) fail(`data/links.json: folder ${item.id} must have children[]`);
    if (item.type !== 'folder' && item.url && !/^https?:\/\//i.test(item.url)) fail(`data/links.json: invalid URL on ${item.id}: ${item.url}`);
  }

  for (const item of items) {
    if (Array.isArray(item.children)) {
      for (const childId of item.children) {
        if (!ids.has(childId)) fail(`data/links.json: ${item.id} references missing child ${childId}`);
        else {
          const child = items.find(candidate => candidate.id === childId);
          if (child?.parent && child.parent !== item.id) fail(`data/links.json: ${childId}.parent=${child.parent} conflicts with ${item.id}.children[]`);
        }
      }
    }
    if (item.parent && !ids.has(item.parent)) fail(`data/links.json: ${item.id} references missing parent ${item.parent}`);
  }

  for (const key of ['desktop', 'quickLaunch']) {
    if (catalog[key] && !Array.isArray(catalog[key])) fail(`data/links.json: ${key} must be an array`);
    for (const id of catalog[key] || []) if (!ids.has(id)) fail(`data/links.json: ${key} references missing item ${id}`);
  }

  for (const [menuId, menuItems] of Object.entries(catalog.menus || {})) {
    if (!Array.isArray(menuItems)) fail(`data/links.json: menu ${menuId} must be an array`);
    for (const id of menuItems || []) if (!ids.has(id)) fail(`data/links.json: menu ${menuId} references missing item ${id}`);
  }
}

const html = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '';
if (!html) fail('index.html: missing');

const localRefs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(match => match[1]);
for (const ref of localRefs) {
  if (/^(?:https?:|data:|mailto:|javascript:|#|\/)/i.test(ref)) continue;
  const clean = ref.split(/[?#]/, 1)[0];
  if (clean && !exists(clean)) fail(`index.html: missing local asset ${clean}`);
}

const requiredFiles = ['app.js', 'runtime-guard.js', 'styles.css', 'top-taskbar.css', 'shortcut-template.css', 'menu.css', 'data/links.json'];
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
  if (/\bfile:/i.test(text)) fail(`${file}: file: URL reference remains`);
}

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

console.log(`Validation passed: ${jsonFiles.length} JSON file(s), ${tree.length} repository file(s), catalog relationships and folder icon mirrors checked.`);
console.log(`Validator: ${pathToFileURL(path.join(root, 'tools/validate.mjs')).href}`);
