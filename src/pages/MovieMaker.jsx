import { useState, useRef } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { mine } from "@/utils/scope";
import {
  Film, Sparkles, Lock, Plus, Trash2, Loader2, ChevronRight,
  ChevronLeft, Mic, Music, Globe, Upload, Check, AlertCircle,
  X, Download, Save, Wand2, Languages, Image as ImageIcon,
  Type, Play, Volume2,
} from "lucide-react";
import { generateText, generateVoiceover, uploadFile, generateImage, splitScriptIntoScenes } from "@/utils/aiClient";
import { assembleVideo } from "@/utils/videoAssembler";

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Hindi", "Arabic",
  "Japanese", "Korean", "Chinese (Mandarin)", "Italian", "Russian", "Tamil",
  "Telugu", "Bengali", "Turkish", "Dutch", "Polish", "Vietnamese", "Thai",
];

const GENRES = ["Drama", "Documentary", "Comedy", "Action", "Romance", "Horror", "Thriller", "Animation", "Educational", "Corporate"];

const STEPS = [
  { id: "story",    label: "Script",   icon: Wand2 },
  { id: "scenes",   label: "Scenes",   icon: Film },
  { id: "voiceover",label: "Voiceover",icon: Mic },
  { id: "music",    label: "Music",    icon: Music },
  { id: "export",   label: "Export",   icon: Download },
  { id: "dubbing",  label: "Dubbing",  icon: Languages },
];

const DUBBING_STEPS = ["upload", "script", "translate", "preview", "download"];

function newScene(n) {
  return { id: Date.now() + n, text: "", imageUrl: "", voiceBlob: null, voiceUrl: "", duration: 7 };
}

// Strip markdown/symbols before TTS
function toSpeakable(text) {
  return (text || "")
    .replace(/\*\*/g, "").replace(/\*/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^\s*[-•]\s/gm, "")
    .replace(/`[^`]*`/g, "")
    .trim();
}

export default function MovieMaker() {
  const { userTier, isAdmin } = useOutletContext();
  const musicInputRef = useRef();
  const dubVideoRef = useRef();
  const fileInputRefs = useRef({});

  // Core state
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [titleCard, setTitleCard] = useState(true);
  const [genre, setGenre] = useState("Drama");
  const [storyPrompt, setStoryPrompt] = useState("");
  const [script, setScript] = useState("");
  const [scenes, setScenes] = useState([newScene(0), newScene(1), newScene(2)]);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicFile, setMusicFile] = useState(null);
  const [language, setLanguage] = useState("English");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState({});
  const [imgLoading, setImgLoading] = useState({});
  const [uploadLoading, setUploadLoading] = useState({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);

  // Dubbing studio state
  const [dubStep, setDubStep] = useState(0);
  const [dubVideoFile, setDubVideoFile] = useState(null);
  const [dubVideoUrl, setDubVideoUrl] = useState("");
  const [dubOriginalScript, setDubOriginalScript] = useState("");
  const [dubSourceLang, setDubSourceLang] = useState("English");
  const [dubTargetLang, setDubTargetLang] = useState("Spanish");
  const [dubWithCaptions, setDubWithCaptions] = useState(true);
  const [dubCaptionLang, setDubCaptionLang] = useState("English");
  const [dubTranslatedScript, setDubTranslatedScript] = useState("");
  const [dubAudioBlob, setDubAudioBlob] = useState(null);
  const [dubAudioUrl, setDubAudioUrl] = useState("");
  const [dubLoading, setDubLoading] = useState(false);

  if (userTier < 4 && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Movie Maker</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Create multi-scene films with AI script, voiceover, music timeline, language dubbing — exclusive to Enterprise.
          </p>
          <Link to="/billing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity">
            <Sparkles className="w-4 h-4" /> Upgrade to Enterprise
          </Link>
        </div>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────

  const generateScript = async () => {
    if (!storyPrompt.trim()) return setError("Enter a story idea first.");
    setLoading(true); setError("");
    try {
      const result = await generateText({
        type: "video_script",
        prompt: `Write a ${genre.toLowerCase()} film script in ${language}. Create ${scenes.length} clearly-separated scenes, each 2-3 sentences of narration/dialogue. No markdown, no asterisks, no headers — plain prose only. Label each scene as "SCENE 1:", "SCENE 2:" etc. Title: "${title || "Untitled"}". Story: ${storyPrompt}`,
        tone: "Cinematic",
      });
      setScript(result);
      const parsed = splitScriptIntoScenes(result, scenes.length);
      setScenes(prev => prev.map((s, i) => ({ ...s, text: parsed[i]?.text || s.text })));
    } catch (e) { setError(e?.message || "Script generation failed."); }
    setLoading(false);
  };

  const addScene = () => setScenes(prev => [...prev, newScene(prev.length)]);
  const removeScene = (id) => setScenes(prev => prev.filter(s => s.id !== id));
  const updateScene = (id, patch) => setScenes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const generateSceneImage = async (scene, useReferenceFromFirst = true) => {
    if (!scene.text.trim()) return setError("Add dialogue/description to this scene first.");
    setImgLoading(p => ({ ...p, [scene.id]: true }));
    setError("");
    try {
      const refSceneImage = useReferenceFromFirst ? scenes.find(s => s.imageUrl)?.imageUrl : undefined;
      const url = await generateImage({
        prompt: `Cinematic film frame. ${genre} genre. ${scene.text}`,
        dimensions: "1792x1024",
        referenceImageUrls: refSceneImage ? [refSceneImage] : [],
      });
      if (url) updateScene(scene.id, { imageUrl: url });
      else setError("Image generation failed.");
    } catch (e) { setError(e?.message || "Image generation failed."); }
    setImgLoading(p => ({ ...p, [scene.id]: false }));
  };

  const generateAllImages = async () => {
    setError("");
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      if (!s.text.trim() || s.imageUrl) continue;
      setImgLoading(p => ({ ...p, [s.id]: true }));
      try {
        const refImage = i > 0 ? scenes.find(sc => sc.imageUrl)?.imageUrl : undefined;
        const url = await generateImage({
          prompt: `Cinematic film frame. ${genre} genre. ${s.text}`,
          dimensions: "1792x1024",
          referenceImageUrls: refImage ? [refImage] : [],
        });
        if (url) updateScene(s.id, { imageUrl: url });
      } catch { /* continue */ }
      setImgLoading(p => ({ ...p, [s.id]: false }));
    }
  };

  const handleSceneFileUpload = async (scene, file) => {
    if (!file) return;
    setUploadLoading(p => ({ ...p, [scene.id]: true }));
    try {
      const url = await uploadFile(file);
      updateScene(scene.id, { imageUrl: url });
    } catch { setError("Upload failed."); }
    setUploadLoading(p => ({ ...p, [scene.id]: false }));
  };

  const generateSceneVoiceover = async (scene) => {
    if (!scene.text.trim()) return setError("Add dialogue text first.");
    setVoiceLoading(p => ({ ...p, [scene.id]: true })); setError("");
    try {
      const blob = await generateVoiceover(toSpeakable(scene.text));
      if (blob) {
        const url = URL.createObjectURL(blob);
        updateScene(scene.id, { voiceBlob: blob, voiceUrl: url });
      } else setError("Voiceover unavailable.");
    } catch (e) { setError(e?.message || "Voiceover failed."); }
    setVoiceLoading(p => ({ ...p, [scene.id]: false }));
  };

  const generateAllVoiceovers = async () => {
    setError("");
    for (const s of scenes) {
      if (!s.text.trim() || s.voiceUrl) continue;
      await generateSceneVoiceover(s);
    }
  };

  const handleMusicUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    try { const url = await uploadFile(file); setMusicUrl(url); setMusicFile(file); }
    catch { setError("Music upload failed."); }
    setLoading(false);
  };

  const assembleMovie = async () => {
    const imageScenes = scenes.filter(s => s.imageUrl);
    if (!imageScenes.length) return setError("Add at least one image to a scene before assembling.");
    setLoading(true); setError(""); setProgress(0);

    try {
      // Combine all scene texts into one voiceover narration
      const allText = imageScenes.map(s => toSpeakable(s.text)).filter(Boolean).join(". ");
      let audio = null;
      if (allText) {
        setProgress(0.1);
        audio = await generateVoiceover(allText.slice(0, 3000));
      }

      // Build title-card intro scene if requested
      const scenesWithTitle = titleCard && title
        ? [{ imageUrl: imageScenes[0]?.imageUrl, text: title, caption: "" }, ...imageScenes.map(s => ({ imageUrl: s.imageUrl, text: "", caption: "" }))]
        : imageScenes.map(s => ({ imageUrl: s.imageUrl, text: "", caption: "" }));

      setProgress(0.3);
      const result = await assembleVideo({
        scenes: scenesWithTitle,
        audio: audio || undefined,
        musicUrl: musicUrl || undefined,
        sceneDurations: titleCard && title
          ? [4, ...imageScenes.map(s => Math.max(5, s.duration))]
          : imageScenes.map(s => Math.max(5, s.duration)),
        subtitleStyle: "none",
        ratio: "16:9",
        onProgress: p => setProgress(0.3 + p * 0.65),
      });
      if (result?.url) setVideoUrl(result.url);
      else setError("Assembly failed.");
    } catch (e) { setError(e?.message || "Video assembly failed."); }
    setLoading(false); setProgress(0);
  };

  const handleSaveToLibrary = async () => {
    if (!videoUrl) return;
    setLoading(true);
    try {
      await base44.entities.ContentAsset.create({
        ...mine(), title: title || `Movie — ${new Date().toLocaleDateString()}`,
        type: "video", file_url: videoUrl, ai_generated: true, prompt_used: storyPrompt, status: "ready",
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError("Save failed."); }
    setLoading(false);
  };

  // ── Dubbing Studio ────────────────────────────────────────

  const handleDubVideoUpload = async (file) => {
    if (!file) return;
    setDubLoading(true);
    try {
      const url = await uploadFile(file);
      setDubVideoFile(file); setDubVideoUrl(url);
      // Auto-populate script from current scenes if available
      if (!dubOriginalScript && scenes.some(s => s.text)) {
        setDubOriginalScript(scenes.map(s => s.text).filter(Boolean).join("\n\n"));
      }
      setDubStep(1);
    } catch { setError("Video upload failed."); }
    setDubLoading(false);
  };

  const useCurrentMovieForDubbing = () => {
    if (videoUrl) { setDubVideoUrl(videoUrl); setDubVideoFile(null); }
    if (scenes.some(s => s.text)) setDubOriginalScript(scenes.map(s => s.text).filter(Boolean).join("\n\n"));
    setDubStep(1);
  };

  const translateForDubbing = async () => {
    if (!dubOriginalScript.trim()) return setError("Enter the original script first.");
    setDubLoading(true); setError("");
    try {
      const translated = await generateText({
        type: "script",
        prompt: `Translate this film script from ${dubSourceLang} to ${dubTargetLang}. Preserve the meaning, emotion, and pacing. Keep the same paragraph/scene breaks. Plain text only, no markdown:\n\n${dubOriginalScript}`,
        tone: "Cinematic",
      });
      setDubTranslatedScript(translated);
      setDubStep(2);
    } catch (e) { setError(e?.message || "Translation failed."); }
    setDubLoading(false);
  };

  const generateDubbedAudio = async () => {
    if (!dubTranslatedScript.trim()) return setError("Translate the script first.");
    setDubLoading(true); setError("");
    try {
      const blob = await generateVoiceover(toSpeakable(dubTranslatedScript).slice(0, 3000));
      if (blob) {
        const url = URL.createObjectURL(blob);
        setDubAudioBlob(blob); setDubAudioUrl(url);
        setDubStep(3);
      } else setError("Dubbed audio generation failed.");
    } catch (e) { setError(e?.message || "Dubbed audio failed."); }
    setDubLoading(false);
  };

  const currentStep = STEPS[step];
  const isDubbing = step === 5;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-foreground">Movie Maker</h1>
            <p className="text-xs text-muted-foreground">Multi-scene films · AI script · Voiceover · Music · Dubbing</p>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Film title…"
            className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
        </div>

        {/* Step tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                i === step ? "bg-cyan-500 text-white shadow-sm"
                : i < step ? "bg-cyan-500/20 text-cyan-400"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}>
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ── Step 0: Script ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Genre</label>
                <select value={genre} onChange={e => setGenre(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-cyan-500/50">
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-cyan-500/50">
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Story idea / outline</label>
              <textarea value={storyPrompt} onChange={e => setStoryPrompt(e.target.value)}
                placeholder="Describe your story, characters, setting, plot arc…"
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={generateScript} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Generating script…" : "Generate AI Script"}
              </button>
              <span className="text-xs text-muted-foreground">for {scenes.length} scenes</span>
            </div>
            {script && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Generated script (editable)</p>
                <textarea value={script} onChange={e => setScript(e.target.value)} rows={10}
                  className="w-full text-sm text-foreground bg-transparent focus:outline-none resize-none leading-relaxed" />
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Scenes ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{scenes.length} scenes</p>
              <div className="flex gap-2">
                <button onClick={generateAllImages} disabled={Object.values(imgLoading).some(Boolean)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-colors disabled:opacity-50">
                  <Sparkles className="w-3.5 h-3.5" /> Generate All Images
                </button>
                <button onClick={addScene}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Scene
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
              <strong className="text-foreground">Character consistency:</strong> AI generates each image using the first scene's image as a visual reference — keeping characters and style consistent throughout.
            </p>

            {scenes.map((scene, i) => (
              <div key={scene.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Scene {i + 1}</span>
                  {scenes.length > 1 && (
                    <button onClick={() => removeScene(scene.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <textarea value={scene.text} onChange={e => updateScene(scene.id, { text: e.target.value })}
                  placeholder="Dialogue / narration / scene description…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 resize-none" />

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Duration */}
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Duration: {scene.duration}s</label>
                    <input type="range" min={3} max={60} value={scene.duration}
                      onChange={e => updateScene(scene.id, { duration: +e.target.value })}
                      className="w-full accent-cyan-500" />
                  </div>
                  {/* AI Image */}
                  <button onClick={() => generateSceneImage(scene)}
                    disabled={!scene.text || imgLoading[scene.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 disabled:opacity-50 transition-colors">
                    {imgLoading[scene.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {scene.imageUrl ? "Regenerate" : "AI Image"}
                  </button>
                  {/* Upload */}
                  <button onClick={() => fileInputRefs.current[scene.id]?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <input type="file" accept="image/*,video/*" className="hidden"
                      ref={el => (fileInputRefs.current[scene.id] = el)}
                      onChange={e => handleSceneFileUpload(scene, e.target.files?.[0])} />
                    {uploadLoading[scene.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Upload
                  </button>
                </div>

                {/* Scene preview */}
                {scene.imageUrl && (
                  <img src={scene.imageUrl} alt={`Scene ${i+1}`}
                    className="w-full h-32 object-cover rounded-xl border border-border" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 2: Voiceover ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Generate AI voiceover per scene. On export, all text is combined into a single narration track.</p>
              <button onClick={generateAllVoiceovers}
                disabled={Object.values(voiceLoading).some(Boolean)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 disabled:opacity-50 transition-colors">
                <Mic className="w-3.5 h-3.5" /> Generate All
              </button>
            </div>
            {scenes.map((scene, i) => (
              <div key={scene.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Scene {i + 1}</p>
                <p className="text-sm text-foreground line-clamp-2">{scene.text || <span className="text-muted-foreground/50 italic">No dialogue yet</span>}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => generateSceneVoiceover(scene)}
                    disabled={!scene.text || voiceLoading[scene.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 disabled:opacity-50 transition-colors">
                    {voiceLoading[scene.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                    {scene.voiceUrl ? "Redo" : "Generate"}
                  </button>
                  {scene.voiceUrl && <audio controls src={scene.voiceUrl} className="flex-1 h-8" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 3: Music ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Upload a background music track. It will be mixed under the voiceover narration during export.</p>
            <div onClick={() => musicInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group">
              <input ref={musicInputRef} type="file" accept="audio/*" className="hidden"
                onChange={e => handleMusicUpload(e.target.files?.[0])} />
              {loading ? <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              : musicFile ? (
                <div className="space-y-1">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">{musicFile.name}</p>
                  <p className="text-xs text-muted-foreground">Click to replace</p>
                </div>
              ) : (
                <>
                  <Music className="w-10 h-10 text-muted-foreground group-hover:text-cyan-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-semibold text-foreground">Upload background music</p>
                  <p className="text-xs text-muted-foreground mt-1">MP3, WAV, AAC</p>
                </>
              )}
            </div>
            {musicUrl && <audio controls src={musicUrl} className="w-full rounded-xl" />}
          </div>
        )}

        {/* ── Step 4: Export ── */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Title card option */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <p className="text-sm font-semibold text-foreground">Title Card</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setTitleCard(v => !v)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${titleCard ? "bg-cyan-500" : "bg-muted"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${titleCard ? "translate-x-4" : ""}`} />
                </div>
                <span className="text-sm text-muted-foreground">Show movie title as opening card</span>
              </label>
              {titleCard && !title && (
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Enter a film title in the header above to use the title card.
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-1">
              <p className="text-sm font-semibold text-foreground mb-2">Film summary</p>
              <p><span className="text-foreground font-medium">Title:</span> {title || "Untitled"}</p>
              <p><span className="text-foreground font-medium">Genre / Language:</span> {genre} — {language}</p>
              <p><span className="text-foreground font-medium">Scenes with images:</span> {scenes.filter(s => s.imageUrl).length} / {scenes.length}</p>
              <p><span className="text-foreground font-medium">Est. duration:</span> {(titleCard && title ? 4 : 0) + scenes.filter(s => s.imageUrl).reduce((a, s) => a + Math.max(5, s.duration), 0)}s</p>
              <p><span className="text-foreground font-medium">Background music:</span> {musicFile?.name || "None"}</p>
            </div>

            <button onClick={assembleMovie} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg hover:opacity-90 disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Assembling ({Math.round(progress * 100)}%)…</> : <><Film className="w-4 h-4" /> Assemble Film</>}
            </button>

            {videoUrl && (
              <div className="space-y-3">
                <video src={videoUrl} controls className="w-full rounded-2xl border border-border" />
                <div className="flex gap-3">
                  <a href={videoUrl} download target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button onClick={handleSaveToLibrary} disabled={loading || saved}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? "Saved!" : "Save to Library"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Dubbing Studio ── */}
        {step === 5 && (
          <div className="space-y-4">
            {/* Progress tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {["1. Input", "2. Script", "3. Translate", "4. Preview", "5. Download"].map((label, i) => (
                <div key={i} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  i === dubStep ? "bg-violet-500 text-white"
                  : i < dubStep ? "bg-violet-500/20 text-violet-400"
                  : "bg-card border border-border text-muted-foreground"
                }`}>
                  {i < dubStep && <Check className="w-3 h-3" />} {label}
                </div>
              ))}
            </div>

            {/* Dub step 0: Input */}
            {dubStep === 0 && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Upload an existing video file to dub, or use the movie you assembled in the Export step.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => document.getElementById("dub-video-input")?.click()}
                    className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group">
                    <input id="dub-video-input" type="file" accept="video/*,audio/*" className="hidden"
                      onChange={e => handleDubVideoUpload(e.target.files?.[0])} />
                    {dubLoading ? <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" /> : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-violet-400 mx-auto mb-2 transition-colors" />
                        <p className="text-sm font-semibold text-foreground">Upload video / audio file</p>
                        <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, MP3, WAV</p>
                      </>
                    )}
                  </div>
                  {videoUrl && (
                    <button onClick={useCurrentMovieForDubbing}
                      className="border-2 border-dashed border-cyan-500/30 rounded-2xl p-8 text-center hover:bg-cyan-500/5 transition-all group">
                      <Film className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">Use assembled movie</p>
                      <p className="text-xs text-muted-foreground mt-1">Continue from Export step</p>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Dub step 1: Script */}
            {dubStep === 1 && (
              <div className="space-y-4">
                {dubVideoUrl && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <video src={dubVideoUrl} controls className="w-full max-h-48" />
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Original language</label>
                    <select value={dubSourceLang} onChange={e => setDubSourceLang(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-violet-500/50">
                      {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Dub into language</label>
                    <select value={dubTargetLang} onChange={e => setDubTargetLang(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-violet-500/50">
                      {LANGUAGES.filter(l => l !== dubSourceLang).map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Original script / transcript</label>
                  <textarea value={dubOriginalScript} onChange={e => setDubOriginalScript(e.target.value)}
                    placeholder="Paste or type the original dialogue/narration for the video. This is what will be translated and dubbed."
                    rows={6}
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 resize-none" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={dubWithCaptions} onChange={e => setDubWithCaptions(e.target.checked)} className="accent-violet-500 w-4 h-4" />
                    <span className="text-sm text-muted-foreground">Include captions</span>
                  </label>
                  {dubWithCaptions && (
                    <select value={dubCaptionLang} onChange={e => setDubCaptionLang(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-violet-500/50">
                      <option value="original">Original language ({dubSourceLang})</option>
                      <option value="dubbed">Dubbed language ({dubTargetLang})</option>
                      <option value="both">Both languages</option>
                    </select>
                  )}
                </div>
                <button onClick={translateForDubbing} disabled={dubLoading || !dubOriginalScript.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {dubLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                  {dubLoading ? "Translating…" : `Translate to ${dubTargetLang}`}
                </button>
              </div>
            )}

            {/* Dub step 2: Review & Generate audio */}
            {dubStep === 2 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border max-h-56 overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Original — {dubSourceLang}</p>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{dubOriginalScript}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-violet-500/20 max-h-56 overflow-y-auto">
                    <p className="text-xs font-semibold text-violet-400 mb-2">Translated — {dubTargetLang}</p>
                    <textarea value={dubTranslatedScript} onChange={e => setDubTranslatedScript(e.target.value)}
                      className="w-full text-xs text-foreground bg-transparent focus:outline-none resize-none leading-relaxed" rows={8} />
                  </div>
                </div>
                <button onClick={generateDubbedAudio} disabled={dubLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {dubLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  {dubLoading ? "Generating dubbed audio…" : `Generate ${dubTargetLang} Voiceover`}
                </button>
              </div>
            )}

            {/* Dub step 3: Preview */}
            {dubStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Preview your video with the dubbed audio track playing simultaneously. Use the download button for the final export.</p>
                {dubVideoUrl && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <video src={dubVideoUrl} controls className="w-full max-h-64" />
                  </div>
                )}
                {dubAudioUrl && (
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" /> Dubbed audio — {dubTargetLang}
                    </p>
                    <audio controls src={dubAudioUrl} className="w-full" />
                    <p className="text-[11px] text-muted-foreground mt-2">Play the video and audio together to preview the dubbing. Click Download to get both files.</p>
                  </div>
                )}
                <button onClick={() => setDubStep(4)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-semibold hover:bg-violet-500/20 transition-colors">
                  <Download className="w-4 h-4" /> Go to Download →
                </button>
              </div>
            )}

            {/* Dub step 4: Download */}
            {dubStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <p className="text-sm font-semibold text-foreground">Download your dubbed content</p>
                  <div className="space-y-2">
                    {dubVideoUrl && (
                      <a href={dubVideoUrl} download target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                        <Download className="w-4 h-4" /> Download Original Video
                      </a>
                    )}
                    {dubAudioUrl && (
                      <a href={dubAudioUrl} download={`dubbed-${dubTargetLang.toLowerCase()}.webm`}
                        className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 text-sm font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors">
                        <Download className="w-4 h-4" /> Download Dubbed Audio ({dubTargetLang})
                      </a>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
                  <p className="font-semibold mb-1">Combining video + audio</p>
                  <p>To merge the dubbed audio with the original video, you can use a free tool like <strong>HandBrake</strong>, <strong>iMovie</strong>, <strong>DaVinci Resolve</strong>, or <strong>ffmpeg</strong>: replace the audio track with the dubbed file.</p>
                </div>
                {dubWithCaptions && dubTranslatedScript && (
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Caption text ({dubCaptionLang})</p>
                    <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {dubCaptionLang === "dubbed" || dubCaptionLang === "both" ? dubTranslatedScript : dubOriginalScript}
                    </pre>
                    <button onClick={() => {
                      const text = dubCaptionLang === "both"
                        ? `[${dubSourceLang}]\n${dubOriginalScript}\n\n[${dubTargetLang}]\n${dubTranslatedScript}`
                        : (dubCaptionLang === "dubbed" ? dubTranslatedScript : dubOriginalScript);
                      navigator.clipboard.writeText(text);
                    }} className="mt-2 text-xs text-fuchsia-400 hover:underline">
                      Copy captions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {!isDubbing && (
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < 4 && (
              <button onClick={() => setStep(s => Math.min(4, s + 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
