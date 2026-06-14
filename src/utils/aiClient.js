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
 * Generate an AI image. Tries the Core integration first (used in
 * CampaignStudio), falls back to the generateImage backend function
 * (used in AdCreator) for compatibility.
 */
export async function generateImage({ prompt, platform = "General", dimensions = "1024x1024" }) {
  try {
    const res = await base44.integrations.Core.GenerateImage({ prompt });
    const url = res?.url ?? res?.data?.url ?? res?.file_url;
    if (url) return url;
  } catch (_e) {
    // fall through to function-based generation
  }
  try {
    const res = await base44.functions.invoke("generateImage", { prompt, platform, dimensions });
    return res?.data?.url ?? res?.url ?? res?.data?.file_url ?? res?.file_url ?? null;
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
    const res = await fetch("https://sreeagent.base44.app/functions/ttsStream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 2000), voice: "alloy" }),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (!buf?.byteLength) return null;
    return new Blob([buf], { type: "audio/mpeg" });
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
