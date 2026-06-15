import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { generateText, generateImage, generateVoiceover, uploadFile, splitScriptIntoScenes, shortenCaption } from "@/utils/aiClient";
import { assembleVideo, VIDEO_RATIOS } from "@/utils/videoAssembler";
import {
  Globe, Loader2, Sparkles, Monitor, Wand2, Play, Square, Download, Save,
  CheckCircle2, AlertTriangle, Mic, ExternalLink,
} from "lucide-react";

export default function DemoVideoMaker() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState(null);
  const [script, setScript] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("walkthrough"); // "walkthrough" | "recording"

  // Mode A — AI-narrated walkthrough
  const [ratio, setRatio] = useState("16:9");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [walkthroughResult, setWalkthroughResult] = useState(null);
  const [walkthroughSaved, setWalkthroughSaved] = useState(false);

  // Mode B — screen recording + AI voiceover
  const [voiceoverUrl, setVoiceoverUrl] = useState("");
  const [generatingVoiceover, setGeneratingVoiceover] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordingSaved, setRecordingSaved] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);
  const voiceoverBlobRef = useRef(null);
  const recordedBlobRef = useRef(null);
  const recorderRef = useRef(null);
  const displayStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioElRef = useRef(null);

  const resetResults = () => {
    setWalkthroughResult(null); setWalkthroughSaved(false);
    setVoiceoverUrl(""); voiceoverBlobRef.current = null;
    setRecordedUrl(""); recordedBlobRef.current = null; setRecordingSaved(false);
  };

  const analyze = async () => {
    if (!url.trim()) return;
    const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
    setScanning(true); setError(""); setScan(null); setScript(""); resetResults();
    try {
      const res = await base44.functions.invoke("scanWebsite", { url: cleanUrl });
      const data = res?.data || res;
      const analysis = data?.analysis || data;
      setScan(analysis);

      const prompt = `Write a short, engaging voiceover script (about 60-90 seconds when read aloud, plain prose, no scene labels, no markdown, no preamble) for a demo video introducing this website/product.\nURL: ${cleanUrl}\nBusiness summary: ${analysis?.business_summary || "N/A"}\nServices: ${(analysis?.services_found || []).join(", ") || "N/A"}\nKeywords: ${(analysis?.keywords_found || []).join(", ") || "N/A"}`;
      const generatedScript = await generateText({ type: "video_script", prompt, tone: analysis?.tone || "Professional" });
      setScript((generatedScript || "").trim());
    } catch (e) {
      setError(e?.message || "Scan failed.");
    }
    setScanning(false);
  };

  // ── Mode A: AI-narrated walkthrough (fully automated, no real screen capture) ──
  const generateWalkthrough = async () => {
    if (!script.trim()) { setError("Generate or write a script first."); return; }
    setError(""); setWalkthroughResult(null); setWalkthroughSaved(false); setGeneratingVideo(true); setProgress(0); setStatusMsg("");
    try {
      const sceneScripts = splitScriptIntoScenes(script, 5);
      const scenes = [];
      for (let i = 0; i < sceneScripts.length; i++) {
        setStatusMsg(`Generating scene ${i + 1} of ${sceneScripts.length}...`);
        setProgress((i / sceneScripts.length) * 0.5);
        const context = scan?.business_summary ? `Context: ${scan.business_summary}. ` : "";
        const imgUrl = await generateImage({ prompt: `${context}Create a clean, modern marketing visual representing: ${sceneScripts[i].text}` });
        scenes.push({ imageUrl: imgUrl, text: sceneScripts[i].text, caption: shortenCaption(sceneScripts[i].text) });
      }
      setStatusMsg("Generating voiceover...");
      const audio = await generateVoiceover(scenes.map(s => s.text).join(". "));
      setStatusMsg("Assembling video...");
      const { url: videoUrl, blob } = await assembleVideo({
        scenes, ratio, sceneSeconds: 4, audio,
        onProgress: (p) => setProgress(0.5 + p * 0.4),
      });
      setStatusMsg("Uploading...");
      const hostedUrl = await uploadFile(new File([blob], "demo-walkthrough.webm", { type: "video/webm" }));
      setProgress(1);
      setWalkthroughResult({ url: hostedUrl || videoUrl });
    } catch (e) {
      setError(e?.message || "Video generation failed.");
    }
    setGeneratingVideo(false); setStatusMsg("");
  };

  const saveWalkthrough = async () => {
    if (!walkthroughResult) return;
    try {
      await base44.entities.ContentAsset.create({
        type: "video", title: `Demo walkthrough — ${url}`, file_url: walkthroughResult.url, ai_generated: true, prompt_used: script.slice(0, 500),
      });
      qc.invalidateQueries(["media_library"]);
      setWalkthroughSaved(true);
    } catch (e) { setError(e?.message || "Save failed."); }
  };

  // ── Mode B: screen recording with synced AI voiceover ──
  const generateVoiceoverOnly = async () => {
    if (!script.trim()) { setError("Generate or write a script first."); return; }
    setError(""); setGeneratingVoiceover(true);
    try {
      const blob = await generateVoiceover(script);
      if (!blob) throw new Error("Voiceover generation is unavailable right now.");
      voiceoverBlobRef.current = blob;
      setVoiceoverUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e?.message || "Voiceover generation failed.");
    }
    setGeneratingVoiceover(false);
  };

  const startRecording = async () => {
    setError(""); setRecordedUrl(""); recordedBlobRef.current = null; setRecordingSaved(false);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen recording isn't supported in this browser. Try Chrome or Edge on desktop.");
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      displayStreamRef.current = displayStream;
      let combinedStream = displayStream;

      if (voiceoverBlobRef.current) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();
        const audioEl = new Audio(voiceoverUrl);
        audioElRef.current = audioEl;
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(dest);
        source.connect(audioCtx.destination); // also audible while recording
        combinedStream = new MediaStream([...displayStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        audioEl.play().catch(() => {});
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 6_000_000 });
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        recordedBlobRef.current = blob;
        setRecordedUrl(URL.createObjectURL(blob));
        audioElRef.current?.pause();
        try { audioCtxRef.current?.close(); } catch (_) { /* noop */ }
        setRecording(false);
      };
      // Stop automatically if the user ends the share from the browser's own UI.
      displayStream.getVideoTracks()[0].onended = () => stopRecording();

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      setError(e?.message || "Screen-share permission was denied or cancelled.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const saveRecording = async () => {
    if (!recordedBlobRef.current) return;
    setError(""); setSavingRecording(true);
    try {
      const hostedUrl = await uploadFile(new File([recordedBlobRef.current], "demo-recording.webm", { type: "video/webm" }));
      await base44.entities.ContentAsset.create({
        type: "video", title: `Demo recording — ${url}`, file_url: hostedUrl, ai_generated: false, prompt_used: script.slice(0, 500),
      });
      qc.invalidateQueries(["media_library"]);
      setRecordingSaved(true);
    } catch (e) { setError(e?.message || "Save failed."); }
    setSavingRecording(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2"><Monitor className="w-6 h-6 text-fuchsia-400" /> Demo Video Generator</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Turn any app, site, or product URL into a narrated demo video — automatically, or by recording your own screen with an AI voiceover.</p>
      </div>

      {/* URL + analyze */}
      <div className="bg-card border border-fuchsia-500/20 rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-3">1. Enter the URL</h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="yourapp.com or https://yourproduct.com"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={analyze} disabled={scanning || !url}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 shadow-lg">
            {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4" /> Analyze &amp; Write Script</>}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">We scan the page content and generate a voiceover script automatically — edit it below before generating your video.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {scan && (
        <>
          {/* Scan summary */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Globe className="w-4 h-4 text-fuchsia-400" /> {url.replace(/^https?:\/\//, "")}</h3>
            {scan.business_summary && <p className="text-sm text-foreground leading-relaxed">{scan.business_summary}</p>}
            {scan.services_found?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {scan.services_found.map(s => <span key={s} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">{s}</span>)}
              </div>
            )}
          </div>

          {/* Script */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <h3 className="font-semibold text-foreground">2. Voiceover Script</h3>
            <textarea value={script} onChange={e => setScript(e.target.value)} rows={6}
              placeholder="Voiceover script for the demo video..."
              className="w-full rounded-xl border border-input bg-background text-sm p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 max-w-lg">
            <button onClick={() => setMode("walkthrough")}
              className={`flex-1 p-4 rounded-xl border text-left transition-all ${mode === "walkthrough" ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-300" : "border-border text-muted-foreground hover:bg-muted/20"}`}>
              <Wand2 className="w-5 h-5 mb-1" />
              <div className="text-sm font-semibold">AI Walkthrough</div>
              <div className="text-xs opacity-70 mt-0.5">Fully automatic — AI generates scene visuals + voiceover, no manual steps.</div>
            </button>
            <button onClick={() => setMode("recording")}
              className={`flex-1 p-4 rounded-xl border text-left transition-all ${mode === "recording" ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-300" : "border-border text-muted-foreground hover:bg-muted/20"}`}>
              <Monitor className="w-5 h-5 mb-1" />
              <div className="text-sm font-semibold">Screen Recording</div>
              <div className="text-xs opacity-70 mt-0.5">Record your own screen showing the real site, narrated live by the AI voiceover.</div>
            </button>
          </div>

          {/* Mode A: AI Walkthrough */}
          {mode === "walkthrough" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground">3. Generate Walkthrough Video</h3>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Aspect Ratio</label>
                <div className="flex gap-2 flex-wrap">
                  {VIDEO_RATIOS.map(r => (
                    <button key={r} onClick={() => setRatio(r)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${ratio === r ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-400" : "border-border text-muted-foreground hover:bg-muted/20"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generateWalkthrough} disabled={generatingVideo}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-60 shadow-lg">
                {generatingVideo ? <><Loader2 className="w-4 h-4 animate-spin" /> {statusMsg || "Generating..."}</> : <><Wand2 className="w-4 h-4" /> Generate Video</>}
              </button>
              {generatingVideo && (
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
              {walkthroughResult && (
                <div className="space-y-3">
                  <video src={walkthroughResult.url} controls loop className="w-full rounded-xl border border-border bg-black" />
                  <div className="flex gap-2">
                    <a href={walkthroughResult.url} download target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/20">
                      <Download className="w-4 h-4" /> Download
                    </a>
                    <button onClick={saveWalkthrough} disabled={walkthroughSaved}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/50 text-fuchsia-400 text-sm font-semibold hover:bg-fuchsia-500/25 disabled:opacity-60">
                      {walkthroughSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save to Library</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode B: Screen Recording */}
          {mode === "recording" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground">3. Record Your Screen</h3>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Step 1 — generate the voiceover audio that will narrate your recording in real time.</p>
                <button onClick={generateVoiceoverOnly} disabled={generatingVoiceover}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/50 text-fuchsia-400 text-sm font-semibold hover:bg-fuchsia-500/25 disabled:opacity-60">
                  {generatingVoiceover ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Mic className="w-4 h-4" /> Generate Voiceover</>}
                </button>
                {voiceoverUrl && <audio src={voiceoverUrl} controls className="w-full mt-2" />}
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5"><ExternalLink className="w-4 h-4" /> Step 2 — open the site you want to demo</p>
                <p>Open <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="underline font-medium">{url}</a> in another tab or window, then come back here.</p>
                <p className="font-semibold pt-1">Step 3 — record</p>
                <p>Click <strong>Start Recording</strong>, then choose that tab/window in the screen-share picker. Recording starts immediately and plays the voiceover in sync — narrate live or let the AI voiceover guide you. Click <strong>Stop Recording</strong> when you're done.</p>
              </div>

              <div className="flex gap-2">
                {!recording ? (
                  <button onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 shadow-lg">
                    <Play className="w-4 h-4" /> Start Recording
                  </button>
                ) : (
                  <button onClick={stopRecording}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:opacity-90 shadow-lg animate-pulse">
                    <Square className="w-4 h-4" /> Stop Recording
                  </button>
                )}
              </div>

              {recordedUrl && (
                <div className="space-y-3">
                  <video src={recordedUrl} controls className="w-full rounded-xl border border-border bg-black" />
                  <div className="flex gap-2">
                    <a href={recordedUrl} download target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/20">
                      <Download className="w-4 h-4" /> Download
                    </a>
                    <button onClick={saveRecording} disabled={recordingSaved || savingRecording}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/50 text-fuchsia-400 text-sm font-semibold hover:bg-fuchsia-500/25 disabled:opacity-60">
                      {savingRecording ? <Loader2 className="w-4 h-4 animate-spin" /> : recordingSaved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save to Library</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
