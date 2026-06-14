import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
Building2, FileText, Image as ImageIcon, Calendar, Check, Loader2, X,
Upload, Plus, Share2, Sparkles, CheckCircle2, Wand2, Video, Music,
Mic, AlignLeft, LayoutTemplate, PlayCircle, AlertTriangle
} from "lucide-react";
import { generateText, generateImage, uploadFile, generateVoiceover, splitScriptIntoScenes } from "@/utils/aiClient";
import { assembleVideo } from "@/utils/videoAssembler";

const STEPS = [
{ id: "brand", label: "Brand", icon: Building2 },
{ id: "accounts", label: "Accounts", icon: Share2 },
{ id: "content", label: "Copy & Scripts", icon: FileText },
{ id: "media", label: "Media & Video", icon: ImageIcon },
{ id: "schedule", label: "Timeline", icon: Calendar },
{ id: "review", label: "Launch", icon: CheckCircle2 }
];

const CONTENT_TYPES = [
{ id: "caption", label: "Social Caption" },
{ id: "ad_copy", label: "Ad Copy (FB/Google)" },
{ id: "video_script", label: "Video/Reel Script" },
{ id: "email", label: "Email Sequence" }
];

const FORMATS = ["Standard", "Bullet Points", "Storytelling", "Direct Response (AIDA)", "PAS Framework"];
const LENGTHS = ["Short & Punchy", "Medium (Standard)", "Long-form (In-depth)"];
const TONES = ["Professional", "Bold & Edgy", "Luxury", "Playful", "Urgent", "Educational"];
const MUSIC_STYLES = ["Corporate Tech", "Upbeat Pop", "Cinematic", "Lo-Fi Chill", "Trending TikTok"];

const inp = "w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-fuchsia-500/70 transition-all";
const lbl = "block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2";

const isImageUrl = (u = "") => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u) || u.startsWith("blob:") || u.startsWith("data:image");

export default function CampaignStudio() {
const navigate = useNavigate();
const qc = useQueryClient();
const mediaRef = useRef();

const [step, setStep] = useState(0);
const [showDemo, setShowDemo] = useState(false);
const [campaign, setCampaign] = useState({
brand_id: "", campaign_name: "",
content_type: "caption", format: "Standard", length: "Medium (Standard)", tone: "Professional",
ai_prompt: "", ai_output: "", auto_mode: false,
selected_accounts: [], media_urls: [], video_url: "",
video_settings: { music: "Trending TikTok", voice: "AI Female (Natural)", mood: "Energetic" },
schedules: [{ date: "", time: "09:00", topic: "" }]
});

const [generating, setGenerating] = useState(false);
const [generatingMedia, setGeneratingMedia] = useState(false);
const [videoProgress, setVideoProgress] = useState(0);
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);
const [error, setError] = useState("");

const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: () => base44.entities.Brand.list("-created_date", 20) });
const { data: allAccounts = [] } = useQuery({ queryKey: ["social_accounts"], queryFn: () => base44.entities.SocialAccount.list("-created_date", 100) });

// Prefill / media import handoff from other pages (kept from original, now safe-guarded)
useEffect(() => {
try {
const prefill = sessionStorage.getItem("campaignStudio_prefill");
if (prefill) {
const data = JSON.parse(prefill);
setCampaign(p => ({ ...p, ...data }));
if (data.ai_output) setStep(2);
sessionStorage.removeItem("campaignStudio_prefill");
}
} catch (e) { console.error("Prefill error:", e); }

try {
const mediaImport = sessionStorage.getItem("mediaImportData");
if (mediaImport) {
const urls = JSON.parse(mediaImport);
setCampaign(p => ({ ...p, media_urls: [...new Set([...p.media_urls, ...urls])] }));
setStep(3);
sessionStorage.removeItem("mediaImportData");
}
} catch (err) { console.error("Media import error:", err); }
}, []);

const selectedBrand = brands.find(b => b.id === campaign.brand_id);
const brandAccounts = allAccounts.filter(a => a.brand_id === campaign.brand_id);

// ── Real AI content generation (was a raw fetch to /api/functions) ──
const generateContent = async () => {
if (!campaign.ai_prompt.trim() && !campaign.auto_mode) return;
setError("");
setGenerating(true);
const brandContext = selectedBrand ? `Brand: ${selectedBrand.name}. Industry: ${selectedBrand.industry || "General"}. Voice: ${selectedBrand.brand_voice || campaign.tone}.` : "";
const topic = campaign.auto_mode
? "Auto-generate an engaging topic based on the brand context above."
: campaign.ai_prompt;
const prompt = `${brandContext}
Write a ${campaign.length} ${campaign.content_type.replace(/_/g, " ")} in a ${campaign.tone} tone, formatted as ${campaign.format}.
Topic: ${topic}`;
try {
const text = await generateText({
type: campaign.content_type,
prompt,
platform: selectedBrand?.name || "General",
tone: campaign.tone,
});
setCampaign(p => ({ ...p, ai_output: text }));
} catch (e) {
setError("Content generation failed: " + (e?.message || "unknown error"));
} finally {
setGenerating(false);
}
};

// ── Real upload (was base44.storage.uploadFile, which the app doesn't expose) ──
const uploadMedia = async (files) => {
if (!files?.length) return;
setError("");
const urls = [];
for (const file of Array.from(files)) {
try {
const url = await uploadFile(file);
if (url) urls.push(url);
} catch (e) { console.error(e); }
}
if (urls.length) setCampaign(p => ({ ...p, media_urls: [...p.media_urls, ...urls] }));
else setError("Upload failed — check your connection and try again.");
};

const genImage = async () => {
if (!campaign.ai_prompt.trim() && !campaign.ai_output.trim()) {
setError("Add a prompt in the Copy & Scripts step first.");
return;
}
setGeneratingMedia(true);
setError("");
try {
const url = await generateImage({
prompt: `High quality professional marketing image for: ${campaign.ai_prompt || campaign.ai_output}. ${campaign.tone} style, 8k, highly detailed, no text overlay.`,
platform: selectedBrand?.name || "General",
});
if (url) setCampaign(p => ({ ...p, media_urls: [...p.media_urls, url] }));
else setError("Image generation returned no result.");
} catch (e) { setError("Image generation failed: " + (e?.message || "unknown error")); }
setGeneratingMedia(false);
};

// ── Real video assembly (was setTimeout + hardcoded sample mp4) ──
const compileVideo = async () => {
const images = campaign.media_urls.filter(isImageUrl);
if (!images.length) { setError("Add or generate at least one image before compiling a video."); return; }
setError("");
setGeneratingMedia(true);
setVideoProgress(0);
try {
const captions = splitScriptIntoScenes(campaign.ai_output || campaign.campaign_name || "", images.length);
const scenes = images.map((url, i) => ({ imageUrl: url, text: captions[i]?.text || "" }));
let audio = null;
if (campaign.video_settings.voice !== "No Voiceover") {
audio = await generateVoiceover(scenes.map(s => s.text).join(". "));
}
const { url } = await assembleVideo({
scenes,
ratio: "9:16",
sceneSeconds: 3,
audio,
onProgress: setVideoProgress,
});
setCampaign(p => ({ ...p, video_url: url }));
} catch (e) {
setError("Video compile failed: " + (e?.message || "unknown error"));
}
setGeneratingMedia(false);
};

// ── Real publish (was setTimeout that persisted nothing) ──
const publishCampaign = async () => {
setSaving(true);
setError("");
try {
// 1. Save generated copy to the Media Library
if (campaign.ai_output) {
await base44.entities.ContentAsset.create({
type: campaign.content_type,
title: campaign.campaign_name || "Campaign content",
content: campaign.ai_output,
ai_generated: true,
});
}

// 2. Create the marketing campaign record
const slots = campaign.schedules.filter(s => s.date);
await base44.entities.MarketingCampaign.create({
name: campaign.campaign_name || "Untitled Campaign",
type: "social",
body: campaign.ai_output || "",
status: slots.length ? "scheduled" : "draft",
sent_count: 0, open_count: 0, click_count: 0,
});

// 3. Create one scheduled post per selected account × timeline slot
const accounts = brandAccounts.filter(a => campaign.selected_accounts.includes(a.id));
const primaryMedia = campaign.video_url || campaign.media_urls[0] || "";
const mediaType = campaign.video_url ? "video" : (campaign.media_urls[0] ? "image" : "");
const effectiveSlots = slots.length ? slots : [{ date: "", time: "", topic: "" }];

for (const slot of effectiveSlots) {
const scheduledAt = slot.date ? new Date(`${slot.date}T${slot.time || "09:00"}`).toISOString() : "";
for (const acc of accounts) {
await base44.entities.ScheduledPost.create({
social_account_id: acc.id,
platform: acc.platform,
caption: campaign.ai_output || slot.topic || "",
media_url: primaryMedia,
media_type: mediaType,
scheduled_at: scheduledAt,
status: scheduledAt ? "scheduled" : "draft",
});
}
}

qc.invalidateQueries(["campaigns"]);
qc.invalidateQueries(["scheduled_posts"]);
qc.invalidateQueries(["media_library"]);
setSaved(true);
} catch (e) {
setError("Publish failed: " + (e?.message || "unknown error"));
}
setSaving(false);
};

const canNext = () => (step === 0 ? !!campaign.brand_id : true);
const imageCount = campaign.media_urls.filter(isImageUrl).length;

return (
<div className="max-w-6xl mx-auto space-y-8 pb-20 p-4">

{/* HEADER */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-600 flex items-center gap-3">
<Sparkles className="text-fuchsia-500" /> Campaign Studio
</h1>
<p className="text-neutral-400 mt-2">The complete AI pipeline for copy, scripts, images, and video.</p>
</div>
<button onClick={() => setShowDemo(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium text-sm text-white">
<PlayCircle className="w-5 h-5 text-fuchsia-400" /> Watch Studio Tutorial
</button>
</div>

{error && (
<div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
<AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> {error}
</div>
)}

{/* STEP INDICATOR */}
<div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
{STEPS.map((s, i) => {
const Icon = s.icon;
const isActive = step === i;
const isPast = i < step;
return (
<button key={s.id} onClick={() => i <= step && setStep(i)}
className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 border ${
isActive ? "bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400" :
isPast ? "bg-neutral-900 border-neutral-800 text-neutral-300" : "bg-transparent border-transparent text-neutral-600"
}`}>
{isPast ? <Check className="w-4 h-4 text-emerald-500" /> : <Icon className="w-4 h-4" />} {s.label}
</button>
);
})}
</div>

{/* MAIN CARD */}
<div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 md:p-10 min-h-[500px] shadow-2xl relative overflow-hidden">

{/* STEP 0: BRAND */}
{step === 0 && (
<div className="space-y-8 animate-in fade-in duration-500">
<div>
<label className={lbl}>Campaign Details</label>
<input value={campaign.campaign_name} onChange={e => setCampaign(p => ({ ...p, campaign_name: e.target.value }))} placeholder="Campaign Name (e.g. Q3 Product Launch)" className={inp} />
</div>
<div>
<label className={lbl}>Select Brand Identity</label>
{brands.length === 0 ? (
<div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl">
<Building2 className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
<p className="text-neutral-300 font-bold">No brands yet</p>
<button onClick={() => navigate("/brands")} className="mt-3 text-fuchsia-400 text-sm hover:underline">Create a brand →</button>
</div>
) : (
<div className="grid sm:grid-cols-3 gap-4">
{brands.map(b => (
<button key={b.id} onClick={() => setCampaign(p => ({ ...p, brand_id: b.id }))}
className={`p-6 rounded-2xl border text-left transition-all ${campaign.brand_id === b.id ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-neutral-800 bg-neutral-900"}`}>
<p className="font-bold text-lg text-white">{b.name}</p>
{b.industry && <p className="text-xs text-neutral-500 mt-0.5">{b.industry}</p>}
</button>
))}
</div>
)}
</div>
</div>
)}

{/* STEP 1: ACCOUNTS */}
{step === 1 && (
<div className="space-y-6 animate-in fade-in duration-500">
<h2 className="text-xl font-bold text-white">Target Social Accounts</h2>
{brandAccounts.length === 0 ? (
<div className="text-center py-16 border border-dashed border-neutral-800 rounded-3xl">
<Share2 className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
<p className="text-white font-bold">No accounts connected for this brand.</p>
<button onClick={() => navigate("/brands")} className="mt-3 text-fuchsia-400 text-sm hover:underline">Link accounts in Brand Manager →</button>
</div>
) : (
<div className="grid sm:grid-cols-3 gap-4">
{brandAccounts.map(a => {
const selected = campaign.selected_accounts.includes(a.id);
return (
<button key={a.id} onClick={() => setCampaign(p => ({
...p, selected_accounts: selected ? p.selected_accounts.filter(id => id !== a.id) : [...p.selected_accounts, a.id],
}))} className={`p-5 rounded-2xl border text-left flex justify-between ${selected ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-neutral-800 bg-neutral-900"}`}>
<div>
<p className="font-bold text-white">{a.account_name}</p>
<p className="text-xs text-neutral-500 capitalize">{a.platform}</p>
</div>
{selected && <CheckCircle2 className="w-5 h-5 text-fuchsia-500" />}
</button>
);
})}
</div>
)}
</div>
)}

{/* STEP 2: CONTENT & SCRIPTS */}
{step === 2 && (
<div className="grid md:grid-cols-12 gap-8 animate-in fade-in duration-500">
<div className="md:col-span-4 space-y-6 bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800/50">
<h3 className="font-bold text-white text-lg mb-4">Configuration</h3>

<div>
<label className={lbl}><FileText className="w-4 h-4" /> Content Type</label>
<div className="grid grid-cols-1 gap-2">
{CONTENT_TYPES.map(t => (
<button key={t.id} onClick={() => setCampaign(p => ({ ...p, content_type: t.id }))}
className={`px-3 py-2 rounded-xl text-sm font-medium border text-left ${campaign.content_type === t.id ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300" : "bg-neutral-900 border-neutral-800 text-neutral-400"}`}>
{t.label}
</button>
))}
</div>
</div>

<div><label className={lbl}><LayoutTemplate className="w-4 h-4" /> Format</label>
<select value={campaign.format} onChange={e => setCampaign(p => ({ ...p, format: e.target.value }))} className={inp}>
{FORMATS.map(f => <option key={f}>{f}</option>)}
</select>
</div>

<div><label className={lbl}><AlignLeft className="w-4 h-4" /> Length</label>
<select value={campaign.length} onChange={e => setCampaign(p => ({ ...p, length: e.target.value }))} className={inp}>
{LENGTHS.map(l => <option key={l}>{l}</option>)}
</select>
</div>

<div><label className={lbl}><Sparkles className="w-4 h-4" /> Tone of Voice</label>
<select value={campaign.tone} onChange={e => setCampaign(p => ({ ...p, tone: e.target.value }))} className={inp}>
{TONES.map(t => <option key={t}>{t}</option>)}
</select>
</div>
</div>

<div className="md:col-span-8 space-y-4 flex flex-col">
<div className="flex justify-between items-end">
<label className={lbl}>Topic / Prompt</label>
<label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer mb-2">
<input type="checkbox" checked={campaign.auto_mode} onChange={e => setCampaign(p => ({ ...p, auto_mode: e.target.checked }))} className="rounded border-neutral-700 bg-neutral-900 text-fuchsia-500 focus:ring-fuchsia-500" />
Auto-Pilot (AI picks topic based on brand)
</label>
</div>
<textarea
disabled={campaign.auto_mode}
value={campaign.auto_mode ? "AI is in Auto-Pilot mode. It will analyze your brand data and industry to generate the perfect angle automatically." : campaign.ai_prompt}
onChange={e => setCampaign(p => ({ ...p, ai_prompt: e.target.value }))}
placeholder="What exactly are we promoting? (e.g., 'A 20% off summer sale on all leather boots')"
rows={3}
className={`${inp} ${campaign.auto_mode ? "opacity-50 italic" : ""}`}
/>

<button onClick={generateContent} disabled={generating || (!campaign.ai_prompt && !campaign.auto_mode)} className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
{generating ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />} Generate Output
</button>

{campaign.ai_output && (
<div className="mt-4 flex-1">
<label className={lbl}>Generated Final Output</label>
<textarea value={campaign.ai_output} onChange={e => setCampaign(p => ({ ...p, ai_output: e.target.value }))} className={`${inp} h-64 font-mono text-sm leading-relaxed resize-none`} />
</div>
)}
</div>
</div>
)}

{/* STEP 3: MEDIA & VIDEO */}
{step === 3 && (
<div className="space-y-8 animate-in fade-in duration-500">
<div className="grid md:grid-cols-3 gap-6">

{/* Generator Actions */}
<div className="space-y-4">
<button onClick={() => mediaRef.current?.click()} className="w-full p-6 border-2 border-dashed border-neutral-700 rounded-2xl bg-neutral-900/50 hover:border-fuchsia-500/50 transition-all flex flex-col items-center">
<Upload className="w-6 h-6 text-neutral-400 mb-2" /> <span className="font-bold text-white text-sm">Upload Files</span>
</button>
<input ref={mediaRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => uploadMedia(e.target.files)} />

<button onClick={genImage} disabled={generatingMedia} className="w-full p-6 border border-neutral-700 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 hover:border-fuchsia-500/50 transition-all flex flex-col items-center relative overflow-hidden group">
<div className="absolute inset-0 bg-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
{generatingMedia ? <Loader2 className="w-6 h-6 animate-spin text-fuchsia-500 mb-2" /> : <ImageIcon className="w-6 h-6 text-fuchsia-400 mb-2" />}
<span className="font-bold text-white text-sm">Generate AI Image</span>
</button>

<div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
<AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
<p className="text-xs text-amber-200/80 leading-relaxed">
<strong>Tip:</strong> AI image models struggle with rendering text. Generate clean base imagery here and add text overlays during video compile.
</p>
</div>
</div>

{/* Video Generation Tool */}
<div className="md:col-span-2 bg-neutral-900/40 border border-neutral-800 p-6 rounded-2xl flex flex-col">
<h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2"><Video className="w-5 h-5 text-indigo-400" /> AI Video Generator</h3>
<div className="grid grid-cols-2 gap-4 mb-6">
<div>
<label className={lbl}><Music className="w-3.5 h-3.5" /> Background Music</label>
<select value={campaign.video_settings.music} onChange={e => setCampaign(p => ({ ...p, video_settings: { ...p.video_settings, music: e.target.value } }))} className={inp}>
{MUSIC_STYLES.map(m => <option key={m}>{m}</option>)}
</select>
</div>
<div>
<label className={lbl}><Mic className="w-3.5 h-3.5" /> Voiceover Style</label>
<select value={campaign.video_settings.voice} onChange={e => setCampaign(p => ({ ...p, video_settings: { ...p.video_settings, voice: e.target.value } }))} className={inp}>
<option>AI Female (Natural)</option><option>AI Male (Deep)</option><option>Energetic Promo</option><option>No Voiceover</option>
</select>
</div>
</div>
<p className="text-xs text-neutral-500 mb-4">Compiles your {imageCount} image{imageCount !== 1 ? "s" : ""} into a captioned vertical video. Captions are pulled from your generated copy.</p>
{generatingMedia && videoProgress > 0 && (
<div className="mb-4">
<div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all" style={{ width: `${videoProgress * 100}%` }} />
</div>
<p className="text-xs text-neutral-400 mt-1">Rendering… {Math.round(videoProgress * 100)}%</p>
</div>
)}
<button onClick={compileVideo} disabled={generatingMedia || imageCount === 0} className="mt-auto w-full py-3 bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 rounded-xl font-bold hover:bg-indigo-600/40 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
{generatingMedia ? <Loader2 className="animate-spin" /> : <Video className="w-4 h-4" />} Compile AI Video
</button>
</div>
</div>

{/* Assembled video preview */}
{campaign.video_url && (
<div className="pt-6 border-t border-neutral-800">
<div className="flex items-center justify-between mb-3">
<h3 className="font-bold text-white">Compiled Video</h3>
<a href={campaign.video_url} download={`${(campaign.campaign_name || "campaign").replace(/\s+/g, "_")}.webm`} className="text-xs text-fuchsia-400 hover:underline">Download .webm</a>
</div>
<video src={campaign.video_url} controls loop className="max-h-80 rounded-2xl border border-neutral-800 bg-black" />
</div>
)}

{/* Visual Gallery */}
{campaign.media_urls.length > 0 && (
<div className="pt-6 border-t border-neutral-800">
<h3 className="font-bold text-white mb-4">Generated & Uploaded Assets</h3>
<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
{campaign.media_urls.map((url, i) => (
<div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-800 group bg-black">
{isImageUrl(url) ? (
<img src={url} className="w-full h-full object-cover" alt="Asset" />
) : (
<video src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted loop />
)}
<button onClick={() => setCampaign(p => ({ ...p, media_urls: p.media_urls.filter((_, j) => j !== i) }))} className="absolute top-2 right-2 bg-black/70 backdrop-blur-md rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4 text-white" /></button>
{!isImageUrl(url) && <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white">VIDEO</div>}
</div>
))}
</div>
</div>
)}
</div>
)}

{/* STEP 4: TIMELINE */}
{step === 4 && (
<div className="space-y-6 animate-in fade-in duration-500">
<div className="flex justify-between items-center">
<h2 className="text-xl font-bold text-white">Schedule Timeline</h2>
<button onClick={() => {
const d = new Date(); d.setDate(d.getDate() + 1);
setCampaign(p => ({ ...p, schedules: [...p.schedules, { date: d.toISOString().split("T")[0], time: "09:00", topic: "" }] }))
}} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-xs font-bold text-white transition-colors flex items-center gap-2">
<Plus className="w-3 h-3" /> Add Slot
</button>
</div>
<p className="text-xs text-neutral-500">Leave dates empty to save everything as drafts you can publish later from Social Hub.</p>
<div className="space-y-3">
{campaign.schedules.map((s, i) => (
<div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
<span className="w-6 text-center text-neutral-500 font-mono text-xs">{i + 1}</span>
<input type="date" value={s.date} onChange={e => { const u = [...campaign.schedules]; u[i].date = e.target.value; setCampaign(p => ({ ...p, schedules: u })); }} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white" />
<input type="time" value={s.time} onChange={e => { const u = [...campaign.schedules]; u[i].time = e.target.value; setCampaign(p => ({ ...p, schedules: u })); }} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white" />
<input value={s.topic} placeholder="Post Topic / Summary" onChange={e => { const u = [...campaign.schedules]; u[i].topic = e.target.value; setCampaign(p => ({ ...p, schedules: u })); }} className="flex-1 min-w-[200px] bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600" />
<button onClick={() => setCampaign(p => ({ ...p, schedules: p.schedules.filter((_, j) => j !== i) }))} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
</div>
))}
</div>
</div>
)}

{/* STEP 5: LAUNCH */}
{step === 5 && (
<div className="space-y-6 text-center py-12 animate-in fade-in duration-500">
{saved ? (
<div className="animate-in zoom-in slide-in-from-bottom-4 duration-700">
<div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-12 h-12 text-emerald-500" /></div>
<p className="text-4xl font-black text-white mb-3">Campaign Saved</p>
<p className="text-neutral-400 mb-6">Your campaign and {campaign.selected_accounts.length ? `posts for ${campaign.selected_accounts.length} account(s)` : "draft posts"} were created.</p>
<button onClick={() => navigate("/social-hub")} className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-full font-bold text-white transition-colors">Go to Social Hub</button>
</div>
) : (
<div className="max-w-md mx-auto">
<Wand2 className="w-16 h-16 text-fuchsia-500 mx-auto mb-6 opacity-80" />
<h2 className="text-3xl font-black text-white mb-2">Ready to Launch?</h2>
<div className="text-left text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6 space-y-1.5">
<p>Campaign: <span className="text-white font-semibold">{campaign.campaign_name || "Untitled"}</span></p>
<p>Accounts: <span className="text-white font-semibold">{campaign.selected_accounts.length || "none (drafts)"}</span></p>
<p>Copy: <span className="text-white font-semibold">{campaign.ai_output ? "✓ generated" : "none"}</span></p>
<p>Media: <span className="text-white font-semibold">{campaign.video_url ? "video + " : ""}{imageCount} image(s)</span></p>
<p>Timeline: <span className="text-white font-semibold">{campaign.schedules.filter(s => s.date).length || 0} scheduled slot(s)</span></p>
</div>
<button onClick={publishCampaign} disabled={saving} className="w-full py-5 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-black text-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-60">
{saving ? <Loader2 className="animate-spin" /> : "Deploy Campaign"}
</button>
</div>
)}
</div>
)}
</div>

{/* FOOTER NAV */}
{!saved && (
<div className="flex justify-between items-center mt-8">
<button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="px-6 py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-full font-bold text-white disabled:opacity-30 transition-colors">Back</button>
{step < STEPS.length - 1 && (
<button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()} className="px-8 py-3 bg-white hover:bg-neutral-200 text-black rounded-full font-black disabled:opacity-50 transition-colors">Continue Step</button>
)}
</div>
)}

{/* TUTORIAL DEMO PLAYER */}
{showDemo && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
<div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl relative flex flex-col">
<div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md absolute top-0 w-full z-10">
<h3 className="font-bold text-white flex items-center gap-3 text-lg"><Sparkles className="w-5 h-5 text-fuchsia-500" /> Campaign Studio Walkthrough</h3>
<button onClick={() => setShowDemo(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"><X className="w-5 h-5" /></button>
</div>
<div className="aspect-video w-full bg-black relative pt-[72px]">
<video
src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
controls autoPlay className="w-full h-full object-cover"
/>
</div>
</div>
</div>
)}
</div>
);
}


