import { state } from './state.js';
import { projectLength } from './utils.js';
import { initMedia } from './media.js';
import { initTimeline } from './timeline.js';
import { initPlayer } from './player.js';
import { initProject } from './project.js';

const $ = (sel) => document.querySelector(sel);

const refs = {
  // left
  mediaList: $('#mediaList'),
  dropzone: $('#dropzone'),
  fileInput: $('#fileInput'),
  // viewer / transport
  programVideo: $('#programVideo'),
  programAudio: $('#programAudio'),
  programTC: $('#programTC'),
  playBtn: $('#play'),
  stopBtn: $('#stop'),
  rewBtn: $('#rew'),
  scrub: $('#scrub'),
  // timeline
  tracksEl: $('#tracks'),
  playheadEl: $('#playhead'),
  ruler: $('#ruler'),
  zoom: $('#zoom'),
  zoomVal: $('#zoomVal'),
  snap: $('#snap'),
  fpsSel: $('#fps'),
  toolSelectBtn: $('#toolSelect'),
  toolBladeBtn: $('#toolBlade'),
  // project
  saveBtn: $('#saveBtn'),
  openBtn: $('#openBtn'),
  newBtn: $('#newBtn'),
  // resizer
  rowResizer: document.getElementById('rowResizer'),
  colResizer: document.getElementById('colResizer'),
};

const appEl = document.getElementById('app');

// Global drag/drop prevention to avoid navigation
window.addEventListener('dragover', e=> e.preventDefault());
window.addEventListener('drop', e=> e.preventDefault());

const media = initMedia(refs);
const player = initPlayer(refs);

let currentTool = 'select';
const setTool = (tool) => {
  currentTool = tool;
  if (appEl){ appEl.setAttribute('data-tool', tool); }
  refs.toolSelectBtn?.classList.toggle('active', tool==='select');
  refs.toolBladeBtn?.classList.toggle('active', tool==='blade');
};
const getTool = () => currentTool;

let wasPlayingDuringScrub = false;
const timeline = initTimeline(refs, {
  onClipsChanged(){ player.updateScrubRange(); },
  onSelect(){ /* no inspector */ },
  onPlayheadSet(){ player.updatePlayheadUI(); player.updateProgramAtPlayhead(true); },
  onRedrawRequest(){ player.updatePlayheadUI(); },
  onScrub(){ player.updatePlayheadUI(); player.updateProgramAtPlayhead(false); },
  onScrubStart(){ wasPlayingDuringScrub = state.playing; if (wasPlayingDuringScrub) player.pause(); },
  onScrubEnd(){ if (wasPlayingDuringScrub) player.play(); },
  getTool,
  onBladeCut(clipId, time){
    if (splitClipAtTime(clipId, time)){
      player.updateProgramAtPlayhead(true);
    }
  }
});

refs.toolSelectBtn?.addEventListener('click', ()=> setTool('select'));
refs.toolBladeBtn?.addEventListener('click', ()=> setTool('blade'));

setTool('select');

const project = initProject(refs, {
  onProjectLoaded(){
    media.renderLibrary();
    // sync controls
    refs.fpsSel.value = String(state.fps);
    refs.zoom.value = state.pxPerSec; refs.zoom.dispatchEvent(new Event('input'));
    timeline.renderTracks();
    timeline.renderClips();
    player.updateScrubRange();
    state.playhead=0; player.updatePlayheadUI(); player.updateProgramAtPlayhead(true);
  },
  reloadLibrary: media.reloadLibrary,
  renderLibrary: media.renderLibrary,
});

// Keyboard nudges and delete
window.addEventListener('keydown', (e)=>{
  if (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
  const c = state.clips.find(x=>x.id===state.selectedClipId);
  const fine = e.shiftKey ? 1.0 : 0.1;
  if ((e.key==='Delete' || e.key==='Backspace') && c){ state.clips = state.clips.filter(x=>x.id!==c.id); state.selectedClipId=null; timeline.renderClips(); player.updateScrubRange(); e.preventDefault(); }
  if ((e.key==='ArrowLeft'||e.key==='ArrowRight') && c){ c.start = Math.max(0, c.start + (e.key==='ArrowLeft'?-fine:fine)); timeline.renderClips(); }
  if (e.key==='+' || e.key==='='){ refs.zoom.value = Math.min(400, parseInt(refs.zoom.value,10)+10); refs.zoom.dispatchEvent(new Event('input')); }
  if (e.key==='-' || e.key==='_'){ refs.zoom.value = Math.max(20, parseInt(refs.zoom.value,10)-10); refs.zoom.dispatchEvent(new Event('input')); }
  if (e.key==='s' || e.key==='S'){ splitAtPlayhead(); }
  if (e.key==='v' || e.key==='V'){ setTool('select'); e.preventDefault(); }
  if (e.key==='c' || e.key==='C'){ setTool('blade'); e.preventDefault(); }
  if (e.key==='Escape'){ setTool('select'); }
});

// Initial draw
timeline.drawRuler();

// Viewer/timeline row resizer
(function initRowResizer(){
  const handle = refs.rowResizer; if (!handle) return;
  let startY = 0; let startH = 0;
  const onMove = (e)=>{
    const dy = e.clientY - startY;
    let h = Math.max(160, Math.min(window.innerHeight * 0.7, startH + dy));
    document.documentElement.style.setProperty('--viewer-h', h + 'px');
    try{ localStorage.setItem('fealms.viewerH', String(h)); }catch{}
  };
  const onUp = ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  handle.addEventListener('mousedown', (e)=>{
    startY = e.clientY;
    const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--viewer-h').trim();
    startH = parseInt(cssVal, 10) || 220;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
  handle.addEventListener('dblclick', ()=>{
    const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--viewer-h').trim();
    const curr = parseInt(cssVal, 10) || 220;
    const prev = parseInt(localStorage.getItem('fealms.viewerH.prev')||'300', 10) || 300;
    if (curr > 170){
      localStorage.setItem('fealms.viewerH.prev', String(curr));
      document.documentElement.style.setProperty('--viewer-h', '160px');
      localStorage.setItem('fealms.viewerH', '160');
    } else {
      document.documentElement.style.setProperty('--viewer-h', prev + 'px');
      localStorage.setItem('fealms.viewerH', String(prev));
    }
  });
})();

// Sidebar (left) column resizer
(function initColResizer(){
  const handle = refs.colResizer; if (!handle) return;
  let startX = 0; let startW = 0;
  const onMove = (e)=>{
    const dx = e.clientX - startX;
    let w = Math.max(160, Math.min(window.innerWidth * 0.6, startW + dx));
    document.documentElement.style.setProperty('--left-w', w + 'px');
    try{ localStorage.setItem('fealms.leftW', String(w)); }catch{}
  };
  const onUp = ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  handle.addEventListener('mousedown', (e)=>{
    startX = e.clientX;
    const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--left-w').trim();
    startW = parseInt(cssVal, 10) || 280;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
  handle.addEventListener('dblclick', ()=>{
    const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--left-w').trim();
    const curr = parseInt(cssVal, 10) || 280;
    const prev = parseInt(localStorage.getItem('fealms.leftW.prev')||'320', 10) || 320;
    if (curr > 170){
      localStorage.setItem('fealms.leftW.prev', String(curr));
      document.documentElement.style.setProperty('--left-w', '160px');
      localStorage.setItem('fealms.leftW', '160');
    } else {
      document.documentElement.style.setProperty('--left-w', prev + 'px');
      localStorage.setItem('fealms.leftW', String(prev));
    }
  });
})();

// Zoom-to-fit control: fits project length into visible tracks width
document.getElementById('fitBtn')?.addEventListener('click', ()=>{
  const len = Math.max(1, projectLength(state));
  const availablePx = Math.max(200, refs.tracksEl.clientWidth - 54);
  const pxPerSec = Math.min(400, Math.max(20, Math.floor(availablePx / len)));
  refs.zoom.value = String(pxPerSec);
  refs.zoom.dispatchEvent(new Event('input'));
  // Scroll to start
  refs.tracksEl.scrollLeft = 0;
  player.updatePlayheadUI();
});

// Split at playhead (button + keyboard S)
document.getElementById('splitBtn')?.addEventListener('click', ()=> splitAtPlayhead());

function splitClipAtTime(clipId, time){
  const idx = state.clips.findIndex(x=>x.id===clipId);
  if (idx === -1) return false;
  const c = state.clips[idx];
  const minDur = 0.05;
  const relative = time - c.start;
  if (relative < minDur || c.dur - relative < minDur) return false;
  const leftDur = relative;
  const rightDur = c.dur - relative;
  const left = { ...c, id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), dur: leftDur, out: c.in + leftDur };
  const right = { ...c, id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), start: c.start + leftDur, dur: rightDur, in: c.in + leftDur };
  state.clips.splice(idx, 1, left, right);
  state.selectedClipId = right.id;
  timeline.renderClips();
  player.updateScrubRange();
  player.updatePlayheadUI();
  return true;
}

function splitAtPlayhead(){
  const t = state.playhead;
  // Prefer selected clip if it intersects playhead; else find first on V1 or A1
  let target = state.clips.find(x=> x.id===state.selectedClipId && t>=(x.start+0.001) && t<=(x.start + x.dur - 0.001));
  if (!target){ target = state.clips.find(x=> t>=(x.start+0.001) && t<=(x.start + x.dur - 0.001)); }
  if (!target) return;
  if (splitClipAtTime(target.id, t)){
    player.updateProgramAtPlayhead(true);
  }
}

// Restore persisted sizes
(function restoreSizes(){
  try{
    const lw = localStorage.getItem('fealms.leftW');
    if (lw) document.documentElement.style.setProperty('--left-w', lw + 'px');
    const vh = localStorage.getItem('fealms.viewerH');
    if (vh) document.documentElement.style.setProperty('--viewer-h', vh + 'px');
  }catch{}
})();

// Keyboard resize shortcuts (Cmd/Ctrl + Arrows)
window.addEventListener('keydown', (e)=>{
  if (!(e.ctrlKey||e.metaKey)) return;
  const get = v => parseInt(getComputedStyle(document.documentElement).getPropertyValue(v),10);
  if (e.key==='ArrowLeft' || e.key==='ArrowRight'){
    let w = get('--left-w') || 280; w += (e.key==='ArrowRight'? 20 : -20);
    w = Math.max(160, Math.min(window.innerWidth*0.6, w));
    document.documentElement.style.setProperty('--left-w', w+'px');
    try{ localStorage.setItem('fealms.leftW', String(w)); }catch{}
    e.preventDefault();
  }
  if (e.key==='ArrowUp' || e.key==='ArrowDown'){
    let h = get('--viewer-h') || 220; h += (e.key==='ArrowDown'? 20 : -20);
    h = Math.max(160, Math.min(window.innerHeight*0.7, h));
    document.documentElement.style.setProperty('--viewer-h', h+'px');
    try{ localStorage.setItem('fealms.viewerH', String(h)); }catch{}
    e.preventDefault();
  }
});

// Add tracks
document.getElementById('addV')?.addEventListener('click', ()=> addTrack('video'));
document.getElementById('addA')?.addEventListener('click', ()=> addTrack('audio'));

function addTrack(kind){
  const prefix = kind==='audio' ? 'A' : 'V';
  const nums = state.tracks.filter(t=>t.kind===kind).map(t=>parseInt(t.id.slice(1),10)).filter(n=>!isNaN(n));
  const nextNum = (nums.length? Math.max(...nums):0) + 1;
  const id = `${prefix}${nextNum}`;
  const insertIndex = kind==='video' ? state.tracks.findIndex(t=>t.kind==='audio') : state.tracks.length;
  if (insertIndex === -1) { state.tracks.push({id,kind}); } else { state.tracks.splice(insertIndex,0,{id,kind}); }
  timeline.renderTracks();
  timeline.renderClips();
  player.updatePlayheadUI();
}
