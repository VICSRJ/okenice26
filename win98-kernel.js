(function(){
'use strict';
(function bootAndKernel(){
  const desktop=document.getElementById('desktop');
  if(!desktop) return;
  const PREFIX='okenice26:';
  const DB_NAME='okenice26-system';
  const DB_VERSION=1;
  const bootMessages=[
    'Phoenix BIOS 4.0 Release 6.0',
    'Memory Test: 640K Base + 63M Extended',
    'Detecting Primary Master... OK',
    'Detecting Secondary Master... OK',
    'Detecting Floppy Drive A:... 1.44MB',
    'Detecting CD-ROM D:... ATAPI',
    'Initializing Plug and Play... OK',
    'Loading KERNEL32.DLL... OK',
    'Loading GDI32.DLL... OK',
    'Loading USER32.DLL... OK',
    'Loading SYSTEM.DAT / USER.DAT... OK',
    'Initializing MOUSE.DRV / KEYBOARD.DRV... OK',
    'Starting SYSTRAY.EXE... OK',
    'Starting MSTASK.EXE... OK',
    'Starting EXPLORER.EXE... OK'
  ];

  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
  function showBoot(){
    const s=el('section');s.id='w98-boot-screen';
    s.innerHTML='<div class="w98-boot-panel"><div class="w98-boot-logo"><span class="w98-boot-brand">Microsoft Windows 98</span></div><div class="w98-boot-log"></div><div class="w98-boot-progress"><span></span></div><div class="w98-boot-status">Starting...</div></div>';
    desktop.appendChild(s);
    const log=s.querySelector('.w98-boot-log'),bar=s.querySelector('.w98-boot-progress span'),status=s.querySelector('.w98-boot-status');
    let i=0;
    function tick(){
      if(i<bootMessages.length){
        const line=el('div');line.textContent=bootMessages[i++];log.appendChild(line);log.scrollTop=log.scrollHeight;
        bar.style.width=Math.round(i/bootMessages.length*100)+'%';status.textContent=bootMessages[i-1];setTimeout(tick,55);
      }else{setTimeout(()=>{s.hidden=true;s.remove();welcome()},120)}
    }
    tick();
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){resolve(null);return;}
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv');if(!db.objectStoreNames.contains('files'))db.createObjectStore('files',{keyPath:'id'})};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }
  async function dbSet(store,key,value){
    const db=await openDb();if(!db)return;
    return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});
  }
  async function dbGet(store,key){
    const db=await openDb();if(!db)return null;
    return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const req=tx.objectStore(store).get(key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()});
  }
  async function dbAll(store){
    const db=await openDb();if(!db)return[];
    return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const req=tx.objectStore(store).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()});
  }

  const Registry={
    async get(path,fallback=null){const v=await dbGet('kv','reg:'+path);return v===null?fallback:v},
    async set(path,value){await dbSet('kv','reg:'+path,value);return value},
    async remove(path){const db=await openDb();if(!db)return;return new Promise((resolve,reject)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').delete('reg:'+path);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})},
    async export(){const rows=await dbAll('kv');const out={};rows.filter(x=>false);const db=await openDb();if(!db)return out;return new Promise((resolve,reject)=>{const tx=db.transaction('kv','readonly');const req=tx.objectStore('kv').openCursor();req.onsuccess=()=>{const c=req.result;if(!c){db.close();resolve(out);return}if(String(c.key).startsWith('reg:'))out[String(c.key).slice(4)]=c.value;c.continue()};req.onerror=()=>{db.close();reject(req.error)}})}
  };

  const VFS={
    async list(){return dbAll('files')},
    async put(file){const f={id:file.id||('vfs-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)),name:String(file.name||'Unnamed'),path:String(file.path||'C:\\My Documents'),type:String(file.type||'File'),size:Number(file.size||0),content:file.content||'',created:file.created||Date.now(),updated:Date.now(),attributes:file.attributes||{}};const db=await openDb();if(db){await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(f);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}return f},
    async remove(id){const db=await openDb();if(!db)return;return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
  };

  async function migrateLocalFiles(){
    try{
      const raw=JSON.parse(localStorage.getItem(PREFIX+'w98:files')||'[]');
      const existing=await VFS.list();
      if(existing.length===0 && Array.isArray(raw)) for(const f of raw) await VFS.put(f);
    }catch(_){}
  }

  function welcome(){
    const layer=el('div');layer.id='w98-welcome-layer';
    layer.innerHTML='<div class="w98-welcome"><div class="w98-welcome-title">Welcome to Microsoft Windows 98</div><div class="w98-welcome-body"><h2>Okenice26 Extended</h2><p>Windows 98 recreation shell loaded successfully.</p><div class="w98-welcome-tip"><b>Tip:</b> Double-click a shortcut, use Ctrl+Esc for Start, Alt+Tab for windows and Ctrl+Alt+Delete for Task Manager.</div><p>All simulated system data is stored locally in this browser.</p></div><div class="w98-welcome-actions"><button data-tips>Show Tips</button><button data-ok>OK</button></div></div>';
    desktop.appendChild(layer);
    layer.querySelector('[data-tips]').onclick=()=>alert('Explore Control Panel, Notepad, Explorer and the classic games. Your simulated registry and files persist locally.');
    layer.querySelector('[data-ok]').onclick=()=>layer.remove();
  }

  async function init(){
    await migrateLocalFiles();
    window.__OKENICE_KERNEL__={Registry,VFS,dbGet,dbSet,dbAll};
    const theme=await Registry.get('HKCU\\Control Panel\\Appearance\\Theme','windows-98');
    document.documentElement.dataset.w98Theme=theme;
    showBoot();
  }
  init().catch(()=>showBoot());
})();
})();