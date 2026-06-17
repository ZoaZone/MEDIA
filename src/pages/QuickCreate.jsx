import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { generateText, generateImage, generateVoiceover, uploadFile, splitScriptIntoScenes, shortenCaption } from "@/utils/aiClient";
import { assembleVideo, VIDEO_RATIOS } from "@/utils/videoAssembler";
import { Wand2, Image as ImageIcon, Video, Loader2, Download, Save, CheckCircle2, AlertTriangle, Mic, Sparkles, Paperclip, X, RefreshCw } from "lucide-react";

// Pixel-dimension hints passed to the image generator per aspect ratio.
const RATIO_DIMENSIONS = { "1:1": "1024x1024", "16:9": "1792x1024", "9:16": "1024x1792", "4:5": "1024x1280" };

export default function QuickCreate() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [outputType, setOutputType] = useState("image"); // "image" | "video"
  const [ratio, setRatio] = useState("1:1");
  const [sceneCount, setSceneCount] = useState(4);
  const [voiceover, setVoiceover] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [result, setResult] = useState(null); // { type: "image"|"video", url }
  const [saved, setSaved] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ url, name }]
  const [uploadingFile, setUploadingFile] = useState(false);
  const [expandingPrompt, setExpandingPrompt] = useState(false);

  const expandPrompt = async () => {
    if (!prompt.trim()) { setError("Enter a brief description first."); return; }
    setExpandingPrompt(true);
    setError("");
    try {
      const expanded = await generateText({
        type: "caption",
        prompt: `Expand this brief into a detailed, vivid AI image/video generation prompt (2-3 sentences, no preamble, just the prompt): "${prompt}"`,
        tone: "Professional",
      });
      if (expanded) setPrompt(expanded.trim());
    } catch { setError("AI expansion failed."); }
    setExpandingPrompt(false);
  };

  const addAttachments = async (files) => {
    if (!files?.length) return;
    setUploadingFile(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        if (url) setAttachments(prev => [...prev, { url, name: file.name }]);
      }
    } catch (e) {
      setError(e?.message || "Attachment upload failed.");
    }
    setUploadingFile(false);
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const generate = async () => {
    if (!prompt.trim()) { setError("Describe what you'd like to create."); return; }
    setError(""); setUpgradeRequired(false); setResult(null); setSaved(false); setGenerating(true); setProgress(0); setStatusMsg("");
    const referenceImageUrls = attachments.map(a => a.url);
    try {
      if (outputType === "image") {
        setStatusMsg("Generating image...");
        const url = await generateImage({ prompt, dimensions: RATIO_DIMENSIONS[ratio] || "1024x1024", referenceImageUrls });
        if (!url) throw new Error("Image generation failed — try a different description.");
        setResult({ type: "image", url });
      } else {
        setStatusMsg("Writing video script...");
        const script = await generateText({
          type: "video_script",
          prompt: `Write a short, vivid visual video script (plain prose, no scene labels or markdown, no preamble) for a video about: ${prompt}`,
          tone: "Professional",
        });
        const sceneScripts = splitScriptIntoScenes(script || prompt, sceneCount);
        const scenes = [];
        for (let i = 0; i < sceneScripts.length; i++) {
          setStatusMsg(`Generating scene ${i + 1} of ${sceneScripts.length}...`);
          setProgress((i / sceneScripts.length) * 0.6);
          const imgUrl = await generateImage({ prompt: sceneScripts[i].imagePrompt || sceneScripts[i].text || prompt, referenceImageUrls });
          scenes.push({ imageUrl: imgUrl, text: sceneScripts[i].text, caption: voiceover ? "" : shortenCaption(sceneScripts[i].text) });
        }
        let audio = null;
        if (voiceover) {
          setStatusMsg("Generating voiceover...");
          audio = await generateVoiceover(scenes.map(s => s.text).join(". "));
        }
        setStatusMsg("Assembling video...");
        const { url, blob } = await assembleVideo({
          scenes, ratio, sceneSeconds: 5, audio,
          subtitleStyle: voiceover ? "none" : "bottom",
          onProgress: (p) => setProgress(0.6 + p * 0.3),
        });
        setStatusMsg("Uploading...");
        const hostedUrl = await uploadFile(new File([blob], "quick-create-video.webm", { type: "video/webm" }));
        setProgress(1);
        setResult({ type: "video", url: hostedUrl || url });
      }
    } catch (e) {
      setError(e?.message || "Generation failed.");
      if (e?.upgradeRequired) setUpgradeRequired(true);
    }
    setGenerating(false); setStatusMsg("");
  };

  const saveToLibrary = async () => {
    if (!result) return;
    try {
      await base44.entities.ContentAsset.create({
        type: result.type,
        title: prompt.slice(0, 60) || "Quick Create",
        file_url: result.url,
        ai_generated: true,
        prompt_used: prompt.slice(0, 500),
      });
      qc.invalidateQueries(["media_library"]);
      setSaved(true);
    } catch (e) {
      setError(e?.message || "Save failed.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2"><Wand2 className="w-6 h-6 text-fuchsia-400" /> Quick Create</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Generate a standalone image or video from a description — no brand, accounts, or script step required.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Config */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide">Describe what you want</label>
              <button onClick={expandPrompt} disabled={expandingPrompt || !prompt.trim()}
                className="flex items-center gap-1 text-xs text-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-40 transition-colors">
                {expandingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {expandingPrompt ? "Expanding…" : "✨ Expand with AI"}
              </button>
            </div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
              placeholder="Brief description → click '✨ Expand with AI' to get a detailed prompt, or write your own..."
              className="w-full rounded-xl border border-input bg-background text-sm p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Reference Images (optional)</label>
            <p className="text-xs text-muted-foreground mb-2">Attach photos of people, products, or a style you'd like the AI to match.</p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group">
                  <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                  <button onClick={() => removeAttachment(i)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted/20 transition-colors">
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingFile}
                  onChange={e => { addAttachments(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Output</label>
            <div className="flex gap-2">
              <button onClick={() => setOutputType("image")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${outputType === "image" ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-400" : "border-border text-muted-foreground hover:bg-muted/20"}`}>
                <ImageIcon className="w-4 h-4" /> Image
              </button>
              <button onClick={() => setOutputType("video")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${outputType === "video" ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-400" : "border-border text-muted-foreground hover:bg-muted/20"}`}>
                <Video className="w-4 h-4" /> Video
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Aspect Ratio</label>
            <div className="flex gap-2 flex-wrap">
              {(outputType === "video" ? VIDEO_RATIOS : Object.keys(RATIO_DIMENSIONS)).map(r => (
                <button key={r} onClick={() => setRatio(r)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${ratio === r ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-400" : "border-border text-muted-foreground hover:bg-muted/20"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {outputType === "video" && (
            <>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Scenes</label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setSceneCount(n)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${sceneCount === n ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-400" : "border-border text-muted-foreground hover:bg-muted/20"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setVoiceover(v => !v)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${voiceover ? "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300" : "border-border text-muted-foreground"}`}>
                <Mic className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-sm font-medium">AI Voiceover narration</span>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${voiceover ? "bg-fuchsia-500" : "bg-muted"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${voiceover ? "translate-x-4" : ""}`} />
                </div>
              </button>
            </>
          )}

          {error && !upgradeRequired && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {upgradeRequired && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/30 space-y-3">
              <div className="flex items-start gap-2 text-sm text-fuchsia-200">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-fuchsia-400" /> {error}
              </div>
              <Link to="/pricing"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-all">
                View Plans &amp; Pricing
              </Link>
            </div>
          )}

          <button onClick={generate} disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-60 shadow-lg">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> {statusMsg || "Generating..."}</> : <><Wand2 className="w-4 h-4" /> Generate</>}
          </button>
          {generating && outputType === "video" && (
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
        </div>

        {/* Result */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
          <h3 className="font-semibold text-foreground mb-3">Preview</h3>
          {!result && !generating && (
            <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground py-12">
              Your generated {outputType} will appear here.
            </div>
          )}
          {generating && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground py-12">
              <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
              {statusMsg}
            </div>
          )}
          {result && !generating && (
            <div className="space-y-4">
              {result.type === "image" ? (
                <img src={result.url} alt="" className="w-full rounded-xl border border-border" />
              ) : (
                <video src={result.url} controls loop className="w-full rounded-xl border border-border bg-black" />
              )}
              <div className="flex gap-2">
                <a href={result.url} download target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/20">
                  <Download className="w-4 h-4" /> Download
                </a>
                <button onClick={saveToLibrary} disabled={saved}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/50 text-fuchsia-400 text-sm font-semibold hover:bg-fuchsia-500/25 disabled:opacity-60">
                  {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save to Library</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
