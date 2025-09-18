// Lightweight wrapper around ffmpeg.wasm UMD loaded in index.html
// Falls back to returning null if ffmpeg is unavailable

let ffmpegInstance = null;

async function ensureFFmpeg() {
  const g = window;
  if (!g || !g.FFmpeg) return null;
  if (ffmpegInstance) return ffmpegInstance;
  const { createFFmpeg, fetchFile } = g.FFmpeg;
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();
  ffmpegInstance = { ffmpeg, fetchFile };
  return ffmpegInstance;
}

export async function transcodeToWebM(file, onProgress){
  const inst = await ensureFFmpeg();
  if (!inst) return null;
  const { ffmpeg, fetchFile } = inst;
  try{
    const inputName = `input_${Date.now()}.${(file.name.split('.').pop()||'dat')}`;
    const outputName = `output_${Date.now()}.webm`;
    ffmpeg.FS('writeFile', inputName, await fetchFile(file));
    // Try VP9 + Opus for broad browser support
    // -pix_fmt yuv420p ensures compatibility
    await ffmpeg.run('-i', inputName, '-c:v', 'libvpx-vp9', '-b:v', '1M', '-pix_fmt', 'yuv420p', '-c:a', 'libopus', outputName);
    const data = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([data.buffer], { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    // cleanup
    try{ ffmpeg.FS('unlink', inputName); ffmpeg.FS('unlink', outputName); }catch{}
    return { url, blob, mime: 'video/webm', name: file.name.replace(/\.[^.]+$/, '') + '.webm' };
  }catch(e){
    console.error('ffmpeg transcode failed', e);
    return null;
  }
}

export async function maybeTranscodeIfUnsupported(file){
  // Heuristic: if browser cannot play mime OR we fail to probe metadata later, we can transcode
  const type = file.type || '';
  const vt = document.createElement('video');
  const at = document.createElement('audio');
  const looksVideo = type.startsWith('video');
  const looksAudio = type.startsWith('audio');
  const canVideo = looksVideo ? (vt.canPlayType(type) || '') : '';
  const canAudio = looksAudio ? (at.canPlayType(type) || '') : '';
  if ((looksVideo && !canVideo) || (looksAudio && !canAudio)){
    return await transcodeToWebM(file);
  }
  return null; // supported as-is
}

