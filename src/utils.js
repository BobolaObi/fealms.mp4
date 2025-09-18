export const uid = () => Math.random().toString(36).slice(2, 9);
export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
export const fmtTC = (sec, fps) => {
  const total = Math.max(0, sec || 0);
  const h = Math.floor(total/3600);
  const m = Math.floor(total%3600/60);
  const s = Math.floor(total%60);
  const f = Math.floor((total - Math.floor(total)) * (fps||30));
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
}
export const snapTime = (state, t) => state.snap ? Math.round(t*20)/20 : t; // 1/20s
export const projectLength = (state) => state.clips.reduce((m,c)=>Math.max(m, c.start + c.dur), 0);

