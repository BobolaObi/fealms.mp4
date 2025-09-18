import { state } from './state.js';
import { clamp, snapTime } from './utils.js';

export function initTimeline(refs, callbacks){
  const { tracksEl, playheadEl, ruler, zoom, zoomVal, snap, fpsSel } = refs;
  const { onClipsChanged, onSelect, onPlayheadSet, onRedrawRequest } = callbacks;

  const laneForTrack = (track) => tracksEl.querySelector(`.track[data-track="${track}"] .lane`);
  const secondsToX = (sec) => 54 + sec * state.pxPerSec - tracksEl.scrollLeft;
  const xToSeconds = (x) => (x + tracksEl.scrollLeft - 54) / state.pxPerSec;

  function renderClips(){
    tracksEl.querySelectorAll('.lane').forEach(l => l.innerHTML='');
    for (const c of state.clips){
      const lane = laneForTrack(c.track); if (!lane) continue;
      const el = document.createElement('div');
      el.className = `clip ${c.type==='video'?'video':c.type==='audio'?'audio':'image'} ${state.selectedClipId===c.id?'selected':''}`;
      el.dataset.id = c.id;
      el.style.left = (c.start*state.pxPerSec)+'px';
      el.style.width = (c.dur*state.pxPerSec)+'px';
      el.innerHTML = `<small>${c.name}</small><div class="handles"><div class="h hL"></div><div class="h hR"></div></div>`;

      // Drag move
      let startX, startStart;
      el.addEventListener('mousedown', (e)=>{
        if (e.target.classList.contains('h')) return; // handled by resize
        state.selectedClipId = c.id; onSelect?.(c.id);
        el.style.cursor='grabbing';
        startX = e.clientX; startStart = c.start;
        const onMove = (ev)=>{
          const dx = (ev.clientX - startX) / state.pxPerSec;
          c.start = snapTime(state, Math.max(0, startStart + dx));
          el.style.left = (c.start*state.pxPerSec)+'px';
          onRedrawRequest?.();
        }
        const onUp = ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); el.style.cursor='grab'; onClipsChanged?.(); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
      });

      // Resizing
      el.querySelector('.hL').addEventListener('mousedown', (e)=> startResize(e, c, 'L'));
      el.querySelector('.hR').addEventListener('mousedown', (e)=> startResize(e, c, 'R'));

      el.addEventListener('click', ()=> { state.selectedClipId = c.id; onSelect?.(c.id); renderClips(); });
      lane.appendChild(el);
    }
  }

  function startResize(e, c, side){
    e.stopPropagation(); state.selectedClipId = c.id; onSelect?.(c.id);
    const startX = e.clientX; const orig = {...c};
    const onMove = (ev) => {
      const dxSec = (ev.clientX - startX)/state.pxPerSec;
      if (side==='L'){
        const newStart = snapTime(state, clamp(orig.start + dxSec, 0, orig.start + orig.dur - 0.05));
        const delta = orig.start - newStart;
        c.start = newStart; c.in = clamp(orig.in + delta, 0, orig.out);
        c.dur = clamp(orig.dur - delta, 0.05, 1e9);
      } else {
        const newDur = snapTime(state, clamp(orig.dur + dxSec, 0.05, (orig.out - orig.in)));
        c.dur = newDur;
      }
      renderClips();
    };
    const onUp = ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); onClipsChanged?.(); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }

  // Accept drops on lanes
  tracksEl.querySelectorAll('.track .lane').forEach(lane => {
    lane.addEventListener('dragover', e=>{ e.preventDefault(); lane.style.outline='2px dashed #333'; });
    lane.addEventListener('dragleave', ()=> lane.style.outline='');
    lane.addEventListener('drop', e=>{
      e.preventDefault(); lane.style.outline='';
      const data = JSON.parse(e.dataTransfer.getData('text/plain')||'{}');
      if (data.kind==='media'){
        const m = state.media.find(x=>x.id===data.id); if (!m) return;
        const rect = lane.getBoundingClientRect();
        const sec = snapTime(state, xToSeconds(e.clientX - rect.left));
        const dur = clamp((m.out - m.in) || (m.duration||5), 0.05, 1e9);
        const clip = { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), mediaId:m.id, name:m.name, type:m.type, track: lane.closest('.track').dataset.track, start:sec, dur:dur, in:m.in, out:m.out };
        state.clips.push(clip);
        renderClips();
        state.selectedClipId = clip.id; onSelect?.(clip.id);
        onClipsChanged?.();
      }
    });
  });

  // Playhead reposition (ignore when starting on a clip)
  tracksEl.addEventListener('mousedown', (e)=>{
    if (e.target.closest('.clip') || e.target.closest('.h')) return;
    const rect = tracksEl.getBoundingClientRect();
    const x = e.clientX - rect.left; const t = clamp(xToSeconds(x), 0, 1e9);
    state.playhead = t; onPlayheadSet?.();
  });

  // Zoom + snap
  function onZoom(){ state.pxPerSec = parseInt(zoom.value); zoomVal.textContent = state.pxPerSec; renderClips(); onRedrawRequest?.(); }
  zoom.addEventListener('input', onZoom); onZoom();
  snap.addEventListener('change', ()=> state.snap = snap.checked);

  // Ruler
  function drawRuler(){
    const dpr = window.devicePixelRatio || 1;
    const wrap = ruler.parentElement;
    const w = wrap.clientWidth; const h = wrap.clientHeight;
    ruler.width = w * dpr; ruler.height = h * dpr; ruler.style.width = w+'px'; ruler.style.height = h+'px';
    const ctx = ruler.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#0e0e0e'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#2a2a2a'; ctx.fillStyle = '#9aa0a6'; ctx.font = '12px system-ui'; ctx.textBaseline='top';
    const px = state.pxPerSec; const majorEvery = 1; const minorEvery = 0.25;
    const scrollX = tracksEl.scrollLeft; const startSec = Math.floor(scrollX / px); const endSec = Math.ceil((scrollX + w) / px);
    for (let s = startSec; s <= endSec; s += minorEvery){
      const x = Math.round(s * px - scrollX)+0.5; const isMajor = Math.abs((s % majorEvery)) < 1e-6; const th = isMajor ? 20 : 10;
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, h - th); ctx.stroke();
      if (isMajor){
        const mm = Math.floor((s%3600)/60).toString().padStart(2,'0');
        const ss = Math.floor(s%60).toString().padStart(2,'0');
        ctx.fillText(`${mm}:${ss}`, x+4, 2);
      }
    }
  }
  new ResizeObserver(drawRuler).observe(ruler.parentElement);
  tracksEl.addEventListener('scroll', drawRuler);

  return { renderClips, drawRuler };
}

