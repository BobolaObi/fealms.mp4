import { state } from './state.js';

export function initProject(refs, { onProjectLoaded }){
  const { saveBtn, openBtn, newBtn, mediaList } = refs;

  const serialize = () => JSON.stringify({version:1,
    media: state.media.map(m=>({id:m.id,name:m.name,type:m.type,url:m.url,duration:m.duration,in:m.in,out:m.out})),
    clips: state.clips, tracks: state.tracks, fps: state.fps, pxPerSec: state.pxPerSec
  }, null, 2);

  const download = (name, text) => { const blob=new Blob([text],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); };

  function loadProject(p){
    state.fps = p.fps||30;
    state.pxPerSec = p.pxPerSec||120;
    state.media = (p.media||[]).map(m=> ({...m}));
    mediaList.innerHTML='';
    // caller should re-render media cards from state.media
    state.clips = (p.clips||[]).map(c=> ({...c}));
    state.tracks = (p.tracks && p.tracks.length) ? p.tracks.map(t=>({...t})) : [{id:'V1',kind:'video'},{id:'A1',kind:'audio'}];
    state.playhead=0;
    onProjectLoaded?.();
  }

  saveBtn.addEventListener('click', ()=> download('project.json', serialize()));
  openBtn.addEventListener('click', ()=>{ const i=document.createElement('input'); i.type='file'; i.accept='application/json'; i.onchange=()=>{
    const f=i.files[0]; const r=new FileReader(); r.onload=()=>{ try{ const p=JSON.parse(r.result); loadProject(p);}catch(e){alert('Invalid project file')} }; r.readAsText(f);
  }; i.click(); });
  newBtn.addEventListener('click', ()=>{ if (confirm('Start a new project?')){ state.media=[]; state.clips=[]; mediaList.innerHTML=''; state.playhead=0; onProjectLoaded?.(); }});

  return { loadProject };
}
