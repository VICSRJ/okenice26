const CACHE_NAME='okenice26-extended-v1';
const CORE=['./','./index.html','./styles.css','./win98-extension.css','./win98-runtime.js','./win98-patch.js','./win98-dnd.js','./data/links.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(new URL(event.request.url).origin===location.origin){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}return response;})))});
