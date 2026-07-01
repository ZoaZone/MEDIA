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

import { proxyImageAsObjectUrl } from "./aiClient";

const RATIOS = {
  "9:16": { w: 720, h: 1280 },
  "16:9": { w: 1280, h: 720 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

function loadImageOnce(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

// Load an image for canvas drawing. Cross-origin sources without
// Access-Control-Allow-Origin fail to load under crossOrigin="anonymous" —
// which is required so MediaRecorder can capture the canvas — and would
// otherwise render as a black scene or a missing logo. On failure, retry
// once via the proxyImage backend function, which fetches the bytes
// server-side (no browser CORS involved) and hands back a same-origin
// blob: URL.
/**
 * @param {string} src
 * @param {{ onWarning?: (message: string) => void, label?: string }} [opts]
 */
async function loadImage(src, { onWarning, label = "Image" } = {}) {
  if (!src) return null;
  try {
    return await loadImageOnce(src);
  } catch (_e) {
    const proxied = await proxyImageAsObjectUrl(src);
    if (proxied) {
      try {
        return await loadImageOnce(proxied);
      } catch (_e2) {
        // fall through to the warning below
      }
    }
    onWarning?.(`${label} failed to load and was skipped (it may be blocked by CORS, or the URL is unreachable): ${src}`);
    return null;
  }
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

// Break a single line that's wider than maxWidth on its own (e.g. a long
// word or URL with no spaces) into width-fitting pieces.
function breakLongLine(ctx, line, maxWidth) {
  const pieces = [];
  while (ctx.measureText(line).width > maxWidth && line.length > 1) {
    let cut = line.length;
    while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
    pieces.push(line.slice(0, cut));
    line = line.slice(cut);
  }
  if (line) pieces.push(line);
  return pieces;
}

// Word-wrap text to fit within maxWidth, returns array of lines. Words wider
// than maxWidth on their own (long words/URLs) are hard-broken instead of
// being left to overflow past the frame edge.
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
    if (ctx.measureText(line).width > maxWidth) {
      const broken = breakLongLine(ctx, line, maxWidth);
      lines.push(...broken.slice(0, -1));
      line = broken[broken.length - 1] || "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCaption(ctx, text, W, H, opts = {}) {
  if (!text) return;
  const { accent = "#e040fb", subtitleStyle = "bottom", maxLines: maxLinesOverride, fontFamily = "Arial" } = opts;

  const maxWidth = W * 0.86;
  const bottomMargin = H * 0.08;

  let fontSize = Math.round(W * 0.038);
  let lineHeight = fontSize * 1.25;
  let maxLines = maxLinesOverride || 3;

  // For the default "bottom" placement, cap the font size and line count so
  // the caption block (text + its legibility scrim) can never cross into the
  // middle third of the frame, no matter how long the source text is. Fixed
  // aspect ratios (e.g. 16:9, where H is short relative to W) would otherwise
  // let a full 3-line caption spill above the lower third. "center" placement
  // is an intentional mid-frame style and isn't constrained by this.
  if (subtitleStyle !== "center") {
    const availH = H / 3 - bottomMargin;
    while (fontSize > 14 && lineHeight + fontSize * 1.2 > availH) {
      fontSize -= 2;
      lineHeight = fontSize * 1.25;
    }
    const linesThatFit = Math.max(1, Math.floor(availH / lineHeight));
    maxLines = Math.max(1, Math.min(linesThatFit, maxLinesOverride || 3));
  }

  ctx.font = `700 ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let lines = wrapText(ctx, text, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    // Drop whole trailing words first so truncation never slices a word in
    // half; only fall back to a character-level cut for a single word that
    // still doesn't fit on its own (e.g. one very long word/URL).
    const words = last.split(" ");
    while (words.length > 1 && ctx.measureText(`${words.join(" ")}…`).width > maxWidth) {
      words.pop();
    }
    last = words.join(" ");
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }
  const blockH = lines.length * lineHeight;

  const centerX = W / 2;
  let baseY = subtitleStyle === "center" ? H / 2 - blockH / 2 : H - blockH - bottomMargin;

  const padY = fontSize * 0.6;
  // Hard safety clamp: even after the sizing above, never let the scrim
  // cross into the middle third for the default bottom placement.
  if (subtitleStyle !== "center") {
    baseY = Math.max(baseY, (H * 2) / 3 + padY);
  }

  // Scrim behind text for legibility
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
 * @param {number} [cfg.sceneSeconds=3]  fallback per-scene duration, used when `sceneDurations` isn't provided
 * @param {number[]} [cfg.sceneDurations]  per-scene duration in seconds (one entry per scene); overrides `sceneSeconds`
 * @param {string} [cfg.accent="#e040fb"]
 * @param {string} [cfg.subtitleStyle="bottom"]  "bottom" | "center" | "none"
 * @param {string} [cfg.fontFamily="Arial"]  brand font used for on-screen captions
 * @param {string} [cfg.logoUrl]
 * @param {Blob|string} [cfg.audio]  voiceover Blob or URL
 * @param {string} [cfg.musicUrl]  background music URL, mixed under the voiceover
 * @param {(p:number)=>void} [cfg.onProgress]  0..1 progress callback
 * @param {(message:string)=>void} [cfg.onWarning]  called (possibly more than once) for
 *   non-fatal problems — an image/logo that failed to load, or audio that failed to play —
 *   so callers can surface them instead of the video silently rendering with a gap
 * @returns {Promise<{url:string, blob:Blob}>}
 */
export async function assembleVideo(cfg = {}) {
  const {
    scenes = [],
    ratio = "9:16",
    sceneSeconds = 3,
    sceneDurations = null,
    accent = "#e040fb",
    subtitleStyle = "bottom",
    fontFamily = "Arial",
    logoUrl = "",
    audio = null,
    musicUrl = "",
    onProgress = () => {},
    onWarning = () => {},
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
  const images = await Promise.all(
    scenes.map((s, i) => loadImage(s.imageUrl, { onWarning, label: `Scene ${i + 1} image` }))
  );
  const logoImg = logoUrl ? await loadImage(logoUrl, { onWarning, label: "Logo" }) : null;

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
      musicEl = null;
      onWarning("Audio setup failed — this video will render without sound.");
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
  if (audioEl) audioEl.play().catch(() => onWarning("Voiceover audio failed to start playing (the browser may have blocked autoplay) — this video may render without narration."));
  if (musicEl) musicEl.play().catch(() => onWarning("Background music failed to start playing (the browser may have blocked autoplay) — this video may render without music."));

  // Per-scene durations: use `sceneDurations` (one entry per scene) if provided,
  // otherwise fall back to a uniform `sceneSeconds` for every scene.
  const durationsMs = (Array.isArray(sceneDurations) && sceneDurations.length === scenes.length)
    ? sceneDurations.map((d) => Math.max(0.5, Number(d) || sceneSeconds) * 1000)
    : scenes.map(() => sceneSeconds * 1000);
  const cumMs = durationsMs.reduce((acc, d, i) => { acc.push((acc[i - 1] || 0) + d); return acc; }, []);
  const totalMs = cumMs[cumMs.length - 1];
  const start = performance.now();

  await new Promise((resolve) => {
    function frame(now) {
      const elapsed = now - start;
      if (elapsed >= totalMs) return resolve();

      let sceneIdx = cumMs.findIndex((c) => elapsed < c);
      if (sceneIdx === -1) sceneIdx = scenes.length - 1;
      const sceneStartMs = sceneIdx > 0 ? cumMs[sceneIdx - 1] : 0;
      const sceneDurMs = durationsMs[sceneIdx];
      const sceneElapsed = elapsed - sceneStartMs;
      const sceneProg = sceneElapsed / sceneDurMs;

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
        drawCaption(ctx, scenes[sceneIdx].caption || scenes[sceneIdx].text, W, H, { accent, subtitleStyle, fontFamily });
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

/**
 * Overlay a brand logo (top-right corner) onto a generated image and return
 * a new PNG Blob. Returns null if either image fails to load, or if the
 * canvas can't be exported (e.g. a cross-origin source without CORS
 * headers) — callers should fall back to the original, un-branded image.
 */
export async function compositeLogo(imageUrl, logoUrl) {
  if (!imageUrl || !logoUrl) return null;
  const [img, logoImg] = await Promise.all([loadImage(imageUrl), loadImage(logoUrl)]);
  if (!img || !logoImg) return null;

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  drawLogo(ctx, logoImg, canvas.width, canvas.height);

  try {
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
    });
  } catch (_e) {
    return null;
  }
}

export const VIDEO_RATIOS = Object.keys(RATIOS);
