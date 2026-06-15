import { base44 } from "@/api/base44Client";

/**
 * Generate marketing/script text via the platform's AI content engine.
 * Mirrors the call pattern already used in AdCreator, SocialHub, WebsiteScanner.
 */
export async function generateText({ type = "caption", prompt, platform = "General", tone = "Professional" }) {
  const res = await base44.functions.invoke("generateMediaContent", { type, prompt, platform, tone });
  const raw = res?.data?.text ?? res?.text ?? res?.data?.content ?? res?.content ?? "";
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
