(() => {
'use strict';
const api=window.__OKENICE_W98__,desktop=document.getElementById('desktop'),taskbar=document.getElementById('taskbar'),start=document.getElementById('start-button');
if(!api||!desktop||!taskbar)return;
const KEY='okenice26:w98:';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY+'desktop')||'{}')}catch{return{}}};
const save=(o)=>localStorage.setItem(KEY+'desktop',JSON.stringify({...load(),...o}));
function applyShell(){
 const s=load(),pos=['top','bottom','left','right'].includes(s.taskbarPosition)?s.taskbarPosition:'top';
 document.documentElement.dataset.taskbarPosition=pos;
 taskbar.dataset.position=pos;
 if(Number(s.taskbarRows)>=2)taskbar.classList.add('w98-wide');else taskbar.classList.remove('w98-wide');
}
applyShell();
function persistWindows(){
 const out={};api.windows.forEach(w=>{out[w.title]={left:w.el.style.left,top:w.el.style.top,width:w.el.style.width,height:w.el.style.height,maximized:w.el.classList.contains('is-maximized')}});save({windows:out});
}
window.addEventListener('beforeunload',persistWindows);
function makeContext(){
 if(document.getElementById('w98-taskbar-context'))return;
 const m=document.createElement('div');m.id='w98-taskbar-context';m.hidden=true;
 m.innerHTML='<button data-a="cascade">Cascade Windows</button><button data-a="tile">Tile Windows</button><button data-a="minall">Minimize All</button><div class="sep"></div><button data-a="show">Show Desktop</button><button data-a="lock">Lock the Taskbar</button>';
 document.body.appendChild(m);
 const hide=()=>m.hidden=true;
 m.querySelector('[data-a="cascade"]').onclick=()=>{let i=0;api.windows.forEach(w=>{w.el.classList.remove('is-minimized');w.el.style.left=(20+i*24)+'px';w.el.style.top=(18+i*24)+'px';i++});hide()};
 m.querySelector('[data-a="tile"]').onclick=()=>{const arr=[...api.windows.values()].filter(w=>!w.el.classList.contains('is-minimized'));if(!arr.length)return hide();const n=Math.ceil(Math.sqrt(arr.length)),cols=n,rows=Math.ceil(arr.length/cols),cw=desktop.clientWidth/cols,ch=desktop.clientHeight/rows;arr.forEach((w,i)=>{w.el.classList.remove('is-minimized','is-maximized');w.el.style.left=(i%cols*cw)+'px';w.el.style.top=(Math.floor(i/cols)*ch)+'px';w.el.style.width=Math.max(240,cw-3)+'px';w.el.style.height=Math.max(140,ch-3)+'px'});hide()};
 m.querySelector('[data-a="minall"]').onclick=()=>{api.windows.forEach(w=>w.el.classList.add('is-minimized'));hide()};
 m.querySelector('[data-a="show"]').onclick=()=>{api.windows.forEach(w=>w.el.classList.add('is-minimized'));hide()};
 m.querySelector('[data-a="lock"]').onclick=()=>{taskbar.dataset.locked=taskbar.dataset.locked==='1'?'0':'1';m.querySelector('[data-a="lock"]').textContent=taskbar.dataset.locked==='1'?'Unlock the Taskbar':'Lock the Taskbar';save({taskbarLocked:taskbar.dataset.locked==='1'})};
 document.addEventListener('pointerdown',e=>{if(!m.hidden&&!m.contains(e.target))hide()});
}
makeContext();
taskbar.addEventListener('contextmenu',e=>{e.preventDefault();const m=document.getElementById('w98-taskbar-context');if(!m)return;m.style.left=Math.max(2,Math.min(innerWidth-195,e.clientX))+'px';m.style.top=Math.max(2,Math.min(innerHeight-155,e.clientY))+'px';m.hidden=false});
function altTab(){
 const arr=[...api.windows.values()].filter(w=>w.el.isConnected&&!w.el.classList.contains('is-minimized'));
 if(arr.length<2)return;
 let chooser=document.getElementById('w98-alt-tab');
 if(!chooser){chooser=document.createElement('div');chooser.id='w98-alt-tab';chooser.hidden=true;document.body.appendChild(chooser)}
 chooser.innerHTML='';
 const active=arr.findIndex(w=>w.active);const next=(active+1)%arr.length;
 arr.forEach((w,i)=>{const b=document.createElement('button');b.className='w98-alt-item'+(i===next?' active':'');b.innerHTML='<span class="w98-alt-icon">'+(w.el.querySelector('.w98-title-icon')?.textContent||'▣')+'</span><span>'+String(w.title).slice(0,40)+'</span>';b.onclick=()=>{api.windows.get(w.id)&&w.el.classList.remove('is-minimized');w.el.style.zIndex='9999';w.active=false;chooser.hidden=true;document.dispatchEvent(new CustomEvent('okenice:activate-window',{detail:{windowId:w.id}}));};chooser.appendChild(b)});
 chooser.hidden=false;setTimeout(()=>chooser.hidden=true,900);
}
document.addEventListener('keydown',e=>{
 if(e.altKey&&e.key==='Tab'){e.preventDefault();altTab()}
 if(e.altKey&&e.key==='F4'){const w=[...api.windows.values()].find(x=>x.active);if(w){e.preventDefault();w.el.querySelector('[data-a="close"]')?.click()}}
 if((e.ctrlKey||e.metaKey)&&e.key==='Escape'){e.preventDefault();start?.click()}
});
document.addEventListener('okenice:activate-window',e=>{const w=api.windows.get(e.detail.windowId);if(!w)return;api.windows.forEach(x=>x.el.classList.remove('is-active'));w.el.classList.add('is-active');w.active=true;w.el.style.zIndex='9999'});
function patchControlPanel(){
 const original=api.launch;
 api.launch=(id)=>{const w=original(id);if(id==='control-panel'&&w){const root=w.el.querySelector('.w98-content');if(root&&!root.querySelector('[data-taskbar-pos]')){const box=document.createElement('div');box.className='w98-panel';box.style.margin='8px';box.innerHTML='<h3>Taskbar</h3><p>Position:</p><select class="w98-select" data-taskbar-pos><option>top</option><option>bottom</option><option>left</option><option>right</option></select><p>Rows:</p><select class="w98-select" data-taskbar-rows><option value="1">1</option><option value="2">2</option></select>';root.appendChild(box);const p=box.querySelector('[data-taskbar-pos]'),rows=box.querySelector('[data-taskbar-rows]');p.value=load().taskbarPosition||'top';rows.value=String(load().taskbarRows||1);p.onchange=()=>{save({taskbarPosition:p.value});applyShell()};rows.onchange=()=>{save({taskbarRows:Number(rows.value)});applyShell()}}}return w};
}
patchControlPanel();
})();
