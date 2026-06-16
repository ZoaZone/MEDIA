import { useState, useRef } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { mine } from "@/utils/scope";
import {
  Film, Sparkles, Lock, Plus, Trash2, Loader2, ChevronRight,
  ChevronLeft, Mic, Music, Globe, Upload, Check, AlertCircle,
  X, Play, Download, Save, Video, Wand2, Languages,
} from "lucide-react";
import { generateText, generateVoiceover, uploadFile, splitScriptIntoScenes } from "@/utils/aiClient";
import { assembleVideo } from "@/utils/videoAssembler";

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Hindi", "Arabic",
  "Japanese", "Korean", "Chinese (Mandarin)", "Italian", "Russian", "Tamil",
  "Telugu", "Bengali", "Turkish", "Dutch", "Polish", "Vietnamese", "Thai",
];

const GENRES = ["Drama", "Documentary", "Comedy", "Action", "Romance", "Horror", "Thriller", "Animation", "Educational", "Corporate"];

const STEPS = [
  { id: "story", label: "Story", icon: Wand2 },
  { id: "scenes", label: "Scenes", icon: Film },
  { id: "voiceover", label: "Voiceover", icon: Mic },
  { id: "music", label: "Music", icon: Music },
  { id: "language", label: "Language", icon: Languages },
  { id: "export", label: "Export", icon: Download },
];

function EmptyScene(n) {
  return { id: Date.now() + n, text: "", imageUrl: "", videoUrl: "", voiceBlob: null, voiceUrl: "", duration: 4 };
}

export default function MovieMaker() {
  const { userTier, isAdmin } = useOutletContext();
  const musicInputRef = useRef();
  const fileInputRefs = useRef({});

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Drama");
  const [storyPrompt, setStoryPrompt] = useState("");
  const [script, setScript] = useState("");
  const [scenes, setScenes] = useState([EmptyScene(0), EmptyScene(1), EmptyScene(2)]);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicFile, setMusicFile] = useState(null);
  const [language, setLanguage] = useState("English");
  const [dubLanguage, setDubLanguage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState({});
  const [uploadLoading, setUploadLoading] = useState({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (userTier < 4 && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Movie Maker</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Create multi-scene films with AI voiceover, music timeline, language dubbing, and script generation — exclusive to the Enterprise plan.
          </p>
          <Link to="/billing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:opacity-90 transition-opacity">
            <Sparkles className="w-4 h-4" /> Upgrade to Enterprise
          </Link>
        </div>
      </div>
    );
  }

  const generateScript = async () => {
    if (!storyPrompt.trim()) return setError("Enter a story idea or script outline.");
    setLoading(true);
    setError("");
    try {
      const result = await generateText({
        type: "video_script",
        prompt: `Write a ${genre.toLowerCase()} film script in ${language} with 3-5 clear scenes. Each scene should have narration/dialogue text and a visual description. Title: "${title || "Untitled"}". Story: ${storyPrompt}`,
        tone: "Cinematic",
      });
      setScript(result);
      const parsed = splitScriptIntoScenes(result, scenes.length);
      setScenes(prev => prev.map((s, i) => ({
        ...s,
        text: parsed[i]?.text || s.text,
      })));
    } catch (e) {
      setError(e?.message || "Script generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const addScene = () => setScenes(prev => [...prev, EmptyScene(prev.length)]);

  const updateScene = (id, patch) =>
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const removeScene = (id) =>
    setScenes(prev => prev.filter(s => s.id !== id));

  const generateSceneVoiceover = async (scene) => {
    if (!scene.text.trim()) return setError("Add dialogue text to this scene first.");
    setVoiceLoading(p => ({ ...p, [scene.id]: true }));
    setError("");
    try {
      const blob = await generateVoiceover(scene.text);
      if (blob) {
        const url = URL.createObjectURL(blob);
        updateScene(scene.id, { voiceBlob: blob, voiceUrl: url });
      } else {
        setError("Voiceover generation unavailable. Try again.");
      }
    } catch (e) {
      setError(e?.message || "Voiceover failed.");
    } finally {
      setVoiceLoading(p => ({ ...p, [scene.id]: false }));
    }
  };

  const handleSceneFileUpload = async (scene, file) => {
    if (!file) return;
    setUploadLoading(p => ({ ...p, [scene.id]: true }));
    try {
      const url = await uploadFile(file);
      const isVideo = file.type.startsWith("video/");
      updateScene(scene.id, isVideo ? { videoUrl: url } : { imageUrl: url });
    } catch {
      setError("File upload failed.");
    } finally {
      setUploadLoading(p => ({ ...p, [scene.id]: false }));
    }
  };

  const handleMusicUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadFile(file);
      setMusicUrl(url);
      setMusicFile(file);
    } catch {
      setError("Music upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const assembleMovie = async () => {
    const imageScenes = scenes.filter(s => s.imageUrl);
    if (imageScenes.length === 0) return setError("Add at least one image to a scene before assembling.");
    setLoading(true);
    setError("");
    try {
      const sceneObjects = imageScenes.map(s => ({
        imageUrl: s.imageUrl,
        text: s.text,
        caption: s.text,
      }));
      const firstVoiceBlob = imageScenes.find(s => s.voiceBlob)?.voiceBlob;
      const result = await assembleVideo({
        scenes: sceneObjects,
        audio: firstVoiceBlob || undefined,
        musicUrl: musicUrl || undefined,
        sceneDurations: imageScenes.map(s => s.duration),
      });
      if (result?.url) setVideoUrl(result.url);
      else setError("Assembly failed. Ensure scenes have image visuals.");
    } catch (e) {
      setError(e?.message || "Video assembly failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!videoUrl) return;
    setLoading(true);
    try {
      await base44.entities.ContentAsset.create({
        ...mine(),
        title: title || `Movie — ${new Date().toLocaleDateString()}`,
        type: "video",
        file_url: videoUrl,
        ai_generated: true,
        prompt_used: storyPrompt,
        status: "ready",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Save failed.");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS[step];

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
            <p className="text-xs text-muted-foreground">Multi-scene films with AI script, voiceover, music & dubbing</p>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Film title…"
            className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                i === step
                  ? "bg-cyan-500 text-white shadow-sm"
                  : i < step
                    ? "bg-cyan-500/20 text-cyan-400"
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

        {/* Step 0: Story */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Genre</label>
                <select value={genre} onChange={e => setGenre(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-cyan-500/50 transition-colors">
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Primary language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-cyan-500/50 transition-colors">
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Story idea / outline</label>
              <textarea value={storyPrompt} onChange={e => setStoryPrompt(e.target.value)}
                placeholder="Describe your story, characters, plot arc, setting… e.g. 'A young scientist discovers time travel and must stop a corporate villain from erasing history.'"
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" />
            </div>
            <button onClick={generateScript} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generating script…" : "Generate AI Script"}
            </button>
            {script && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Generated script</p>
                <textarea value={script} onChange={e => setScript(e.target.value)} rows={8}
                  className="w-full text-sm text-foreground bg-transparent focus:outline-none resize-none" />
              </div>
            )}
          </div>
        )}

        {/* Step 1: Scenes */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{scenes.length} scenes</p>
              <button onClick={addScene}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Scene
              </button>
            </div>
            {scenes.map((scene, i) => (
              <div key={scene.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Scene {i + 1}</span>
                  {scenes.length > 1 && (
                    <button onClick={() => removeScene(scene.id)}
                      className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <textarea value={scene.text} onChange={e => updateScene(scene.id, { text: e.target.value })}
                  placeholder="Dialogue / narration for this scene…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Duration: {scene.duration}s</label>
                    <input type="range" min={2} max={15} value={scene.duration}
                      onChange={e => updateScene(scene.id, { duration: +e.target.value })}
                      className="w-full accent-cyan-500" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRefs.current[scene.id]?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-background text-xs text-muted-foreground hover:border-cyan-500/40 hover:text-foreground transition-colors">
                      <input type="file" accept="image/*,video/*" className="hidden"
                        ref={el => (fileInputRefs.current[scene.id] = el)}
                        onChange={e => handleSceneFileUpload(scene, e.target.files?.[0])} />
                      {uploadLoading[scene.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {scene.imageUrl || scene.videoUrl ? "Replace" : "Upload"}
                    </button>
                    {(scene.imageUrl || scene.videoUrl) && (
                      <span className="flex items-center gap-1 px-2 text-xs text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Voiceover */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Generate AI voiceover for each scene's dialogue. The voiceover will be overlaid on the scene during export.</p>
            {scenes.map((scene, i) => (
              <div key={scene.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Scene {i + 1}</p>
                <p className="text-sm text-foreground line-clamp-2">{scene.text || <span className="text-muted-foreground/50 italic">No dialogue yet</span>}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => generateSceneVoiceover(scene)}
                    disabled={!scene.text || voiceLoading[scene.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-colors disabled:opacity-50">
                    {voiceLoading[scene.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                    {scene.voiceUrl ? "Regenerate" : "Generate Voiceover"}
                  </button>
                  {scene.voiceUrl && <audio controls src={scene.voiceUrl} className="flex-1 h-8" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Music */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Upload a background music track for your film. It will play softly beneath the voiceover and scene transitions.</p>
            <div onClick={() => musicInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group">
              <input ref={musicInputRef} type="file" accept="audio/*" className="hidden"
                onChange={e => handleMusicUpload(e.target.files?.[0])} />
              {loading ? (
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              ) : musicFile ? (
                <div className="space-y-1">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">{musicFile.name}</p>
                  <p className="text-xs text-muted-foreground">Click to replace</p>
                </div>
              ) : (
                <>
                  <Music className="w-10 h-10 text-muted-foreground group-hover:text-cyan-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-semibold text-foreground">Upload background music</p>
                  <p className="text-xs text-muted-foreground mt-1">MP3, WAV, AAC — up to 50 MB</p>
                </>
              )}
            </div>
            {musicUrl && <audio controls src={musicUrl} className="w-full rounded-xl" />}
          </div>
        )}

        {/* Step 4: Language & Dubbing */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <p className="text-xs font-semibold text-cyan-400 mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Language & Dubbing</p>
              <p className="text-xs text-muted-foreground">Your film's primary language is <strong className="text-foreground">{language}</strong>. Optionally select a dubbing language to auto-translate and re-voice the film.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Dub into language (optional)</label>
              <select value={dubLanguage} onChange={e => setDubLanguage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-cyan-500/50 transition-colors">
                <option value="">No dubbing — keep original language</option>
                {LANGUAGES.filter(l => l !== language).map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            {dubLanguage && (
              <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground">
                <p className="text-foreground font-semibold mb-1">Dubbing pipeline</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Scene dialogue translated from {language} → {dubLanguage}</li>
                  <li>AI voiceover generated in {dubLanguage}</li>
                  <li>Original audio replaced with dubbed track on export</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Export */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-sm font-semibold text-foreground mb-3">Film summary</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p><span className="text-foreground font-medium">Title:</span> {title || "Untitled"}</p>
                <p><span className="text-foreground font-medium">Genre:</span> {genre}</p>
                <p><span className="text-foreground font-medium">Scenes:</span> {scenes.length}</p>
                <p><span className="text-foreground font-medium">Language:</span> {language}{dubLanguage ? ` → dubbed in ${dubLanguage}` : ""}</p>
                <p><span className="text-foreground font-medium">Background music:</span> {musicFile?.name || "None"}</p>
                <p><span className="text-foreground font-medium">Est. duration:</span> {scenes.reduce((a, s) => a + s.duration, 0)}s</p>
              </div>
            </div>
            <button onClick={assembleMovie} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
              {loading ? "Assembling film…" : "Assemble Film"}
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
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? "Saved!" : "Save to Library"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
