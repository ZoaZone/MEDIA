import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * generateVoiceover — server-side TTS proxy.
 *
 * The frontend previously called https://sreeagent.base44.app/functions/ttsStream
 * directly, but that backend function no longer exists (404 "not found or not
 * deployed"), so every voiceover request silently failed. This function takes
 * its place: it splits the input text into Google Translate TTS's ~200-char
 * chunks, fetches each chunk's MP3 audio server-side (avoiding the browser
 * CORS restrictions on translate.google.com), concatenates the bytes, and
 * returns the result as base64 so the client can rebuild a Blob.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_CHARS = 2000;
const CHUNK_CHARS = 180;

function chunkText(text: string, maxLen = CHUNK_CHARS): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const pieces = sentence.length > maxLen ? sentence.split(/\s+/) : [sentence];
    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (candidate.length > maxLen && current) {
        chunks.push(current.trim());
        current = piece;
      } else {
        current = candidate;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

    const { text, lang } = await req.json().catch(() => ({}));
    if (!text?.trim()) return Response.json({ error: 'text is required' }, { status: 400, headers: CORS });

    const chunks = chunkText(text.trim().slice(0, MAX_CHARS));
    if (!chunks.length) return Response.json({ error: 'No speakable text.' }, { status: 400, headers: CORS });

    const parts: Uint8Array[] = [];
    for (const chunk of chunks) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang || 'en')}&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(ttsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
      });
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength) parts.push(buf);
    }

    if (!parts.length) {
      return Response.json({ error: 'Voiceover generation is unavailable right now.' }, { status: 502, headers: CORS });
    }

    const total = parts.reduce((n, p) => n + p.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) { merged.set(p, offset); offset += p.byteLength; }

    return Response.json(
      { success: true, audio_base64: toBase64(merged), mime: 'audio/mpeg' },
      { headers: CORS }
    );
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500, headers: CORS });
  }
});
