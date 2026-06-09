import { useState, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Sparkles, Building2, FileText, Image, Video, Calendar, Send,
  ChevronRight, ChevronLeft, Check, Loader2, X, Upload, AlertTriangle,
  Instagram, Linkedin, Youtube, Globe, MessageSquare, Mail, Hash,
  Play, Film, Layers, Zap, RefreshCw, Download, Clock, Users,
  Shield, Eye, EyeOff, Plus, Trash2, Star, Music
} from "lucide-react";

const STEPS = [
  { id: "brand",    label: "Brand",    icon: Building2,    desc: "Choose your brand" },
  { id: "content",  label: "Content",  icon: FileText,     desc: "AI-generated copy" },
  { id: "media",    label: "Media",    icon: Image,        desc: "Create or upload visuals" },
  { id: "format",   label: "Format",   icon: Layers,       desc: "Choose platform formats" },
  { id: "schedule", label: "Schedule", icon: Calendar,     desc: "Pick date & time" },
  { id: "publish",  label: "Publish",  icon: Send,         desc: "Review & go live" },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "🟣", color: "from-pink-500 to-rose-600" },
  { id: "facebook",  label: "Facebook",  icon: "🔵", color: "from-blue-500 to-blue-700" },
  { id: "tiktok",    label: "TikTok",    icon: "⬛", color: "from-gray-700 to-gray-900" },
  { id: "linkedin",  label: "LinkedIn",  icon: "🔷", color: "from-sky-600 to-blue-800" },
  { id: "youtube",   label: "YouTube",   icon: "🔴", color: "from-red-500 to-red-700" },
  { id: "twitter_x", label: "Twitter/X", icon: "⚫", color: "from-zinc-600 to-zinc-900" },
  { id: "whatsapp",  label: "WhatsApp",  icon: "🟢", color: "from-green-500 to-emerald-600" },
  { id: "email",     label: "Email",     icon: "💜", color: "from-violet-500 to-purple-600" },
];

const FORMATS = {
  instagram: [{ id:"feed",label:"Feed Post",size:"1080×1080",ratio:"1:1"},{id:"reel",label:"Reel",size:"1080×1920",ratio:"9:16"},{id:"story",label:"Story",size:"1080×1920",ratio:"9:16"},{id:"carousel",label:"Carousel",size:"1080×1080",ratio:"1:1"}],
  facebook:  [{ id:"feed",label:"Feed Post",size:"1200×630",ratio:"1.91:1"},{id:"reel",label:"Reel",size:"1080×1920",ratio:"9:16"},{id:"story",label:"Story",size:"1080×1920",ratio:"9:16"}],
  tiktok:    [{ id:"video",label:"TikTok Video",size:"1080×1920",ratio:"9:16"},{id:"photo",label:"Photo Post",size:"1080×1350",ratio:"4:5"}],
  linkedin:  [{ id:"post",label:"Post",size:"1200×627",ratio:"1.91:1"},{id:"article",label:"Article Banner",size:"1200×644",ratio:"~1.86:1"}],
  youtube:   [{ id:"short",label:"Short",size:"1080×1920",ratio:"9:16"},{id:"thumbnail",label:"Thumbnail",size:"1280×720",ratio:"16:9"}],
  twitter_x: [{ id:"post",label:"Post",size:"1600×900",ratio:"16:9"}],
};

const CONTENT_TYPES = [
  { id:"ad_copy",       label:"Ad Copy",        icon:"📢", desc:"Headline + body + CTA" },
  { id:"caption",       label:"Caption",        icon:"✍️",  desc:"Social caption + emojis" },
  { id:"video_script",  label:"Video Script",   icon:"🎬", desc:"Scene-by-scene script" },
  { id:"email_template",label:"Email",          icon:"📧", desc:"Subject + full email body" },
  { id:"whatsapp",      label:"WhatsApp Blast", icon:"💬", desc:"Broadcast message" },
  { id:"hashtag_set",   label:"Hashtag Set",    icon:"#",  desc:"30 trending hashtags" },
];

const CONSENT_RULES = [
  "I have explicit consent from all people featured in reference images",
  "Content will not include nudity, sexual material, or hate speech",
  "Content will not be used for deception or impersonation",
  "I accept full responsibility for the use of reference materials",
];

export default function CampaignStudio() {
  const { user, userTier = "starter" } = useOutletContext() || {};
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0=brand,1=content,2=media,3=format,4=schedule,5=publish
  const [campaign, setCampaign] = useState({
    brand_id: "", campaign_name: "", content_type: "ad_copy", ai_prompt: "", ai_output: "",
    reference_images: [], reference_consent: false, media_urls: [], media_type: "image",
    format: "", platforms: [], caption: "", hashtags: "", scheduled_at: "", status: "draft"
  });
  const [generating, setGenerating] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [consentChecked, setConsentChecked] = useState([false,false,false,false]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [savedId, setSavedId] = useState(null);
  const fileRef = useRef();
  const mediaFileRef = useRef();

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", user?.id],
    queryFn: () => base44.entities.Brand.list("-created_date", 20),
    enabled: !!user,
  });

  const activeBrand = brands.find(b => b.id === campaign.brand_id);

  const set = (k, v) => setCampaign(p => ({ ...p, [k]: v }));

  // ── Generate copy ──────────────────────────────────────────────────────────
  const generateContent = async () => {
    if (!campaign.ai_prompt) return;
    setGenerating(true);
    try {
      const brandCtx = activeBrand
        ? `Brand: ${activeBrand.name}. Voice: ${activeBrand.brand_voice||"professional"}. Audience: ${activeBrand.target_audience||"general"}. Industry: ${activeBrand.industry||""}.`
        : "";
      const res = await base44.functions.invoke("generateMediaContent", {
        type: campaign.content_type,
        prompt: `${brandCtx}\n\n${campaign.ai_prompt}`,
        platform: campaign.platforms[0] || "instagram",
        brand: activeBrand ? { name: activeBrand.name, voice: activeBrand.brand_voice, audience: activeBrand.target_audience } : null,
      });
      set("ai_output", res.content || res.result || "");
      if (res.caption) set("caption", res.caption);
      if (res.hashtags) set("hashtags", res.hashtags);
    } catch (e) { alert("Generation failed: " + e.message); }
    setGenerating(false);
  };

  // ── Generate AI image ──────────────────────────────────────────────────────
  const generateImage = async () => {
    if (!campaign.ai_prompt) return;
    setGeneratingImg(true);
    try {
      const brandCtx = activeBrand ? `For brand "${activeBrand.name}" in ${activeBrand.industry||""}. ` : "";
      const res = await base44.functions.invoke("generateMediaContent", {
        type: "image",
        prompt: `${brandCtx}${campaign.ai_prompt}`,
        reference_images: campaign.reference_consent ? campaign.reference_images : [],
      });
      if (res.image_url) {
        set("media_urls", [...campaign.media_urls, res.image_url]);
        set("media_type", "image");
      }
    } catch (e) { alert("Image generation failed: " + e.message); }
    setGeneratingImg(false);
  };

  // ── Upload media files ─────────────────────────────────────────────────────
  const uploadMedia = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        set("media_urls", [...campaign.media_urls, ev.target.result]);
        if (file.type.startsWith("video")) set("media_type", "video");
      };
      reader.readAsDataURL(file);
    });
  };

  // ── Reference image upload ─────────────────────────────────────────────────
  const uploadRef = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => set("reference_images", [...campaign.reference_images, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const allConsented = consentChecked.every(Boolean);

  const grantConsent = () => {
    if (allConsented) {
      set("reference_consent", true);
      setShowConsentModal(false);
    }
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    try {
      const record = await base44.entities.CampaignPost.create({ ...campaign, owner_id: user?.id, status: "draft" });
      setSavedId(record.id);
      return record.id;
    } catch (e) { console.error(e); }
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const publish = async () => {
    setPublishing(true);
    try {
      const id = savedId || await saveDraft();
      if (campaign.scheduled_at) {
        await base44.entities.CampaignPost.update(id, { status: "scheduled" });
        alert(`✅ Scheduled for ${new Date(campaign.scheduled_at).toLocaleString()}`);
      } else {
        await base44.functions.invoke("publishScheduledPosts", { post_id: id, immediate: true });
        await base44.entities.CampaignPost.update(id, { status: "published" });
        alert("✅ Published successfully!");
      }
      navigate("/dashboard");
    } catch (e) { alert("Publish failed: " + e.message); }
    setPublishing(false);
  };

  const canNext = () => {
    if (step === 0) return !!campaign.brand_id && !!campaign.campaign_name;
    if (step === 1) return !!campaign.content_type;
    if (step === 2) return campaign.media_urls.length > 0 || !!campaign.ai_output;
    if (step === 3) return campaign.platforms.length > 0;
    if (step === 4) return true;
    return true;
  };

  const togglePlatform = (id) => {
    set("platforms", campaign.platforms.includes(id)
      ? campaign.platforms.filter(p => p !== id)
      : [...campaign.platforms, id]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-fuchsia-400" /> Campaign Studio
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Create, design, and publish in one seamless flow</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  active ? "bg-fuchsia-600 text-white" :
                  done ? "bg-fuchsia-600/20 text-fuchsia-400 hover:bg-fuchsia-600/30 cursor-pointer" :
                  "bg-white/5 text-muted-foreground cursor-default"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-card border border-white/10 rounded-2xl p-6 min-h-[400px]">

        {/* STEP 0: Brand */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-foreground mb-1">Choose a Brand</h2>
              <p className="text-muted-foreground text-sm">Select which brand this campaign is for</p>
            </div>
            {brands.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No brands yet</p>
                <button onClick={() => navigate("/brands")} className="mt-3 px-4 py-2 rounded-xl bg-fuchsia-600 text-white text-sm font-bold">
                  Create Your First Brand →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brands.map(b => (
                  <button key={b.id} onClick={() => set("brand_id", b.id)}
                    className={`text-left p-4 rounded-xl border-2 transition ${campaign.brand_id === b.id ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${b.primary_color||"#7c3aed"}, ${b.secondary_color||"#a855f7"})` }}>
                        {(b.name||"B")[0]}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{b.name}</p>
                        <p className="text-muted-foreground text-xs">{b.industry || b.tagline || "No industry set"}</p>
                      </div>
                      {campaign.brand_id === b.id && <Check className="w-5 h-5 text-fuchsia-400 ml-auto" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Campaign Name *</label>
              <input value={campaign.campaign_name} onChange={e=>set("campaign_name",e.target.value)}
                placeholder="e.g. Summer Sale 2026" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-fuchsia-500" />
            </div>
          </div>
        )}

        {/* STEP 1: Content */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-foreground mb-1">Generate Content</h2>
              <p className="text-muted-foreground text-sm">AI will write copy using your brand voice and guidelines</p>
            </div>
            {activeBrand && (
              <div className="flex items-center gap-3 p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${activeBrand.primary_color||"#7c3aed"}, ${activeBrand.secondary_color||"#a855f7"})` }}>
                  {(activeBrand.name||"B")[0]}
                </div>
                <div>
                  <p className="text-fuchsia-300 text-xs font-semibold">{activeBrand.name}</p>
                  <p className="text-muted-foreground text-xs">{activeBrand.brand_voice || "No voice set"} · {activeBrand.target_audience || "General audience"}</p>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Content Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONTENT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => set("content_type", ct.id)}
                    className={`p-3 rounded-xl border text-left transition ${campaign.content_type === ct.id ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <span className="text-lg">{ct.icon}</span>
                    <p className="text-xs font-bold text-foreground mt-1">{ct.label}</p>
                    <p className="text-xs text-muted-foreground">{ct.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">What are you promoting?</label>
              <textarea value={campaign.ai_prompt} onChange={e=>set("ai_prompt",e.target.value)} rows={3}
                placeholder="e.g. 50% off summer collection for women, limited time, ends Sunday. Tone: exciting, urgent." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-fuchsia-500 resize-none" />
            </div>
            <button onClick={generateContent} disabled={generating||!campaign.ai_prompt}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate with AI"}
            </button>
            {campaign.ai_output && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wide">Generated Content</p>
                  <button onClick={generateContent} disabled={generating} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <textarea value={campaign.ai_output} onChange={e=>set("ai_output",e.target.value)} rows={6}
                  className="w-full bg-transparent text-sm text-foreground focus:outline-none resize-none" />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Media */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-foreground mb-1">Create / Upload Media</h2>
              <p className="text-muted-foreground text-sm">Generate AI visuals, upload images/videos, or combine multiple files</p>
            </div>

            {/* Reference images with consent */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-300 font-semibold text-sm">Reference Person / Style Images</p>
                  <p className="text-amber-400/70 text-xs mt-1">Upload a reference photo to maintain character or style continuity across your campaign. Requires explicit consent.</p>
                  {!campaign.reference_consent ? (
                    <button onClick={() => setShowConsentModal(true)}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition">
                      + Add Reference (Consent Required)
                    </button>
                  ) : (
                    <div className="mt-2">
                      <p className="text-emerald-400 text-xs font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Consent granted</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {campaign.reference_images.map((img, i) => (
                          <div key={i} className="relative">
                            <img src={img} className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                            <button onClick={() => set("reference_images", campaign.reference_images.filter((_,j)=>j!==i))}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">×</button>
                          </div>
                        ))}
                        <button onClick={() => fileRef.current?.click()}
                          className="w-14 h-14 rounded-lg border-2 border-dashed border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500/10 transition">
                          <Plus className="w-5 h-5" />
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadRef} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI image gen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={generateImage} disabled={generatingImg||!campaign.ai_prompt}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 justify-center">
                {generatingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                {generatingImg ? "Generating..." : "Generate AI Image"}
              </button>
              <button onClick={() => mediaFileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-foreground text-sm font-bold hover:bg-white/15 transition justify-center">
                <Upload className="w-4 h-4" /> Upload Files
                <span className="text-xs text-muted-foreground">(images & videos)</span>
              </button>
              <input ref={mediaFileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={uploadMedia} />
            </div>

            {/* Media preview grid */}
            {campaign.media_urls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Media Files ({campaign.media_urls.length}) — drag to reorder
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {campaign.media_urls.map((url, i) => (
                    <div key={i} className="relative group aspect-square">
                      {url.includes("video") || url.startsWith("data:video") ? (
                        <video src={url} className="w-full h-full object-cover rounded-xl border border-white/10" />
                      ) : (
                        <img src={url} className="w-full h-full object-cover rounded-xl border border-white/10" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center gap-2">
                        {i === 0 && <Star className="w-4 h-4 text-yellow-400" title="Cover" />}
                        <button onClick={() => set("media_urls", campaign.media_urls.filter((_,j)=>j!==i))}
                          className="p-1 bg-red-500/80 rounded-lg"><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => mediaFileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-muted-foreground hover:border-fuchsia-500/40 hover:text-fuchsia-400 transition">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
                {campaign.media_urls.length > 1 && (
                  <p className="text-xs text-fuchsia-400 mt-2 flex items-center gap-1">
                    <Film className="w-3 h-3" /> {campaign.media_urls.length} files selected — will be combined into a single video/carousel
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Format & Platforms */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-foreground mb-1">Platforms & Formats</h2>
              <p className="text-muted-foreground text-sm">Select where to post and the format for each platform</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Select Platforms</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => togglePlatform(p.id)}
                    className={`p-3 rounded-xl border-2 text-center transition ${campaign.platforms.includes(p.id) ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <span className="text-2xl">{p.icon}</span>
                    <p className="text-xs font-bold text-foreground mt-1">{p.label}</p>
                    {campaign.platforms.includes(p.id) && <Check className="w-3 h-3 text-fuchsia-400 mx-auto mt-1" />}
                  </button>
                ))}
              </div>
            </div>
            {campaign.platforms.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Caption & Hashtags</label>
                <textarea value={campaign.caption||campaign.ai_output} onChange={e=>set("caption",e.target.value)} rows={4}
                  placeholder="Your post caption..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-fuchsia-500 resize-none" />
                <input value={campaign.hashtags} onChange={e=>set("hashtags",e.target.value)}
                  placeholder="#hashtags #yourbrand #campaign" className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-fuchsia-500" />
              </div>
            )}
            {/* Format per platform */}
            {campaign.platforms.filter(p => FORMATS[p]).map(pid => (
              <div key={pid}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  {PLATFORMS.find(p=>p.id===pid)?.label} Format
                </label>
                <div className="flex gap-2 flex-wrap">
                  {FORMATS[pid].map(fmt => (
                    <button key={fmt.id} onClick={() => set("format", fmt.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition ${campaign.format===fmt.id ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                      {fmt.label} <span className="text-muted-foreground font-normal">({fmt.size})</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 4: Schedule */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-foreground mb-1">Schedule Your Post</h2>
              <p className="text-muted-foreground text-sm">Post immediately or schedule for later</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => set("scheduled_at", "")}
                className={`p-5 rounded-xl border-2 text-left transition ${!campaign.scheduled_at ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                <Send className="w-6 h-6 text-fuchsia-400 mb-2" />
                <p className="font-bold text-foreground">Post Now</p>
                <p className="text-muted-foreground text-xs mt-1">Publish immediately to selected platforms</p>
              </button>
              <button onClick={() => set("scheduled_at", new Date(Date.now()+3600000).toISOString().slice(0,16))}
                className={`p-5 rounded-xl border-2 text-left transition ${campaign.scheduled_at ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                <Clock className="w-6 h-6 text-fuchsia-400 mb-2" />
                <p className="font-bold text-foreground">Schedule</p>
                <p className="text-muted-foreground text-xs mt-1">Pick a future date and time</p>
              </button>
            </div>
            {campaign.scheduled_at && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Date & Time</label>
                <input type="datetime-local" value={campaign.scheduled_at} onChange={e=>set("scheduled_at",e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-fuchsia-500" />
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review & Publish */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-foreground mb-1">Review & Publish</h2>
              <p className="text-muted-foreground text-sm">Final check before going live</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campaign Details</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{campaign.campaign_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Brand</span><span className="text-foreground font-medium">{activeBrand?.name || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Content</span><span className="text-foreground font-medium capitalize">{campaign.content_type?.replace(/_/g," ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Media</span><span className="text-foreground font-medium">{campaign.media_urls.length} file{campaign.media_urls.length!==1?"s":""}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Platforms</span><span className="text-foreground font-medium">{campaign.platforms.length} selected</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Publish</span><span className="text-foreground font-medium">{campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : "Immediately"}</span></div>
                </div>
              </div>
              {campaign.media_urls[0] && (
                <div className="rounded-xl overflow-hidden border border-white/10 aspect-square">
                  <img src={campaign.media_urls[0]} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}
            </div>
            {campaign.ai_output && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Content Preview</p>
                <p className="text-sm text-foreground whitespace-pre-line line-clamp-4">{campaign.caption || campaign.ai_output}</p>
                {campaign.hashtags && <p className="text-xs text-fuchsia-400 mt-2">{campaign.hashtags}</p>}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={saveDraft} className="flex-1 py-3 rounded-xl bg-white/10 text-foreground text-sm font-bold hover:bg-white/15 transition">
                Save Draft
              </button>
              <button onClick={publish} disabled={publishing}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {publishing ? "Publishing..." : campaign.scheduled_at ? "Schedule Post" : "Publish Now"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      {step < 5 && (
        <div className="flex justify-between">
          <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-muted-foreground text-sm font-semibold hover:bg-white/10 transition disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => setStep(s => Math.min(5, s+1))} disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40">
            {step === 4 ? "Review" : "Continue"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111118] border border-amber-500/30 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-amber-400" />
                <h2 className="text-lg font-black text-foreground">Consent & Safety Agreement</h2>
              </div>
              <p className="text-muted-foreground text-sm mt-2">Before uploading reference images of people, you must confirm the following:</p>
            </div>
            <div className="p-6 space-y-3">
              {CONSENT_RULES.map((rule, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentChecked[i]} onChange={e=>{const a=[...consentChecked];a[i]=e.target.checked;setConsentChecked(a);}}
                    className="mt-0.5 accent-fuchsia-500 w-4 h-4 flex-shrink-0" />
                  <span className="text-sm text-foreground">{rule}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button onClick={() => setShowConsentModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-muted-foreground text-sm font-semibold">Cancel</button>
              <button onClick={grantConsent} disabled={!allConsented}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition disabled:opacity-40">
                I Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
