import { state } from './state.js';
import { uid } from './utils.js';
import { maybeTranscodeIfUnsupported } from './transcode.js';
import { saveMediaRecord, loadAllMediaRecords, clearAllMediaRecords } from './storage.js';

export function initMedia(refs){
  const { mediaList, dropzone, fileInput } = refs;

  const revokeUrls = () => { state.media.forEach(m=> m.url && URL.revokeObjectURL(m.url)); };

  const upsertMedia = (entry) => {
    const idx = state.media.findIndex(x=>x.id===entry.id);
    if (idx>=0){ state.media[idx] = entry; }
    else { state.media.push(entry); }
  };

  const createMediaCard = (m) => {
    const el = document.createElement('div'); el.className='media'; el.draggable=true; el.dataset.id=m.id;
    el.innerHTML = `<div class="thumb">${m.type.toUpperCase()}</div><div class="meta"><div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${m.name}</div><div style="color:var(--muted)">${m.type} • ${(m.type==='image'? (m.out||m.duration||5) : (m.duration||0)).toFixed(1)}s</div></div>`;
    el.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/plain', JSON.stringify({kind:'media', id:m.id}));
    });
    return el;
  };

  const renderLibrary = () => {
    mediaList.innerHTML='';
    state.media.forEach(m=> mediaList.appendChild(createMediaCard(m)));
  };

  async function reloadLibrary(){
    const records = await loadAllMediaRecords().catch(()=>[]);
    revokeUrls();
    state.media = [];
    for (const rec of records){
      const url = URL.createObjectURL(rec.blob);
      upsertMedia({
        id: rec.id,
        name: rec.name,
        type: rec.type,
        url,
        duration: rec.duration,
        in: rec.in ?? 0,
        out: rec.out ?? rec.duration,
      });
    }
    renderLibrary();
  }

  async function addMediaFiles(files){
    for (const file of files){
      let workingBlob = file;
      let displayName = file.name;
      let url = URL.createObjectURL(workingBlob);
      let mime = workingBlob.type || file.type || '';

      const trans = await maybeTranscodeIfUnsupported(file);
      if (trans){
        URL.revokeObjectURL(url);
        workingBlob = trans.blob;
        displayName = trans.name;
        mime = trans.mime;
        url = URL.createObjectURL(workingBlob);
      }

      const type = mime?.startsWith('video') ? 'video' : mime?.startsWith('audio') ? 'audio' : 'image';
      let duration = 5;
      if (type === 'video' || type === 'audio'){
        try{ duration = await probeDuration(url); }catch{ duration = 5; }
      }

      const entry = { id: uid(), name: displayName, type, url, duration, in:0, out:duration };
      upsertMedia(entry);
      try{
        await saveMediaRecord({ id: entry.id, name: displayName, type, duration, in: entry.in, out: entry.out, blob: workingBlob });
      }catch(err){ console.warn('Failed to persist media', err); }
    }
    renderLibrary();
  }

  function probeDuration(url){
    return new Promise((res, rej) => {
      const v = document.createElement('video'); v.preload = 'metadata'; v.src = url;
      v.onloadedmetadata = () => { res(v.duration || 5); v.src=''; };
      v.onerror = rej;
    });
  }

  dropzone.addEventListener('dragover', e=>{e.preventDefault(); dropzone.style.background='#191919'});
  dropzone.addEventListener('dragleave', ()=> dropzone.style.background='');
  dropzone.addEventListener('drop', e=>{ e.preventDefault(); dropzone.style.background=''; addMediaFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', e=> addMediaFiles(e.target.files));

  document.getElementById('clearMedia').addEventListener('click', async ()=>{
    if (!confirm('Remove all imported media from the library?')) return;
    revokeUrls();
    state.media = [];
    mediaList.innerHTML='';
    try{ await clearAllMediaRecords(); }catch{}
  });

  reloadLibrary();

  return { addMediaFiles, reloadLibrary, renderLibrary };
}
