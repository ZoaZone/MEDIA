/**
 * videoAssembler.js
 *
 * Real, client-side video generation. Takes a list of scenes (image URL +
 * caption text), optional background audio (voiceover Blob/URL), an aspect
 * ratio and per-scene duration, then renders an actual .webm video using
 * Canvas + MediaRecorder. No mocked sample-video URLs.
 *
 * Returns { url, blob } where `url` is an object URL the caller can preview
 * or download, and `blob` is the raw video for upload.
 */

const RATIOS = {
  "9:16": { w: 720, h: 1280 },
  "16:9": { w: 1280, h: 720 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Draw an image with object-fit: cover into the target rect.
function drawCover(ctx, img, W, H) {
  if (!img) {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const ir = img.width / img.height;
  const cr = W / H;
  let dw, dh, dx, dy;
  if (ir > cr) {
    dh = H; dw = H * ir; dx = (W - dw) / 2; dy = 0;
  } else {
    dw = W; dh = W / ir; dx = 0; dy = (H - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Word-wrap text to fit within maxWidth, returns array of lines.
function wrapText(ctx, text, maxWidth) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCaption(ctx, text, W, H, opts = {}) {
  if (!text) return;
  const { accent = "#e040fb", subtitleStyle = "bottom", maxLines = 3 } = opts;
  const fontSize = Math.round(W * 0.038);
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = W * 0.86;
  let lines = wrapText(ctx, text, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }
  const lineHeight = fontSize * 1.25;
  const blockH = lines.length * lineHeight;

  const centerX = W / 2;
  const baseY = subtitleStyle === "center" ? H / 2 - blockH / 2 : H - blockH - H * 0.08;

  // Scrim behind text for legibility
  const padY = fontSize * 0.6;
  const grad = ctx.createLinearGradient(0, baseY - padY, 0, baseY + blockH + padY);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  if (subtitleStyle !== "center") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, baseY - padY, W, blockH + padY * 2);
  }

  lines.forEach((ln, i) => {
    const y = baseY + i * lineHeight + lineHeight / 2;
    ctx.lineWidth = fontSize * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(ln, centerX, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(ln, centerX, y);
  });

  // Accent underline bar
  ctx.fillStyle = accent;
  ctx.fillRect(centerX - W * 0.06, baseY - padY * 0.6, W * 0.12, Math.max(3, fontSize * 0.06));
}

function drawLogo(ctx, logoImg, W, H) {
  if (!logoImg) return;
  const size = W * 0.16;
  const margin = W * 0.04;
  ctx.globalAlpha = 0.95;
  ctx.drawImage(logoImg, W - size - margin, margin, size, size * (logoImg.height / logoImg.width));
  ctx.globalAlpha = 1;
}

/**
 * Assemble a video.
 * @param {Object} cfg
 * @param {Array<{imageUrl?:string, text?:string, caption?:string}>} cfg.scenes
 *   `text` is used for narration; `caption` (if shorter) is what's drawn on screen
 * @param {string} [cfg.ratio="9:16"]
 * @param {number} [cfg.sceneSeconds=3]
 * @param {string} [cfg.accent="#e040fb"]
 * @param {string} [cfg.subtitleStyle="bottom"]  "bottom" | "center" | "none"
 * @param {string} [cfg.logoUrl]
 * @param {Blob|string} [cfg.audio]  voiceover Blob or URL
 * @param {string} [cfg.musicUrl]  background music URL, mixed under the voiceover
 * @param {(p:number)=>void} [cfg.onProgress]  0..1 progress callback
 * @returns {Promise<{url:string, blob:Blob}>}
 */
export async function assembleVideo(cfg = {}) {
  const {
    scenes = [],
    ratio = "9:16",
    sceneSeconds = 3,
    accent = "#e040fb",
    subtitleStyle = "bottom",
    logoUrl = "",
    audio = null,
    musicUrl = "",
    onProgress = () => {},
  } = cfg;

  if (!scenes.length) throw new Error("No scenes to render.");
  if (typeof window === "undefined" || !window.MediaRecorder) {
    throw new Error("Video rendering needs a browser with MediaRecorder support (use Chrome/Edge).");
  }

  const { w: W, h: H } = RATIOS[ratio] || RATIOS["9:16"];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Pre-load all imagery + logo
  const images = await Promise.all(scenes.map((s) => loadImage(s.imageUrl)));
  const logoImg = logoUrl ? await loadImage(logoUrl) : null;

  // Set up the recording stream (video + optional audio)
  const fps = 30;
  const stream = canvas.captureStream(fps);

  // Mix voiceover (`audio`) and background music (`musicUrl`) into one stream.
  // Music is ducked under the voiceover so narration stays intelligible.
  let audioEl = null;
  let musicEl = null;
  let audioCtx = null;
  if (audio || musicUrl) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      if (audio) {
        const audioUrl = audio instanceof Blob ? URL.createObjectURL(audio) : audio;
        audioEl = new Audio(audioUrl);
        audioEl.crossOrigin = "anonymous";
        const voiceGain = audioCtx.createGain();
        voiceGain.gain.value = 1.0;
        audioCtx.createMediaElementSource(audioEl).connect(voiceGain);
        voiceGain.connect(dest);
        voiceGain.connect(audioCtx.destination);
      }

      if (musicUrl) {
        musicEl = new Audio(musicUrl);
        musicEl.crossOrigin = "anonymous";
        musicEl.loop = true;
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = audio ? 0.25 : 0.6; // duck under voiceover when both present
        audioCtx.createMediaElementSource(musicEl).connect(musicGain);
        musicGain.connect(dest);
        musicGain.connect(audioCtx.destination);
      }

      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch (_e) {
      audioEl = null;
      musicEl = null; // continue silently
    }
  }

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start();
  if (audioEl) audioEl.play().catch(() => {});
  if (musicEl) musicEl.play().catch(() => {});

  const totalMs = scenes.length * sceneSeconds * 1000;
  const start = performance.now();

  await new Promise((resolve) => {
    function frame(now) {
      const elapsed = now - start;
      if (elapsed >= totalMs) return resolve();

      const sceneIdx = Math.min(scenes.length - 1, Math.floor(elapsed / (sceneSeconds * 1000)));
      const sceneElapsed = elapsed - sceneIdx * sceneSeconds * 1000;
      const sceneProg = sceneElapsed / (sceneSeconds * 1000);

      // Ken Burns-style slow zoom for life
      const zoom = 1 + 0.06 * sceneProg;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
      drawCover(ctx, images[sceneIdx], W, H);
      ctx.restore();

      // Fade between scenes
      const fade = 0.35;
      if (sceneProg < fade) {
        ctx.fillStyle = `rgba(0,0,0,${(1 - sceneProg / fade) * 0.6})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (subtitleStyle !== "none") {
        drawCaption(ctx, scenes[sceneIdx].caption || scenes[sceneIdx].text, W, H, { accent, subtitleStyle });
      }
      drawLogo(ctx, logoImg, W, H);

      onProgress(Math.min(0.99, elapsed / totalMs));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  recorder.stop();
  if (audioEl) { audioEl.pause(); }
  if (musicEl) { musicEl.pause(); }
  const blob = await done;
  try { audioCtx && audioCtx.close(); } catch (_e) {}
  onProgress(1);

  return { url: URL.createObjectURL(blob), blob };
}

export const VIDEO_RATIOS = Object.keys(RATIOS);
