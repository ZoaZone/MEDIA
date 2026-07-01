import { base44 } from "@/api/base44Client";

// Short-lived cache for the account-wide "preferred platform model" setting
// (Settings > AI Provider), so generateText() doesn't fetch the user record
// on every single call. Refreshed at most once per PLATFORM_MODEL_CACHE_MS.
let platformModelCache = { value: "", fetchedAt: 0 };
const PLATFORM_MODEL_CACHE_MS = 30_000;

async function getDefaultPlatformModel() {
  if (Date.now() - platformModelCache.fetchedAt < PLATFORM_MODEL_CACHE_MS) {
    return platformModelCache.value;
  }
  try {
    const user = await base44.auth.me();
    const value = user?.settings?.api_keys?.platform_model || "";
    platformModelCache = { value, fetchedAt: Date.now() };
    return value;
  } catch (_e) {
    return platformModelCache.value;
  }
}

/**
 * Generate marketing/script text via the platform's AI content engine.
 * Mirrors the call pattern already used in AdCreator, SocialHub, WebsiteScanner.
 *
 * `model` optionally overrides the account-wide default (Settings > AI
 * Provider > Preferred platform model) for this one call — e.g. a
 * per-generation picker. If omitted, the account-wide default is used
 * automatically. Only applies on the platform-default generation path; a
 * configured "bring your own LLM" key takes priority over both.
 *
 * `onModelFallback`, if provided, is called (no args) when the requested
 * model wasn't available and the backend silently fell back to the
 * platform's own default model, so the caller can surface a notice instead
 * of leaving the user unaware their chosen model wasn't actually used.
 */
export async function generateText({ type = "caption", prompt, platform = "General", tone = "Professional", model, onModelFallback }) {
  const chosenModel = model || (await getDefaultPlatformModel());
  const res = await base44.functions.invoke("generateMediaContent", {
    type, prompt, platform, tone,
    model: chosenModel || undefined,
  });
  const data = res?.data ?? res;
  if (chosenModel && data?.model_fallback) onModelFallback?.();
  const raw = data?.text ?? data?.content ?? "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

/**
 * Generate an AI image via the generateImage backend function, which also
 * enforces the free-trial generation limit and logs the result to the
 * Media Library. Falls back to the Core integration (no trial gating, no
 * library record) if the backend function itself is unreachable.
 *
 * Throws an Error with `.upgradeRequired = true` when the caller's free
 * trial is exhausted and they have no purchased credits — UI callers should
 * catch this and show a "Subscribe to continue" CTA linking to /pricing.
 *
 * `referenceImageUrls` (optional) lets the caller attach one or more uploaded
 * images so the model replicates the people/style/likeness from them.
 */
export async function generateImage({ prompt, platform = "General", dimensions = "1024x1024", referenceImageUrls = [] }) {
  try {
    const res = await base44.functions.invoke("generateImage", { prompt, platform, dimensions, reference_image_urls: referenceImageUrls });
    const data = res?.data ?? res;
    const url = data?.url ?? data?.file_url;
    if (url) return url;
  } catch (e) {
    const data = e?.response?.data;
    if (data?.error === "trial_limit_reached") {
      const err = new Error(data?.message || "Free trial limit reached. Subscribe to continue generating.");
      err.upgradeRequired = true;
      throw err;
    }
    // fall through to Core integration fallback
  }
  try {
    const res = await base44.integrations.Core.GenerateImage({ prompt, existing_image_urls: referenceImageUrls?.length ? referenceImageUrls : undefined });
    return res?.url ?? res?.data?.url ?? res?.file_url ?? null;
  } catch (_e) {
    return null;
  }
}

/** Upload a File/Blob and get back a persistent, shareable URL. */
export async function uploadFile(file) {
  const res = await base44.integrations.Core.UploadFile({ file });
  return res?.file_url ?? res?.url ?? (typeof res === "string" ? res : "");
}

/**
 * Fetch an image URL server-side (via the proxyImage function) and return a
 * same-origin blob: URL for it. Used as a fallback when a cross-origin image
 * fails to load in the browser with crossOrigin="anonymous" — usually
 * because the hosting server doesn't send Access-Control-Allow-Origin, which
 * the canvas/MediaRecorder pipeline in videoAssembler.js requires. Returns
 * null if the proxy is unavailable or the fetch fails.
 */
export async function proxyImageAsObjectUrl(url) {
  if (!url) return null;
  try {
    const res = await base44.functions.invoke("proxyImage", { url });
    const data = res?.data ?? res;
    const b64 = data?.data_base64;
    if (!b64) return null;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: data?.mime || "image/png" }));
  } catch (_e) {
    return null;
  }
}

/**
 * Generate a short AI voiceover for a block of text. Returns an audio Blob,
 * or null if voiceover generation isn't available — callers should treat
 * null as "render silently", not as a hard error.
 */
export async function generateVoiceover(text) {
  if (!text?.trim()) return null;
  try {
    const res = await base44.functions.invoke("generateVoiceover", { text: text.slice(0, 2000) });
    const data = res?.data ?? res;
    const b64 = data?.audio_base64;
    if (!b64) return null;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: data?.mime || "audio/mpeg" });
  } catch (_e) {
    return null;
  }
}

/**
 * Shorten a scene's narration text down to a short on-screen caption
 * (a subtitle, not a paragraph) so it doesn't cover the frame.
 */
export function shortenCaption(text, maxWords = 12) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * Split an AI-written video script into `sceneCount` scenes, each with
 * narration/caption text and a derived image prompt. Handles structured
 * "SCENE 1: ..." output as well as plain paragraphs.
 */
export function splitScriptIntoScenes(script, sceneCount = 4) {
  const text = (script || "").trim();
  if (!text) {
    return Array.from({ length: sceneCount }, (_, i) => ({ text: `Scene ${i + 1}`, imagePrompt: "" }));
  }

  // Prefer structured "SCENE n:" / "Shot n -" markers
  const sceneMatches = [...text.matchAll(/(?:^|\n)\s*(?:scene|shot)\s*\d+\s*[:\-]?\s*/gi)];
  let chunks;
  if (sceneMatches.length >= 2) {
    chunks = text.split(/(?:^|\n)\s*(?:scene|shot)\s*\d+\s*[:\-]?\s*/gi).filter((c) => c.trim());
  } else {
    // Fall back to splitting sentences into roughly equal groups
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const perChunk = Math.max(1, Math.ceil(sentences.length / sceneCount));
    chunks = [];
    for (let i = 0; i < sentences.length; i += perChunk) {
      chunks.push(sentences.slice(i, i + perChunk).join(" "));
    }
  }

  while (chunks.length < sceneCount) chunks.push(chunks[chunks.length - 1] || text);
  chunks = chunks.slice(0, sceneCount);

  return chunks.map((c) => {
    const clean = c.trim().replace(/\s+/g, " ");
    return { text: clean, imagePrompt: clean };
  });
}
