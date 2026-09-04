(() => {
'use strict';
const desktop=document.getElementById('desktop'), api=window.__OKENICE_W98__;
if(!desktop||!api)return;
const hint=document.createElement('div');
hint.textContent='Drop files here to add them to My Documents';
Object.assign(hint.style,{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',padding:'6px 10px',background:'#c0c0c0',border:'2px outset #fff',font:'11px "MS Sans Serif",Tahoma,sans-serif',zIndex:'850',display:'none',pointerEvents:'none'});
desktop.appendChild(hint);
let depth=0;
desktop.addEventListener('dragenter',e=>{e.preventDefault();depth++;hint.style.display='block'});
desktop.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'});
desktop.addEventListener('dragleave',e=>{e.preventDefault();depth--;if(depth<=0){depth=0;hint.style.display='none'}});
desktop.addEventListener('drop',e=>{
 e.preventDefault();e.stopPropagation();depth=0;hint.style.display='none';
 [...(e.dataTransfer.files||[])].forEach(file=>{
   const reader=new FileReader();
   reader.onload=()=>api.fs.add({name:file.name,type:file.type||'File',content:String(reader.result||''),size:file.size});
   if((file.type||'').startsWith('text/')||file.size<524288)reader.readAsText(file);else reader.readAsDataURL(file);
 });
 setTimeout(()=>api.launch('explorer'),100);
});
})();