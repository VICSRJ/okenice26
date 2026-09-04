(() => {
'use strict';
const desktop=document.getElementById('desktop');
const api=window.__OKENICE_W98__;
if(!desktop||!api)return;
fetch('data/links.json',{cache:'no-store'}).then(r=>r.json()).then(c=>{
  const items=new Map((Array.isArray(c.items)?c.items:[]).map(x=>[x.id,x]));
  window.__OKENICE_CATALOG__=items;
  document.addEventListener('dblclick',e=>{
    const icon=e.target.closest('#desktop-icons .desktop-icon[data-shortcut-id]');
    if(!icon)return;
    const item=items.get(icon.dataset.shortcutId);
    if(!item||item.type!=='app')return;
    e.preventDefault();e.stopImmediatePropagation();
    const w=api.launch('internet-explorer');
    if(!w)return;
    const u=w.el.querySelector('[data-url]'),go=w.el.querySelector('[data-go]');
    if(u&&go){u.value=item.url||'';go.click()}
  },true);
}).catch(()=>{});
})();
