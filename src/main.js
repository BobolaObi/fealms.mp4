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
  // project
  saveBtn: $('#saveBtn'),
  openBtn: $('#openBtn'),
  newBtn: $('#newBtn'),
};

// Global drag/drop prevention to avoid navigation
window.addEventListener('dragover', e=> e.preventDefault());
window.addEventListener('drop', e=> e.preventDefault());

const media = initMedia(refs);
const player = initPlayer(refs);

const timeline = initTimeline(refs, {
  onClipsChanged(){ player.updateScrubRange(); },
  onSelect(){ /* no inspector */ },
  onPlayheadSet(){ player.updatePlayheadUI(); player.updateProgramAtPlayhead(true); },
  onRedrawRequest(){ player.updatePlayheadUI(); }
});

const project = initProject(refs, {
  onProjectLoaded(){
    // rebuild media cards
    state.media.forEach(m=>{
      const evt = new CustomEvent('rebuild-media', { detail: m });
      // simple rebuild: create cards from media module by calling addMediaFiles on empty FileList is hard,
      // so manually create cards similar to media.addMediaCard via dispatch
      const el = document.createElement('div'); el.className='media'; el.draggable=true; el.dataset.id=m.id;
      el.innerHTML = `<div class="thumb">${m.type.toUpperCase()}</div><div class="meta"><div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${m.name}</div><div style="color:var(--muted)">${m.type} • ${(m.type==='image'?5:m.duration).toFixed(1)}s</div></div>`;
      el.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', JSON.stringify({kind:'media', id:m.id})); });
      refs.mediaList.appendChild(el);
    });
    // sync controls
    refs.fpsSel.value = String(state.fps);
    refs.zoom.value = state.pxPerSec; refs.zoom.dispatchEvent(new Event('input'));
    timeline.renderClips();
    player.updateScrubRange();
    state.playhead=0; player.updatePlayheadUI(); player.updateProgramAtPlayhead(true);
  }
});

// Keyboard nudges and delete
window.addEventListener('keydown', (e)=>{
  if (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
  const c = state.clips.find(x=>x.id===state.selectedClipId);
  const fine = e.shiftKey ? 1.0 : 0.1;
  if (e.key==='Delete' && c){ state.clips = state.clips.filter(x=>x.id!==c.id); state.selectedClipId=null; timeline.renderClips(); player.updateScrubRange(); }
  if ((e.key==='ArrowLeft'||e.key==='ArrowRight') && c){ c.start = Math.max(0, c.start + (e.key==='ArrowLeft'?-fine:fine)); timeline.renderClips(); }
  if (e.key==='+' || e.key==='='){ refs.zoom.value = Math.min(400, parseInt(refs.zoom.value,10)+10); refs.zoom.dispatchEvent(new Event('input')); }
  if (e.key==='-' || e.key==='_'){ refs.zoom.value = Math.max(20, parseInt(refs.zoom.value,10)-10); refs.zoom.dispatchEvent(new Event('input')); }
});

// Initial draw
timeline.drawRuler();
