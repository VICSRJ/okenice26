(() => {
  'use strict';

  const desktop = document.getElementById('desktop');
  const icons = document.getElementById('desktop-icons');
  const layer = document.getElementById('windows-layer');
  const start = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  const taskButtons = document.getElementById('task-buttons');
  const context = document.getElementById('context-menu');
  const clock = document.getElementById('clock');
  const shutdownOverlay = document.getElementById('shutdown-overlay');
  const z = { value: 50 };
  const windows = new Map();
  let drag = null;
  let resize = null;

  const apps = {
    computer:{title:'My Computer',icon:'computer-small',size:[560,360],body:'<div class="explorer-toolbar"><button class="win-button">Back</button><button class="win-button">Forward</button><button class="win-button">Up</button></div><div class="addressbar"><strong>Address</strong><input value="My Computer" readonly></div><div class="file-view"><div class="file-item"><span class="icon-art icon-folder"></span><span>Windows (C:)</span></div><div class="file-item"><span class="icon-art icon-folder"></span><span>Data (D:)</span></div><div class="file-item"><span class="icon-art icon-network"></span><span>Network Neighborhood</span></div><div class="file-item"><span class="icon-art icon-trash"></span><span>Recycle Bin</span></div></div>'},
    documents:{title:'My Documents',icon:'note-small',size:[520,330],body:'<div class="explorer-toolbar"><button class="win-button">Back</button><button class="win-button">Up</button></div><div class="addressbar"><strong>Address</strong><input value="C:\\My Documents" readonly></div><div class="file-view"><div class="file-item"><span class="icon-art icon-folder"></span><span>Projects</span></div><div class="file-item"><span class="icon-art icon-notepad"></span><span>README.TXT</span></div><div class="file-item"><span class="icon-art icon-notepad"></span><span>NOTES.TXT</span></div></div>'},
    network:{title:'Network Neighborhood',icon:'computer-small',size:[520,330],body:'<div class="addressbar"><strong>Address</strong><input value="Network Neighborhood" readonly></div><div class="file-view"><div class="file-item"><span class="icon-art icon-computer"></span><span>OK-PC</span></div><div class="file-item"><span class="icon-art icon-computer"></span><span>SERVER</span></div><div class="file-item"><span class="icon-art icon-network"></span><span>Workgroup</span></div></div>'},
    internet:{title:'Internet Explorer',icon:'ie-small',size:[620,420],body:'<div class="explorer-toolbar"><button class="win-button">Back</button><button class="win-button">Forward</button><button class="win-button">Home</button></div><div class="addressbar"><strong>Address</strong><input value="http://okenice26/" readonly></div><div class="ie-page"><div class="ie-logo">e</div><h2>Internet Explorer</h2><p>Welcome to Okenice26.</p><p>This is a browser-style application inside the Windows 98 desktop.</p></div>'},
    recycle:{title:'Recycle Bin',icon:'trash-mini',size:[470,290],body:'<div class="addressbar"><strong>Recycle Bin</strong></div><div class="about-copy"><strong>Recycle Bin is empty.</strong><p>Deleted objects would appear here.</p></div>'},
    about:{title:'Okenice26',icon:'note-small',size:[500,330],body:'<div class="about-copy"><h2>Okenice26</h2><p>Windows 98 desktop recreation.</p><p>Classic desktop icons, Start menu, taskbar and movable application windows.</p><hr><p><strong>System:</strong> Windows 98-compatible web shell</p><p><strong>Mode:</strong> Standalone Desktop</p></div>'},
    notepad:{title:'Notepad',icon:'note-small',size:[560,370],body:'<textarea class="notepad" spellcheck="false">Okenice26\n\nWindows 98 desktop simulation.\n\nType here...</textarea>'},
    calculator:{title:'Calculator',icon:'calc-art',size:[260,320],body:'<div class="calculator"><input id="calc-display" value="0" readonly><div class="calc-grid">'+['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(x=>'<button class="win-button calc-key" data-key="'+x+'">'+x+'</button>').join('')+'</div></div>'},
    solitaire:{title:'Solitaire',icon:'card-art',size:[590,430],body:'<div class="about-copy"><h2>Solitaire</h2><p>Classic card game placeholder.</p><div class="card-table">A♥ &nbsp; 7♣ &nbsp; Q♦ &nbsp; K♠</div></div>'},
    control:{title:'Control Panel',icon:'settings-art',size:[480,340],body:'<div class="about-copy"><h2>Control Panel</h2><p>Display</p><p>Keyboard</p><p>Mouse</p><p>Network</p><p>System</p></div>'},
    find:{title:'Find',icon:'find-art',size:[450,260],body:'<div class="about-copy"><h2>Find</h2><p>Find files or folders on this computer.</p><input value="" placeholder="Named:" style="width:100%"><div class="dialog-actions"><button class="win-button">Find Now</button></div></div>'},
    help:{title:'Windows Help',icon:'help-art',size:[500,320],body:'<div class="about-copy"><h2>Windows Help</h2><p>Select a topic to get help about using this desktop.</p></div>'}
  };

  function setStart(open){
    menu.hidden=!open;
    start.classList.toggle('pressed',open);
    start.setAttribute('aria-expanded',String(open));
    if(!open) hideSubmenus();
  }
  function hideSubmenus(){menu.querySelectorAll('.submenu').forEach(el=>{el.hidden=true});}

  start.addEventListener('click',e=>{e.stopPropagation();closeContext();setStart(menu.hidden)});

  menu.addEventListener('mouseover',e=>{
    const item=e.target.closest('[data-submenu]');
    if(!item) return;
    const id=item.dataset.submenu;
    const panel=menu.querySelector(`[data-submenu-panel="${id}"]`);
    if(panel){hideSubmenus();panel.hidden=false;const r=item.getBoundingClientRect();panel.style.top=`${Math.max(0,r.top-menu.getBoundingClientRect().top-1)}px`;}
  });

  menu.addEventListener('click',e=>{
    const app=e.target.closest('[data-app]');
    if(app){openApp(app.dataset.app);setStart(false);return;}
    const action=e.target.closest('[data-menu-action]')?.dataset.menuAction;
    if(action==='shutdown'){shutdownOverlay.hidden=false;setStart(false)}
    if(action==='run'){openApp('internet');setStart(false)}
    if(action==='taskbar'){openApp('about');setStart(false)}
    if(action==='find'){openApp('find');setStart(false)}
    if(action==='help'){openApp('help');setStart(false)}
  });

  document.addEventListener('click',e=>{
    if(!menu.hidden&&!menu.contains(e.target)&&e.target!==start)setStart(false);
    if(!context.hidden&&!context.contains(e.target))closeContext();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){setStart(false);closeContext();shutdownOverlay.hidden=true}});

  icons.addEventListener('click',e=>{
    const icon=e.target.closest('.desktop-icon');
    if(!icon)return;
    icons.querySelectorAll('.desktop-icon.selected').forEach(el=>el.classList.remove('selected'));
    icon.classList.add('selected');
  });
  icons.addEventListener('dblclick',e=>{const icon=e.target.closest('.desktop-icon');if(icon)openApp(icon.dataset.app)});

  desktop.addEventListener('contextmenu',e=>{
    if(e.target.closest('.app-window,.desktop-icon'))return;
    e.preventDefault();
    context.hidden=false;
    context.style.left=`${Math.min(e.clientX,window.innerWidth-195)}px`;
    context.style.top=`${Math.min(e.clientY,window.innerHeight-135)}px`;
  });
  context.addEventListener('click',e=>{
    const action=e.target.closest('[data-context]')?.dataset.context;
    if(action==='arrange')arrangeIcons();
    if(action==='refresh')window.location.reload();
    if(action==='new')openApp('notepad');
    if(action==='properties')openApp('about');
    closeContext();
  });
  function closeContext(){context.hidden=true}
  function arrangeIcons(){icons.style.left='7px';icons.style.top='7px'}

  function openApp(id){
    const spec=apps[id];if(!spec)return;
    const existing=windows.get(id);
    if(existing){if(existing.minimized)restoreWindow(existing);else focusWindow(existing);return}
    const el=document.createElement('section');el.className='app-window active';el.dataset.app=id;
    const maxW=Math.min(spec.size[0],Math.max(280,window.innerWidth-10));
    const maxH=Math.min(spec.size[1],Math.max(180,window.innerHeight-38));
    el.style.width=`${maxW}px`;el.style.height=`${maxH}px`;
    const offset=25+windows.size*24;
    el.style.left=`${Math.min(offset,Math.max(2,window.innerWidth-maxW-6))}px`;
    el.style.top=`${Math.min(offset,Math.max(2,window.innerHeight-30-maxH-4))}px`;
    el.innerHTML=`<div class="titlebar"><span class="title-icon ${spec.icon}"></span><span class="title-text">${spec.title}</span><div class="window-controls"><button class="window-control" data-win="min">_</button><button class="window-control" data-win="max">□</button><button class="window-control" data-win="close">×</button></div></div><div class="window-content">${spec.body}</div><div class="window-status"><span class="status-panel">${spec.title}</span><span class="status-grip"></span></div>`;
    layer.appendChild(el);
    const task=document.createElement('button');task.type='button';task.className='task-button';task.dataset.app=id;task.innerHTML=`<span class="task-icon ${spec.icon}"></span><span>${spec.title}</span>`;taskButtons.appendChild(task);
    const record={el,task,id,minimized:false,maximized:false,restore:null};windows.set(id,record);bindWindow(record);focusWindow(record);wireCalculator(el);
  }

  function bindWindow(record){
    const {el,task}=record;
    el.addEventListener('pointerdown',()=>focusWindow(record));
    el.querySelector('[data-win="close"]').addEventListener('click',()=>closeWindow(record));
    el.querySelector('[data-win="min"]').addEventListener('click',()=>minimizeWindow(record));
    el.querySelector('[data-win="max"]').addEventListener('click',()=>toggleMaximize(record));
    task.addEventListener('click',()=>{if(record.minimized)restoreWindow(record);else if(record.el.classList.contains('active'))minimizeWindow(record);else focusWindow(record)});
    el.querySelector('.titlebar').addEventListener('pointerdown',e=>startDrag(e,record));
  }
  function focusWindow(record){windows.forEach(w=>{w.el.classList.remove('active');w.task.classList.remove('active')});record.el.classList.add('active');record.task.classList.add('active');record.el.style.zIndex=String(++z.value)}
  function minimizeWindow(record){record.el.style.display='none';record.minimized=true;record.task.classList.remove('active')}
  function restoreWindow(record){record.el.style.display='flex';record.minimized=false;focusWindow(record)}

  function toggleMaximize(record){
    const el=record.el;
    if(!record.maximized){record.restore={left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height};el.classList.add('maximized');record.maximized=true}
    else{el.classList.remove('maximized');Object.assign(el.style,record.restore||{});record.maximized=false}
    focusWindow(record);
  }
  function closeWindow(record){record.el.remove();record.task.remove();windows.delete(record.id)}

  function startDrag(e,record){
    if(e.button!==0||record.maximized||e.target.closest('.window-control'))return;
    const r=record.el.getBoundingClientRect();drag={record,dx:e.clientX-r.left,dy:e.clientY-r.top};
    e.currentTarget.setPointerCapture?.(e.pointerId);document.addEventListener('pointermove',moveDrag);document.addEventListener('pointerup',stopDrag,{once:true});e.preventDefault();
  }
  function moveDrag(e){
    if(!drag)return;const w=drag.record.el;const maxX=Math.max(0,window.innerWidth-w.offsetWidth);const maxY=Math.max(0,window.innerHeight-28-w.offsetHeight);w.style.left=`${Math.min(maxX,Math.max(0,e.clientX-drag.dx))}px`;w.style.top=`${Math.min(maxY,Math.max(0,e.clientY-drag.dy))}px`;
  }
  function stopDrag(){drag=null;document.removeEventListener('pointermove',moveDrag)}

  function wireCalculator(el){
    const display=el.querySelector('#calc-display');if(!display)return;
    let value='';el.querySelectorAll('.calc-key').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.key;if(key==='='){try{display.value=String(Function(`return (${value||0})`)())}catch{display.value='Error'}value=''}else{value+=key;display.value=value}}));
  }

  document.getElementById('shutdown-cancel').addEventListener('click',()=>shutdownOverlay.hidden=true);
  document.getElementById('shutdown-ok').addEventListener('click',()=>{shutdownOverlay.hidden=true;layer.innerHTML='<div class="shutdown-screen">It is now safe to turn off your computer.</div>';windows.clear();taskButtons.innerHTML=''});

  function updateClock(){clock.textContent=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
  updateClock();window.setInterval(updateClock,1000);
})();
