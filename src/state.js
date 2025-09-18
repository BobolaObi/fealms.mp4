export const state = {
  media: [], // {id, name, type:'video'|'audio'|'image', url, duration, in:0, out:duration}
  clips: [], // {id, mediaId, name, track:'V1'|'A1'|..., start, dur, in, out, type}
  tracks: [
    { id: 'V1', kind: 'video' },
    { id: 'A1', kind: 'audio' },
  ],
  pxPerSec: 120,
  playhead: 0,
  fps: 30,
  playing: false,
  selectedClipId: null,
  snap: true,
};
