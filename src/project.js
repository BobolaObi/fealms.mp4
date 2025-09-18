import { state } from './state.js';
import { getMediaRecord } from './storage.js';

export function initProject(refs, { onProjectLoaded, reloadLibrary, renderLibrary }){
  const { saveBtn, openBtn, newBtn } = refs;

  const serialize = () => JSON.stringify({version:1,
    media: state.media.map(m=>({id:m.id,name:m.name,type:m.type,url:m.url,duration:m.duration,in:m.in,out:m.out})),
    clips: state.clips, tracks: state.tracks, fps: state.fps, pxPerSec: state.pxPerSec
  }, null, 2);

  const download = (name, text) => { const blob=new Blob([text],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); };

  async function loadProject(p){
    state.fps = p.fps||30;
    state.pxPerSec = p.pxPerSec||120;
    state.tracks = (p.tracks && p.tracks.length) ? p.tracks.map(t=>({...t})) : [{id:'V1',kind:'video'},{id:'A1',kind:'audio'}];
    await reloadLibrary?.();

    const projectMedia = Array.isArray(p.media) ? p.media : [];
    for (const meta of projectMedia){
      let entry = state.media.find(x=>x.id===meta.id);
      if (!entry){
        const rec = await getMediaRecord(meta.id);
        if (rec){
          const url = URL.createObjectURL(rec.blob);
          entry = { id: rec.id, name: rec.name, type: rec.type, url, duration: rec.duration, in: rec.in ?? 0, out: rec.out ?? rec.duration };
          state.media.push(entry);
        } else if (meta.url){
          entry = { ...meta };
          state.media.push(entry);
        }
      }
      if (entry){
        entry.name = meta.name || entry.name;
        entry.duration = meta.duration || entry.duration;
        if (meta.in !== undefined) entry.in = meta.in;
        if (meta.out !== undefined) entry.out = meta.out;
      }
    }

    renderLibrary?.();

    const validTrackIds = new Set(state.tracks.map(t=>t.id));
    const validMediaIds = new Set(state.media.map(m=>m.id));
    state.clips = (p.clips||[])
      .map(c=> ({...c}))
      .filter(c=> validTrackIds.has(c.track) && validMediaIds.has(c.mediaId));

    state.playhead=0;
    onProjectLoaded?.();
  }

  saveBtn.addEventListener('click', ()=> download('project.json', serialize()));
  openBtn.addEventListener('click', ()=>{ const i=document.createElement('input'); i.type='file'; i.accept='application/json'; i.onchange=()=>{
    const f=i.files[0]; const r=new FileReader(); r.onload=async ()=>{ try{ const p=JSON.parse(r.result); await loadProject(p);}catch(e){alert('Invalid project file')} }; r.readAsText(f);
  }; i.click(); });
  newBtn.addEventListener('click', async ()=>{ if (confirm('Start a new project?')){ state.clips=[]; state.tracks=[{id:'V1',kind:'video'},{id:'A1',kind:'audio'}]; state.fps=30; state.pxPerSec=120; state.playhead=0; await reloadLibrary?.(); onProjectLoaded?.(); }});

  return { loadProject };
}
