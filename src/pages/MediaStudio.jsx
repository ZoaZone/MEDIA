import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Sparkles, Image, FileText, Megaphone, Hash, Loader2, Download, Eye,
  Copy, CheckCircle2, RefreshCw, Wand2, Video, Mic, Mail, MessageSquare,
  Globe, Palette, Play, Film, Zap, Star, ChevronDown, ChevronUp, Layers,
  Clapperboard, Volume2, Music, AlignLeft, Upload, X, ImagePlus
} from "lucide-react";

const TYPES = [
  { id: "ai_video",      label: "AI Video",       Icon: Clapperboard, desc: "Generate real video with audio",  color: "from-rose-500 to-red-600",        category: "video" },
  { id: "image",         label: "AI Image",       Icon: Image,        desc: "Platform-ready images",           color: "from-fuchsia-500 to-purple-600",  category: "visual" },
  { id: "video_script",  label: "Video Script",   Icon: Video,        desc: "Full scene-by-scene script",      color: "from-rose-500 to-pink-600",       category: "visual" },
  { id: "video_storyboard", label: "Storyboard",  Icon: Film,         desc: "Shot list + visual directions",   color: "from-orange-500 to-red-600",      category: "visual" },
  { id: "thumbnail",     label: "Thumbnail",      Icon: Layers,       desc: "YouTube & video thumbnails",      color: "from-yellow-500 to-orange-500",   category: "visual" },
  { id: "caption",       label: "Caption",        Icon: FileText,     desc: "AI social captions + emojis",     color: "from-pink-500 to-rose-600",       category: "copy" },
  { id: "ad_copy",       label: "Ad Copy",        Icon: Megaphone,    desc: "Headline + body + CTA",           color: "from-amber-500 to-orange-600",    category: "copy" },
  { id: "hashtag_set",   label: "Hashtag Set",    Icon: Hash,         desc: "30 trending hashtags per niche",  color: "from-emerald-500 to-teal-600",    category: "copy" },
  { id: "blog_post",     label: "Blog Post",      Icon: Globe,        desc: "SEO-ready long-form article",     color: "from-sky-500 to-blue-600",        category: "copy" },
  { id: "email_template",label: "Email",          Icon: Mail,         desc: "Subject + full email body",       color: "from-blue-500 to-cyan-600",       category: "messaging" },
  { id: "sms_template",  label: "SMS",            Icon: MessageSquare,desc: "160-char SMS with CTA",           color: "from-violet-500 to-indigo-600",   category: "messaging" },
  { id: "whatsapp",      label: "WhatsApp",       Icon: MessageSquare,desc: "WhatsApp broadcast message",      color: "from-green-500 to-emerald-600",   category: "messaging" },
  { id: "brand_voice",   label: "Brand Voice",    Icon: Mic,          desc: "Tone & messaging guidelines",     color: "from-purple-500 to-violet-600",   category: "branding" },
  { id: "brand_bio",     label: "Bio / About",    Icon: Star,         desc: "Platform bios & about sections",  color: "from-teal-500 to-cyan-600",       category: "branding" },
  { id: "press_release", label: "Press Release",  Icon: Zap,          desc: "Professional PR announcement",    color: "from-slate-500 to-gray-600",      category: "branding" },
];

const CATEGORIES = [
  { id: "all",      label: "All" },
  { id: "video",    label: "🎬 Video" },
  { id: "visual",   label: "🎨 Visual" },
  { id: "copy",     label: "✍️ Copy" },
  { id: "messaging",label: "📨 Messaging" },
  { id: "branding", label: "🏷️ Branding" },
];

const PLATFORMS = [
  "Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube",
  "Twitter/X", "WhatsApp", "Pinterest", "Snapchat", "General"
];
const TONES = ["Professional", "Casual", "Exciting", "Urgent", "Friendly", "Luxury", "Humorous", "Inspirational"];
const VIDEO_STYLES = ["Talking Head", "Slideshow", "Animation", "Product Demo", "Testimonial", "Tutorial", "Short-form Reel", "Documentary"];
const VIDEO_DURATIONS = ["15 seconds", "30 seconds", "60 seconds", "2 minutes", "5 minutes", "10 minutes"];
const AI_VIDEO_FORMATS = [
  { label: "Reel / TikTok / Short (9:16)", aspect: "9:16", duration: 6 },
  { label: "YouTube / Landscape (16:9)",   aspect: "16:9", duration: 6 },
  { label: "Square Feed (1:1) → 16:9",    aspect: "16:9", duration: 4 },
];
const AI_VIDEO_DURATIONS = [
  { label: "4 seconds",  value: 4,  clips: 1 },
  { label: "6 seconds",  value: 6,  clips: 1 },
  { label: "8 seconds",  value: 8,  clips: 1 },
  { label: "~16 seconds (2 clips)", value: 16, clips: 2 },
  { label: "~24 seconds (3 clips)", value: 24, clips: 3 },
  { label: "~30 seconds (4 clips)", value: 30, clips: 4 },
];
const IMAGE_DIMS = [
  { label: "1080×1080 – Square (Feed)",        value: "1080x1080" },
  { label: "1080×1920 – Story / Reel",         value: "1080x1920" },
  { label: "1200×628 – Facebook Ad",            value: "1200x628" },
  { label: "1280×720 – YouTube Thumbnail",      value: "1280x720" },
  { label: "1200×1200 – LinkedIn",              value: "1200x1200" },
  { label: "735×1102 – Pinterest",              value: "735x1102" },
  { label: "1500×500 – Twitter/X Banner",       value: "1500x500" },
  { label: "1920×1080 – Widescreen / OG Image", value: "1920x1080" },
];

function buildPrompt(type, form) {
  const base = "Topic/Product: " + form.prompt + ". Platform: " + form.platform + ". Tone: " + form.tone + ".";
  if (type === "caption") return "Write an engaging social media caption. " + base + " Include emojis, line breaks, and a clear hook. Max 220 chars.";
  if (type === "ad_copy") return "Write compelling ad copy. " + base + "\nHEADLINE: ...\nBODY: ...";
  if (type === "hashtag_set") return "Generate 30 hashtags for " + form.platform + " about: " + form.prompt;
  if (type === "email_template") return "Write a full marketing email. " + base;
  if (type === "sms_template") return "Write a concise SMS message. " + base;
  if (type === "whatsapp") return "Write a WhatsApp broadcast message. " + base;
  if (type === "blog_post") return "Write a complete SEO-optimized blog post. " + base;
  if (type === "video_script") return "Write a full video script for a " + (form.videoStyle || "short-form") + " video. " + base;
  return base;
}

const getSystemPrompt = (type, base, form) => {
  if (type === "blog_post") return "Write a complete SEO-optimized blog post. " + base;
  if (type === "video_script") return "Write a full video script for a " + (form.videoStyle || "short-form") + " video. " + base;
  return base;
};

export default function MediaStudio() {
  const { user } = useOutletContext() || {};
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const prefill = sessionStorage.getItem("mediaStudio_prefill");
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        if (data.type) setActiveType(data.type);
        if (data.type) setActiveCat("video");
        setForm(f => ({
          ...f,
          prompt: data.prompt || f.prompt,
          platform: data.platform || f.platform,
          tone: data.tone || f.tone,
        }));
        sessionStorage.removeItem("mediaStudio_prefill");
      } catch (_) {}
    }
  }, []);

  const [activeType, setActiveType] = useState("image");
  const [activeCat, setActiveCat] = useState("all");
  const [form, setForm] = useState({
    prompt: "", platform: "Instagram", tone: "Professional",
    dimensions: "1080x1080", videoStyle: "Short-form Reel", videoDuration: "60 seconds",
    videoAspect: "9:16", videoSeconds: 6,
    audioNote: "", captionStyle: "minimal"
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const uploadFileToStorage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      return data.file_url || data.url;
    }
    const sdkRes = await base44.integrations.Core.UploadFile({ file });
    return sdkRes?.file_url || sdkRes?.url;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const results = [];
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      try {
        const url = await uploadFileToStorage(file);
        results.push({ name: file.name, url: url || previewUrl, previewUrl, type: file.type });
      } catch (err) {
        results.push({ name: file.name, url: null, previewUrl, type: file.type, uploadFailed: true });
      }
    }
    setUploadedFiles(prev => [...prev, ...results]);
    setUploading(false);
  };

  const removeUploadedFile = (idx) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const activeTypeObj = TYPES.find(t => t.id === activeType);
  const isVisual = activeType === "image" || activeType === "thumbnail";
  const isVideoType = activeType === "video_script" || activeType === "video_storyboard";
  const isAiVideo = activeType === "ai_video";
  const isLongForm = ["blog_post", "brand_voice", "press_release", "brand_bio"].includes(activeType);

  const filteredTypes = activeCat === "all" ? TYPES : TYPES.filter(t => t.category === activeCat);

  const generate = async () => {
    if (!form.prompt.trim()) { alert("Please enter a topic or prompt"); return; }
    setLoading(true);
    setResult(null);

    try {
      if (isAiVideo) {
        const durObj = AI_VIDEO_DURATIONS.find(d => d.value === form.videoSeconds) || { clips: 1, value: form.videoSeconds };
        const numClips = durObj.clips;
        const clipSec = numClips > 1 ? 8 : form.videoSeconds;
        let clipUrls = [];
        for (let i = 0; i < numClips; i++) {
          const videoPrompt = form.prompt + " Platform: " + form.platform;
          const clipRefUrls = uploadedFiles.filter(f => f.type?.startsWith("image/") && f.url && !f.uploadFailed).map(f => f.url);
          const res = await base44.integrations.Core.GenerateVideo({
            prompt: videoPrompt,
            duration: clipSec,
            aspect_ratio: form.videoAspect,
            existing_image_urls: clipRefUrls.length ? clipRefUrls : undefined,
          });
          if (res?.url) clipUrls.push(res.url);
        }
        setResult({ type: "video", url: clipUrls[0], clipUrls, captions: "Sample caption text" });
      } else if (isVisual) {
        const styleHint = activeType === "thumbnail" ? "YouTube thumbnail style" : "Marketing image";
        const enhancedPrompt = form.prompt + ". " + styleHint;
        const imageUrls = uploadedFiles.filter(f => f.type.startsWith("image/")).map(f => f.url);
        const res = await base44.functions.invoke("generateImage", {
          prompt: enhancedPrompt,
          platform: form.platform,
          dimensions: form.dimensions,
          reference_image_urls: imageUrls.length ? imageUrls : undefined,
        });
        setResult({ type: "image", url: res?.file_url || res?.url });
      } else {
        const llmPrompt = buildPrompt(activeType, form);
        const res = await base44.functions.invoke("generateMediaContent", {
          type: activeType, platform: form.platform, tone: form.tone, prompt: llmPrompt,
        });
        setResult({ type: "text", text: res?.content || res?.text || "Generated text content placeholder" });
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result?.text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    await base44.entities.ContentAsset.create({
      type: activeType === "ai_video" ? "video" : activeType,
      title: form.prompt.slice(0, 60),
      content: result?.text || result?.url || "",
      file_url: result?.url || null,
      platform: form.platform,
      ai_generated: true,
      prompt_used: form.prompt,
      status: "ready",
    });
    qc.invalidateQueries(["media_library"]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const returnToCampaign = sessionStorage.getItem("mediaStudio_returnTo");

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {returnToCampaign && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-sm">
          <span className="text-fuchsia-400 font-medium">📎 Campaign Studio Active</span>
          <button onClick={() => navigate("/campaign-studio")} className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-fuchsia-600/20 text-fuchsia-400">Back</button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-fuchsia-400" /> Media Studio
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Complete AI creative production engine suite</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${activeCat === c.id ? "bg-fuchsia-500 text-white" : "bg-card text-muted-foreground"}`}>{c.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
        {filteredTypes.map(t => (
          <button key={t.id} onClick={() => { setActiveType(t.id); setResult(null); }} className={`p-3 rounded-2xl border text-left ${activeType === t.id ? "border-fuchsia-500 bg-fuchsia-500/5" : "border-border bg-card"}`}>
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-2`}><t.Icon className="w-4 h-4 text-white" /></div>
            <p className="text-xs font-bold text-foreground leading-tight">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Configure Parameters</h3>
          <textarea value={form.prompt} onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Describe your creative vision..." />
          
          <div className="grid grid-cols-2 gap-3">
            <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} className="w-full h-9 px-3 rounded-md border bg-background text-sm">{PLATFORMS.map(pl => <option key={pl}>{pl}</option>)}</select>
            <select value={form.tone} onChange={e => setForm(p => ({ ...p, tone: e.target.value }))} className="w-full h-9 px-3 rounded-md border bg-background text-sm">{TONES.map(t => <option key={t}>{t}</option>)}</select>
          </div>

          <button onClick={generate} disabled={loading || !form.prompt.trim()} className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold text-sm">
            {loading ? "Generating Assets..." : "Generate Creative Content"}
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col min-h-[300px]">
          <h3 className="font-semibold text-foreground mb-4">Output Hub</h3>
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-fuchsia-500" /><p className="text-xs text-muted-foreground mt-2">AI Creative Engine Rendering...</p></div>
          ) : result ? (
            <div className="flex-1 space-y-4">
              {result.type === "image" && <img src={result.url} alt="AI output" className="w-full rounded-xl object-cover border" />}
              {result.type === "text" && <pre className="text-sm bg-muted/50 p-3 rounded-xl whitespace-pre-wrap font-sans">{result.text}</pre>}
              <div className="flex gap-2">
                {result.type === "text" && <button onClick={copy} className="px-3 py-1.5 bg-muted text-xs rounded-lg">{copied ? "Copied!" : "Copy Text"}</button>}
                <button onClick={save} className="px-3 py-1.5 bg-fuchsia-500/10 text-fuchsia-400 text-xs rounded-lg">{saved ? "Saved!" : "Save to Vault"}</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-xs"><p>Configure values on left panel to execute render generation</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
