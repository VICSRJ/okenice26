import { cp, mkdir, rm, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const out = path.join(root, "dist");
const requiredFiles = [
  "index.html","styles.css","top-taskbar.css","shortcut-template.css","menu.css",
  "enhancements.css","desktop-metadata.css","win98-extension.css",
  "app.js","hierarchy-tree.js","desktop-metadata.js","runtime-guard.js",
  "win98-runtime.js","win98-patch.js","win98-dnd.js",
  "manifest.webmanifest","service-worker.js","data/links.json"
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const relative of requiredFiles) {
  const source = path.join(root, relative);
  const target = path.join(out, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}

for (const directory of ["assets", "images", "public"]) {
  const source = path.join(root, directory);
  try {
    const info = await stat(source);
    if (info.isDirectory()) await cp(source, path.join(out, directory), { recursive: true });
  } catch {
    // Optional directory.
  }
}

await writeFile(path.join(out, ".nojekyll"), "\n", "utf8");

const files = [];
async function collect(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, relative);
    else files.push(relative.replaceAll(path.sep, "/"));
  }
}
await collect(out);

await writeFile(
  path.join(out, "build-info.json"),
  JSON.stringify({ static: true, files: files.sort() }, null, 2) + "\n",
  "utf8"
);

console.log(`Static build OK: ${files.length} files -> dist/`);
