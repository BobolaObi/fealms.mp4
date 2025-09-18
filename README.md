# fealms.mp4 — Browser Video Editor

A minimal, in‑browser non‑linear editor prototype. Import media, drag to the timeline, trim and play.

- No install. Open `index.html` in a modern browser.
- Works with browser‑supported formats (MP4/H.264/AAC, WebM/VP9/Opus, etc.).
- Optional fallback: ffmpeg.wasm transcodes incompatible files to WebM in the browser.

## Features
- Project panel with drag‑and‑drop import
- 1 video track (V1) + 1 audio track (A1)
- Drag/move clips, trim with handles, ripple trim (Q/W), duplicate with Alt+drag, delete
- Viewer: video playback, image display, audio-only playback
- Ruler + zoom + snap; FPS selector
- Save/Open project (JSON; object URLs won’t persist across sessions)
- In-app cheat sheet overlay (`?` or toolbar button)

## Transcoding fallback (ffmpeg.wasm)
If a file won’t play (e.g., `video/quicktime` MOV in Chrome), the app attempts to transcode it to WebM (VP9/Opus) in the browser using `@ffmpeg/ffmpeg`.

Notes:
- Transcoding is CPU‑heavy and happens locally in your browser. Large files may take time and require memory.
- The resulting media is held in memory as a Blob URL for this session only.

## Keyboard shortcuts
- Ctrl/Cmd+I: Import media
- Space: Play/Pause
- ←/→: Move playhead 1 frame (hold Shift for 5 frames)
- Alt+←/→: Nudge selected clip (hold Shift for 1s)
- Q / W: Ripple trim to/from playhead
- Ctrl/Cmd+K or S: Split at playhead
- Alt+Drag clip: Duplicate clip
- Delete: Remove selected clip
- +/−: Zoom in/out
- ?: Toggle cheat sheet overlay

## Development
- Static site, no build needed. Open `index.html`.
- Source is split into modules in `src/`.

Limitations
- Browser format support applies. For universal playback, enable/keep the ffmpeg.wasm fallback.
- Saved projects store object URLs; you’ll need to re‑import sources on reload.

License: MIT (or your choice)
