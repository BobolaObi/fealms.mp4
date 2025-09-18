import { state } from './state.js';
import { uid } from './utils.js';

export function initMedia(refs){
  const { mediaList, dropzone, fileInput } = refs;

  async function addMediaFiles(files){
    for (const file of files){
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
      let duration = 5;
      if (type === 'video' || type === 'audio'){
        try{ duration = await probeDuration(url); }catch{ duration = 5; }
      }
      const m = {id: uid(), name: file.name, type, url, duration, in:0, out:duration};
      state.media.push(m);
      addMediaCard(m);
    }
  }

  function probeDuration(url){
    return new Promise((res, rej) => {
      const v = document.createElement('video'); v.preload = 'metadata'; v.src = url;
      v.onloadedmetadata = () => { res(v.duration || 5); v.src=''; };
      v.onerror = rej;
    });
  }

  function addMediaCard(m){
    const el = document.createElement('div'); el.className='media'; el.draggable=true; el.dataset.id=m.id;
    el.innerHTML = `<div class="thumb">${m.type.toUpperCase()}</div><div class="meta"><div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${m.name}</div><div style="color:var(--muted)">${m.type} • ${m.type==='image'? '5.0' : (m.duration||0).toFixed(1)}s</div></div>`;
    el.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/plain', JSON.stringify({kind:'media', id:m.id}));
    });
    mediaList.appendChild(el);
  }

  dropzone.addEventListener('dragover', e=>{e.preventDefault(); dropzone.style.background='#191919'});
  dropzone.addEventListener('dragleave', ()=> dropzone.style.background='');
  dropzone.addEventListener('drop', e=>{ e.preventDefault(); dropzone.style.background=''; addMediaFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', e=> addMediaFiles(e.target.files));

  document.getElementById('clearMedia').addEventListener('click', ()=>{ state.media = []; mediaList.innerHTML=''; });

  return { addMediaFiles };
}

