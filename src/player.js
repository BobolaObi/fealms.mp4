import { state } from './state.js';
import { fmtTC, projectLength } from './utils.js';

export function initPlayer(refs){
  const { tracksEl, playheadEl, programVideo, programAudio, programTC, playBtn, stopBtn, rewBtn, scrub, fpsSel } = refs;

  let raf = null; let lastTs = 0; let lastUiTs = 0;
  function togglePlay(){ state.playing ? pause() : play(); }
  function play(){ state.playing=true; playBtn.textContent='⏸'; lastTs=performance.now(); tick(); }
  function pause(){ state.playing=false; playBtn.textContent='▶'; cancelAnimationFrame(raf); programVideo.pause(); programAudio.pause(); }
  function stop(){ state.playing=false; playBtn.textContent='▶'; cancelAnimationFrame(raf); state.playhead=0; updatePlayheadUI(); updateProgramAtPlayhead(true); programVideo.pause(); programAudio.pause(); }

  function tick(ts){
    raf = requestAnimationFrame(tick);
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs)/1000; lastTs = ts;
    if (!state.playing) return;
    state.playhead += dt; const end = projectLength(state);
    if (state.playhead > end+0.001) { pause(); return; }
    // Throttle UI updates to ~30fps for smoother playback on slower devices
    if (!lastUiTs || ts - lastUiTs > 33){
      lastUiTs = ts;
      updatePlayheadUI();
      updateProgramAtPlayhead(false);
    }
  }

  function updatePlayheadUI(){
    const x = state.playhead * state.pxPerSec - tracksEl.scrollLeft + 54; playheadEl.style.left = x + 'px';
    programTC.textContent = fmtTC(state.playhead, state.fps);
    scrub.max = Math.max(60, projectLength(state)+5); scrub.value = state.playhead;
  }
  function updateScrubRange(){ scrub.max = Math.max(60, projectLength(state)+5); }

  function getActiveClipAt(t){
    const videos = state.clips.filter(c=> c.track==='V1' && t>=c.start && t< c.start + c.dur);
    if (videos.length===0) return null;
    return videos[0];
  }
  function getActiveAudioAt(t){
    const auds = state.clips.filter(c=> c.track==='A1' && t>=c.start && t< c.start + c.dur);
    if (auds.length===0) return null;
    return auds[0];
  }

  let currentProgClipId = null; let currentProgKind = null;
  function updateProgramAtPlayhead(forceSrc){
    const vclip = getActiveClipAt(state.playhead);
    const aclip = getActiveAudioAt(state.playhead);

    const clearAll = () => {
      programVideo.pause(); programVideo.removeAttribute('src'); programVideo.load();
      programAudio.pause(); programAudio.removeAttribute('src'); programAudio.load();
      const pc = document.getElementById('programCanvas'); if (pc) pc.remove();
      currentProgClipId=null; currentProgKind=null;
    };

    if (!vclip && !aclip){ clearAll(); return; }

    if (vclip){
      const m = state.media.find(x=>x.id===vclip.mediaId); if (!m) return;
      const offset = state.playhead - vclip.start + (vclip.in||0);
      programAudio.pause();
      if (m.type==='image'){
        programVideo.pause(); programVideo.removeAttribute('src'); programVideo.load();
        let canvas = document.getElementById('programCanvas');
        if (!canvas){
          canvas = document.createElement('canvas'); canvas.id='programCanvas'; canvas.style.background='#000';
          document.querySelector('#programMon .screen').appendChild(canvas);
        }
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => { canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img,0,0); };
        if (forceSrc || currentProgClipId!==vclip.id || currentProgKind!=='image'){
          img.src = m.url; currentProgClipId=vclip.id; currentProgKind='image';
        }
        return;
      } else {
        const pc = document.getElementById('programCanvas'); if (pc) pc.remove();
        if (forceSrc || currentProgClipId!==vclip.id || currentProgKind!=='video'){
          programVideo.src = m.url; programVideo.currentTime = offset; currentProgClipId=vclip.id; currentProgKind='video'; if (state.playing) programVideo.play();
        } else {
          if (Math.abs(programVideo.currentTime - offset) > 0.08) { programVideo.currentTime = offset; }
          if (state.playing && programVideo.paused) programVideo.play();
        }
        return;
      }
    }

    if (aclip){
      const m = state.media.find(x=>x.id===aclip.mediaId); if (!m) return;
      const offset = state.playhead - aclip.start + (aclip.in||0);
      programVideo.pause(); programVideo.removeAttribute('src'); programVideo.load();
      const pc = document.getElementById('programCanvas'); if (pc) pc.remove();
      if (forceSrc || currentProgClipId!==aclip.id || currentProgKind!=='audio'){
        programAudio.src = m.url; programAudio.currentTime = offset; currentProgClipId=aclip.id; currentProgKind='audio'; if (state.playing) programAudio.play();
      } else {
        if (Math.abs(programAudio.currentTime - offset) > 0.08) { programAudio.currentTime = offset; }
        if (state.playing && programAudio.paused) programAudio.play();
      }
    }
  }

  // Transport
  scrub.addEventListener('input', ()=>{ state.playhead=parseFloat(scrub.value); updatePlayheadUI(); updateProgramAtPlayhead(true); });
  playBtn.addEventListener('click', togglePlay);
  stopBtn.addEventListener('click', stop);
  rewBtn.addEventListener('click', ()=>{ state.playhead=Math.max(0, state.playhead-5); updatePlayheadUI(); updateProgramAtPlayhead(true); });
  window.addEventListener('keydown', (e)=>{
    if (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
    if (e.key===' ') { e.preventDefault(); togglePlay(); }
  });

  fpsSel.addEventListener('change', ()=>{ state.fps=parseInt(fpsSel.value,10)||30; });

  return { updatePlayheadUI, updateProgramAtPlayhead, updateScrubRange, play, pause, togglePlay };
}
