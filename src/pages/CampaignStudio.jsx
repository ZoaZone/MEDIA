import { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { generateMedia } from "./MediaStudio";
import { Building2, FileText, Image, Video, Calendar, Send, ChevronRight, ChevronLeft, Check, Loader2, X, Upload, AlertTriangle, Play, Film, Layers, Zap, RefreshCw, Download, Clock, Shield, Plus, Trash2, Star, ImagePlus, Hash, Megaphone, Mail, MessageSquare, Palette, Users, Globe, Mic2, CheckCircle2, Share2, Sparkles, BookOpen, Eye } from "lucide-react";

const STEPS = [  { id:"linkedin",  label:"LinkedIn",  color:"from-sky-600 to-blue-800" },
  { id:"youtube",   label:"YouTube",   color:"from-red-500 to-red-700" },
  { id:"twitter_x", label:"Twitter/X", color:"from-zinc-600 to-zinc-900" },
  { id:"whatsapp",  label:"WhatsApp",  color:"from-green-500 to-emerald-600" },
  { id:"email",     label:"Email",     color:"from-violet-500 to-purple-600" },
];

const CONTENT_TYPES = [
  { id:"caption",           label:"Social Caption",    icon:"📝" },
  { id:"video_script",      label:"Video Script",      icon:"🎬" },
  { id:"ad_copy",           label:"Ad Copy",           icon:"📢" },
  { id:"email_template",    label:"Email",             icon:"📧" },
  { id:"blog_post",         label:"Blog Post",         icon:"📰" },
  { id:"whatsapp",          label:"WhatsApp Message",  icon:"💬" },
  { id:"hashtag_set",       label:"Hashtag Set",       icon:"#️⃣" },
  { id:"press_release",     label:"Press Release",     icon:"📣" },
];

const MEDIA_TYPES = [
  { id:"ai_image",    label:"AI Image",     icon:"🎨", desc:"Generate from brand + prompt" },
  { id:"ai_video",    label:"AI Video",     icon:"🎬", desc:"Generate video clip" },
  { id:"upload",      label:"Upload Files", icon:"📁", desc:"Upload your own media" },
  { id:"reference",   label:"Use Reference",icon:"🖼️",  desc:"Upload refs for AI to replicate style" },
];

const TONES = ["Professional","Casual","Bold","Luxury","Playful","Inspirational","Urgent","Friendly"];

const inp = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-fuchsia-500/70 transition";
const lbl = "block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5";

const CONSENT_ITEMS = [
  "I confirm I have explicit permission from all individuals shown in reference media to use their likeness",
  "This content does not contain nudity, hate speech, or impersonation of any person or brand",
  "I take full legal and ethical responsibility for any AI-generated content using this reference material",
  "I understand that reference images guide style/aesthetic only — not biometric face replication",
];

export default function CampaignStudio() {
  const { user } = useOutletContext() || {};
  const qc = useQueryClient();
  const navigate = useNavigate();
  const mediaRef = useRef();
  const refMediaRef = useRef();

  const [step, setStep] = useState(0);
  const [campaign, setCampaign] = useState({
    brand_id: "", campaign_name: "", content_type: "caption", ai_output: "", ai_prompt: "",
    tone: "Professional", platforms: ["instagram"], selected_accounts: [],
    media_choice: "", media_urls: [], ref_images: [], ref_consent: false,
    caption: "", hashtags: "", media_type: "image", format: "feed",
    schedules: [{ date: "", time: "09:00", topic: "", auto_topic: false }],
    notes: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generatingMedia, setGeneratingMedia] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consentChecked, setConsentChecked] = useState([false, false, false, false]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState([]);
  const [aiTopicLoading, setAiTopicLoading] = useState(false);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("-created_date", 20),
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ["social_accounts"],
    queryFn: () => base44.entities.SocialAccount.list("-created_date", 100),
  });

  const { data: existingPosts = [] } = useQuery({
    queryKey: ["campaign_posts"],
    queryFn: () => base44.entities.CampaignPost.list("-created_date", 50),
  });

  useEffect(() => {
    // Read prefill from ScriptWriter or media imports
    const prefill = sessionStorage.getItem("campaignStudio_prefill");
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        setCampaign(p => ({ ...p, ...data }));
        if (data.ai_output) setStep(2);
        sessionStorage.removeItem("campaignStudio_prefill");
      } catch (_) {}
    }

    // Pick up media imported from Media Studio
    try {
      const urls = JSON.parse(mediaImport);
      setCampaign(p => ({ ...p, media_urls: [...new Set([...p.media_urls, ...urls])] }));
      setStep(3); // jump to media step to show the imported media
    } catch (error) {
      console.error("Failed to parse imported media:", error);
    }
  }, []);

  const selectedBrand = brands.find(b => b.id === campaign.brand_id);
  const brandAccounts = allAccounts.filter(a => a.brand_id === campaign.brand_id);
  const allConsentGiven = consentChecked.every(Boolean);

  // Step 0: Select / quick-create brand
  // Step 1: Pick social accounts for this campaign
  // Step 2: Generate copy / script
  // Step 3: Upload or generate media
  // Step 4: Platform format
  // Step 5: Schedule (multi-date up to 3 months)
  // Step 6: Review & publish

  const generateContent = async () => {
    if (!campaign.ai_prompt.trim()) {
      alert("Enter a topic or brief");
      return;
    }
    setGenerating(true);
    
    const brand = selectedBrand;
    const brandContext = brand
      ? `\n\nBrand: ${brand.name}. Voice: ${brand.brand_voice || "Professional"}. Audience: ${brand.target_audience || "general audience"}. Industry: ${brand.industry || ""}. Tagline: ${brand.tagline || ""}.`
      : "";
      
    const isCaption = ["caption", "ad_copy", "whatsapp"].includes(campaign.content_type);
    const promptText = isCaption
      ? `Write a ${campaign.tone} ${campaign.content_type.replace(/_/g, " ")} for ${campaign.platforms[0] || "Instagram"}.\n\nTopic: ${campaign.ai_prompt}${brandContext}\n\nFormat your response EXACTLY like this:\nCAPTION:\n[Write the caption here with correct grammar and spelling. No markdown headers like ### — just clean text.]\n\nHASHTAGS:\n[20 relevant hashtags starting with #]`
      : `${campaign.ai_prompt}${brandContext}`;

    try {
      // Reconstructed API call that was sliced in half
      const res = await fetch("/api/functions/generateMediaContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: campaign.content_type,
          platform: campaign.platforms[0] || "Instagram",
          tone: campaign.tone,
          prompt: promptText,
        })
      }).then(r => r.json());

      const raw = res?.content || res?.data?.content || res?.text || res?.data?.text || "";
      const text = typeof raw === "string" ? raw : JSON.stringify(raw);
      
      if (isCaption) {
        const captionMatch = text.match(/CAPTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
        const hashMatch = text.match(/HASHTAGS:\s*([\s\S]*?)$/i);
        
        setCampaign(p => ({
          ...p,
          generated_content: captionMatch ? captionMatch[1].trim() : text,
          hashtags: hashMatch ? hashMatch[1].trim() : ""
        }));
      } else {
        setCampaign(p => ({ ...p, generated_content: text }));
      }
    } catch (error) {
      console.error("Content generation failed:", error);
      alert("Failed to generate content.");
    }
    setGenerating(false);
  };

  const runAutoPipeline = async () => {
    setGenerating(true);
    try {
      await generateContent();
      await generateImage();
      generateScheduleDates();
      alert("Pipeline complete! Content and Media are generated and scheduled.");
    } catch (e) {
      alert("Pipeline Error: " + e.message);
    }
    setGenerating(false);
  };
      const raw = res?.content || res?.data?.content || res?.text || res?.data?.text || "";
      const text = typeof raw === "string" ? raw : JSON.stringify(raw);
      if (isCaption) {
        const captionMatch = text.match(/CAPTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
        const hashMatch = text.match(/HASHTAGS:\s*([\s\S]*?)$/i);
        const cleanCaption = captionMatch ? captionMatch[1].replace(/###.*?\n?/g, "").trim() : text;
        const cleanHash = hashMatch ? hashMatch[1].trim() : "";
        setCampaign(p => ({ ...p, ai_output: cleanCaption, hashtags: cleanHash || p.hashtags }));
      } else {
        setCampaign(p => ({ ...p, ai_output: text }));
      }
    } catch (e) { alert("Generation failed: " + e.message); }
    setGenerating(false);
  };

  const generateAITopics = async () => {
    const brand = selectedBrand;
    if (!brand) { alert("Select a brand first"); return; }
    setAiTopicLoading(true);
    try {
        type: "caption",
        platform: campaign.platforms[0] || "Instagram",
        tone: campaign.tone,
        prompt: `Generate 10 creative content topic ideas for ${brand.name} (${brand.industry || "business"}) targeting ${brand.target_audience || "general audience"}. Each topic should be suitable for social media posts. Format as numbered list:\n1. [Topic]\n2. [Topic] ...`,
      });
      const text = res?.content || res?.text || "";
      setCampaign(p => ({ ...p, ai_output: typeof text === "string" ? text : JSON.stringify(text), content_type: "caption" }));
    } catch (e) { alert(e.message); }
    setAiTopicLoading(false);
  };

  const uploadMedia = async (files, isRef = false) => {
    if (!files?.length) return;
    isRef ? setUploadingRef(true) : setUploadingMedia(true);
    const urls = [];
    for (const file of Array.from(files)) {
      try {
        const url = await base44.storage.uploadFile(file);
        urls.push({ url, name: file.name, type: file.type, size: file.size });
      } catch (e) { console.error(e); }
    }
    if (isRef) {
      setCampaign(p => ({ ...p, ref_images: [...p.ref_images, ...urls.map(u => u.url)] }));
    } else {
      setCampaign(p => ({ ...p, media_urls: [...p.media_urls, ...urls.map(u => u.url)] }));
    }
    isRef ? setUploadingRef(false) : setUploadingMedia(false);
  };

  const generateImage = async () => {
    if (!campaign.ai_prompt.trim()) { alert("Enter a prompt/topic first in the Content step"); return; }
    setGeneratingMedia(true);
    const brand = selectedBrand;
    const refUrls = campaign.ref_images;
    const brandCtx = brand ? ` Brand: ${brand.name}. Colors: ${brand.primary_color || ""}. Style matches brand identity.` : "";
    const safePrompt = `${campaign.ai_prompt}.${brandCtx} Professional marketing image for ${campaign.platforms[0] || "social media"}. High quality, commercial photography style. ${campaign.tone} tone.`;
    try {
      const res = await base44.integrations.Core.GenerateImage({
        prompt: safePrompt,
        existing_image_urls: refUrls.length ? refUrls : undefined,
      });
      if (res?.url) {
        setGeneratedMedia(p => [...p, { url: res.url, type: "image" }]);
        setCampaign(p => ({ ...p, media_urls: [...p.media_urls, res.url], media_type: "image" }));
      }
    } catch (e) { alert("Image generation failed: " + e.message); }
    setGeneratingMedia(false);
  };

  const generateVideo = async () => {
    if (!allConsentGiven && campaign.ref_images.length > 0) {
      setShowConsentModal(true);
      return;
    }
    if (!campaign.ai_prompt.trim()) { alert("Enter a prompt/topic first"); return; }
    setGeneratingMedia(true);
    const brand = selectedBrand;
    const refUrls = campaign.ref_images;
    const brandCtx = brand ? ` Brand identity: ${brand.name}, ${brand.brand_voice || "professional"} tone.` : "";
    // Safe prompt — no face-replication language
    const safePrompt = `${campaign.ai_prompt}.${brandCtx} Match visual style, color palette and mood from reference material. Cinematic, professional marketing video for ${campaign.platforms[0] || "social media"}. ${campaign.tone} tone.`;
    try {
      const newClips = [];
      // Generate up to 3 clips if multiple are needed
      for (let i = 0; i < 1; i++) {
        const res = await base44.integrations.Core.GenerateVideo({
          prompt: safePrompt,
          duration: 8,
          aspect_ratio: "9:16",
          existing_image_urls: refUrls.length ? refUrls : undefined,
        });
        if (res?.url) newClips.push({ url: res.url, type: "video" });
      }
      setGeneratedMedia(p => [...p, ...newClips]);
      setCampaign(p => ({ ...p, media_urls: [...p.media_urls, ...newClips.map(c => c.url)], media_type: "video" }));
    } catch (e) { alert("Video generation failed: " + e.message); }
    setGeneratingMedia(false);
  };

  const addScheduleSlot = () => {
    if (campaign.schedules.length >= 90) return;
    setCampaign(p => ({ ...p, schedules: [...p.schedules, { date: "", time: "09:00", topic: "", auto_topic: false }] }));
  };

  const generateScheduleDates = () => {
    // Auto-generate 12 dates spread over 3 months
    const dates = [];
    const start = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + (i + 1) * 7);
      dates.push({
        date: d.toISOString().split("T")[0],
        time: "09:00",
        topic: "",
        auto_topic: true,
      });
    }
    setCampaign(p => ({ ...p, schedules: dates }));
  };

  const autoFillTopics = async () => {
    if (!selectedBrand) { alert("Select a brand first"); return; }
    setAiTopicLoading(true);
    try {
        type: "caption",
        platform: campaign.platforms[0] || "Instagram",
        tone: campaign.tone,
        prompt: `Generate ${campaign.schedules.length} unique social media post topics for ${selectedBrand.name} (${selectedBrand.industry || "business"}). One topic per line. Just the topic, no numbers or formatting.`,
      });
      const text = res?.content || res?.text || "";
      const topics = (typeof text === "string" ? text : "").split("\n").filter(Boolean).map(t => t.replace(/^\d+\.\s*/, "").trim());
      setCampaign(p => ({
        ...p,
        schedules: p.schedules.map((s, i) => ({ ...s, topic: topics[i] || s.topic })),
      }));
    } catch (e) { alert(e.message); }
    setAiTopicLoading(false);
  };

  const publishCampaign = async () => {
    if (campaign.schedules.filter(s => s.date).length === 0) { alert("Please add at least one scheduled date"); return; }
    setSaving(true);
    const fullCaption = [campaign.ai_output || campaign.caption, campaign.hashtags].filter(Boolean).join("\n\n");
    try {
      for (const sch of campaign.schedules) {
        if (!sch.date) continue;
        // Save one ScheduledPost per platform account
        const targetAccounts = campaign.selected_accounts.length > 0
          ? allAccounts.filter(a => campaign.selected_accounts.includes(a.id))
          : [{ id: "", platform: campaign.platforms[0] || "instagram" }];

        for (const acct of targetAccounts) {
          await base44.entities.ScheduledPost.create({
            social_account_id: acct.id || "",
            platform: acct.platform || campaign.platforms[0] || "instagram",
            caption: fullCaption,
            media_url: campaign.media_urls[0] || "",
            media_type: campaign.media_type || "image",
            scheduled_at: `${sch.date}T${sch.time}:00`,
            status: "scheduled",
            description: [
              campaign.campaign_name,
              sch.topic ? `Topic: ${sch.topic}` : "",
              campaign.media_urls.length > 1 ? `Media: ${campaign.media_urls.join(", ")}` : "",
            ].filter(Boolean).join(" | "),
          });
        }
      }
      qc.invalidateQueries(["scheduled_posts"]);
      setSaved(true);
    } catch (e) { alert("Publish failed: " + e.message); }
    setSaving(false);
  };

  const canNext = () => {
    if (step === 0) return !!campaign.brand_id;
    return true;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-fuchsia-400" /> Campaign Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Full campaign creation workflow — brand to publish</p>
        </div>
        {campaign.campaign_name && (
          <span className="px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-sm font-medium">{campaign.campaign_name}</span>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex-shrink-0 ${step === i ? "bg-fuchsia-600 text-white" : i < step ? "bg-fuchsia-600/20 text-fuchsia-400 cursor-pointer" : "bg-white/5 text-muted-foreground cursor-not-allowed"}`}>
              {i < step ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step panels */}
      <div className="bg-card border border-border rounded-2xl p-6 min-h-[400px]">

        {/* ── STEP 0: BRAND ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Select Brand</h2>
              <p className="text-sm text-muted-foreground">Choose an existing brand or create a new one first.</p>
            </div>
            <div>
              <label className={lbl}>Campaign Name</label>
              <input value={campaign.campaign_name} onChange={e => setCampaign(p => ({ ...p, campaign_name: e.target.value }))} placeholder="e.g. Summer Sale 2026" className={inp} />
            </div>
            {brands.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-2xl">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-foreground font-bold">No brands yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Create your brand first before creating a campaign</p>
                <button onClick={() => navigate("/brands")} className="px-4 py-2 rounded-xl bg-fuchsia-600 text-white text-sm font-bold hover:opacity-90">
                  Go to Brand Manager
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {brands.map(b => (
                  <button key={b.id} onClick={() => setCampaign(p => ({ ...p, brand_id: b.id }))}
                    className={`p-4 rounded-xl border text-left transition ${campaign.brand_id === b.id ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-border hover:border-fuchsia-500/40"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: b.primary_color || "#7c3aed" }}>
                        {b.logo_url ? <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain rounded-xl" /> : <span className="text-sm font-black text-white">{b.name?.[0]}</span>}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.industry || "No industry"}</p>
                      </div>
                      {campaign.brand_id === b.id && <Check className="w-5 h-5 text-fuchsia-400 ml-auto" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: ACCOUNTS ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Social Accounts</h2>
              <p className="text-sm text-muted-foreground">Select which accounts to post to for this campaign.</p>
            </div>
            {brandAccounts.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-2xl">
                <Share2 className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="font-bold text-foreground">No accounts linked to {selectedBrand?.name}</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Add social accounts to your brand first</p>
                <button onClick={() => navigate("/brands")} className="px-4 py-2 rounded-xl bg-fuchsia-600 text-white text-sm font-bold hover:opacity-90">
                  Add in Brand Manager
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {brandAccounts.map(a => {
                  const plat = PLATFORMS.find(p => p.id === a.platform);
                  const selected = campaign.selected_accounts.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => setCampaign(p => ({
                      ...p,
                      selected_accounts: selected ? p.selected_accounts.filter(id => id !== a.id) : [...p.selected_accounts, a.id],
                      platforms: selected
                        ? p.platforms.filter(pl => pl !== a.platform)
                        : [...new Set([...p.platforms, a.platform])],
                    }))}
                      className={`p-4 rounded-xl border text-left transition ${selected ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-border hover:border-fuchsia-500/40"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plat?.color || "from-gray-500 to-gray-700"} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-sm font-black text-white">{a.platform?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{a.account_name}</p>
                          <p className="text-xs text-muted-foreground">{plat?.label}{a.username ? ` · @${a.username}` : ""}</p>
                        </div>
                        {selected && <Check className="w-5 h-5 text-fuchsia-400 ml-auto" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Also show all unlinked accounts */}
            {allAccounts.filter(a => !a.brand_id).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Other accounts (not linked to a brand):</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {allAccounts.filter(a => !a.brand_id).map(a => {
                    const plat = PLATFORMS.find(p => p.id === a.platform);
                    const selected = campaign.selected_accounts.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => setCampaign(p => ({
                        ...p,
                        selected_accounts: selected ? p.selected_accounts.filter(id => id !== a.id) : [...p.selected_accounts, a.id],
                        platforms: selected ? p.platforms.filter(pl => pl !== a.platform) : [...new Set([...p.platforms, a.platform])],
                      }))}
                        className={`p-3 rounded-xl border text-xs text-left transition ${selected ? "border-fuchsia-500/50 bg-fuchsia-500/5" : "border-border/50 hover:border-fuchsia-500/30"}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${plat?.color || "from-gray-500 to-gray-700"} flex items-center justify-center`}>
                            <span className="text-xs font-black text-white">{a.platform?.[0]?.toUpperCase()}</span>
                          </div>
                          <span className="text-foreground font-medium">{a.account_name}</span>
                          {selected && <Check className="w-3 h-3 text-fuchsia-400 ml-auto" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: CONTENT / SCRIPT ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Content & Script</h2>
                <p className="text-sm text-muted-foreground">AI-generate your copy, script, or ad content</p>
              </div>
              <button onClick={() => navigate("/script-writer")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-fuchsia-600/10 text-fuchsia-400 hover:bg-fuchsia-600/20 transition">
                <BookOpen className="w-3 h-3" /> Open Script Writer
              </button>
            </div>
            {/* Type selector */}
            <div>
              <label className={lbl}>Content Type</label>
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map(t => (
                  <button key={t.id} onClick={() => setCampaign(p => ({ ...p, content_type: t.id }))}
                    className={`p-2.5 rounded-xl border text-center text-xs transition ${campaign.content_type === t.id ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300" : "border-border text-muted-foreground hover:border-fuchsia-500/30"}`}>
                    <span className="text-lg block mb-1">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Tone */}
            <div>
              <label className={lbl}>Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button key={t} onClick={() => setCampaign(p => ({ ...p, tone: t }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${campaign.tone === t ? "bg-fuchsia-600 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {/* Prompt */}
            <div>
              <label className={lbl}>Topic / Brief *</label>
              <textarea value={campaign.ai_prompt} onChange={e => setCampaign(p => ({ ...p, ai_prompt: e.target.value }))} rows={3}
                placeholder="Describe what this content is about..."
                className={inp + " resize-none"} />
            </div>
            <div className="flex gap-2">
              <button onClick={generateContent} disabled={generating || !campaign.ai_prompt}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Generating..." : "Generate"}
              </button>
              <button onClick={generateAITopics} disabled={aiTopicLoading || !selectedBrand}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15 disabled:opacity-50 transition">
                {aiTopicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Suggest Topics
              </button>
            </div>
            {campaign.ai_output && (
              <div>
                <label className={lbl}>Output — Edit as needed</label>
                <textarea value={campaign.ai_output} onChange={e => setCampaign(p => ({ ...p, ai_output: e.target.value }))} rows={12}
                  className={inp + " resize-none font-mono text-xs leading-relaxed"} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: MEDIA ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Media Creation</h2>
              <p className="text-sm text-muted-foreground">Upload files, generate images/video, or provide reference material</p>
            </div>

            {/* Reference Images section — with consent gate */}
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-bold text-amber-300">Reference Images (Optional)</p>
              </div>
              <p className="text-xs text-amber-300/70">Upload reference images to guide AI style, mood, and visual direction. AI will match aesthetic — not replicate faces/identity.</p>

              {campaign.ref_images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {campaign.ref_images.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setCampaign(p => ({ ...p, ref_images: p.ref_images.filter((_, j) => j !== i) }))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Consent checkboxes */}
              {!allConsentGiven && (
                <div className="space-y-2">
                  {CONSENT_ITEMS.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox" checked={consentChecked[i]} onChange={e => {
                        const updated = [...consentChecked];
                        updated[i] = e.target.checked;
                        setConsentChecked(updated);
                      }} className="mt-0.5 accent-fuchsia-500" />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition">{item}</span>
                    </label>
                  ))}
                </div>
              )}

              {allConsentGiven && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Consent confirmed — reference upload unlocked
                </div>
              )}

              <button onClick={() => refMediaRef.current?.click()} disabled={!allConsentGiven || uploadingRef}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-medium hover:bg-white/15 disabled:opacity-40 transition">
                {uploadingRef ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploadingRef ? "Uploading..." : "Upload Reference Images"}
              </button>
              <input ref={refMediaRef} type="file" accept="image/*" multiple className="hidden" onChange={e => uploadMedia(e.target.files, true)} />
            </div>

            {/* Main media */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MEDIA_TYPES.filter(t => t.id !== "reference").map(t => (
                <button key={t.id} onClick={() => setCampaign(p => ({ ...p, media_choice: t.id }))}
                  className={`p-4 rounded-xl border text-center text-sm transition ${campaign.media_choice === t.id ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300" : "border-border text-muted-foreground hover:border-fuchsia-500/30"}`}>
                  <span className="text-2xl block mb-2">{t.icon}</span>
                  <p className="font-bold text-xs">{t.label}</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">{t.desc}</p>
                </button>
              ))}
              {/* Import from Media Studio */}
              <button onClick={() => { sessionStorage.setItem("mediaStudio_returnTo","campaign-studio"); navigate("/media-studio"); }}
                className="p-4 rounded-xl border border-dashed border-fuchsia-500/40 text-center text-sm text-fuchsia-400 hover:bg-fuchsia-500/5 transition">
                <span className="text-2xl block mb-2">🔗</span>
                <p className="font-bold text-xs">Media Studio</p>
                <p className="text-xs mt-0.5 text-muted-foreground">Generate then import</p>
            </div>

            {/* Upload section */}
            {(campaign.media_choice === "upload" || campaign.media_choice === "reference") && (
              <div>
                <label className={lbl}>Upload Media Files (multiple supported)</label>
                <div onClick={() => mediaRef.current?.click()}
                  className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-fuchsia-500/40 transition">
                  {uploadingMedia
                    ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-fuchsia-400" />
                    : <><Upload className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload images or videos</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Multiple files supported · JPG, PNG, MP4, MOV</p></>
                  }
                </div>
                <input ref={mediaRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => uploadMedia(e.target.files, false)} />
              </div>
            )}

            {/* Generate AI Image */}
            {campaign.media_choice === "ai_image" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">AI image will be based on your campaign brief and brand identity.</p>
                {campaign.ref_images.length > 0 && (
                  <p className="text-xs text-fuchsia-400">✓ {campaign.ref_images.length} reference image(s) will guide the style</p>
                )}
                <button onClick={generateImage} disabled={generatingMedia}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold hover:opacity-90 disabled:opacity-50">
                  {generatingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generatingMedia ? "Generating Image..." : "Generate AI Image"}
                </button>
              </div>
            )}

            {/* Generate AI Video */}
            {campaign.media_choice === "ai_video" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">AI video will be generated from your campaign brief.</p>
                {campaign.ref_images.length > 0 && (
                  <p className="text-xs text-fuchsia-400">✓ {campaign.ref_images.length} reference image(s) will guide the visual style</p>
                )}
                <button onClick={generateVideo} disabled={generatingMedia}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold hover:opacity-90 disabled:opacity-50">
                  {generatingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  {generatingMedia ? "Generating Video..." : "Generate AI Video"}
                </button>
              </div>
            )}

            {/* All generated/uploaded media preview — with edit/remove */}
            {(campaign.media_urls.length > 0 || generatedMedia.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={lbl}>All Media ({campaign.media_urls.length} files)</label>
                  <div className="flex gap-2">
                    <button onClick={() => mediaRef.current?.click()} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15 transition">
                      <Upload className="w-3 h-3" /> Add More
                    </button>
                    <button onClick={() => navigate("/media-studio")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-fuchsia-600/20 text-fuchsia-400 hover:bg-fuchsia-600/30 transition">
                      <Image className="w-3 h-3" /> Open Media Studio
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {campaign.media_urls.map((url, i) => {
                    const isVideo = url.includes("mp4") || url.includes("mov") || url.includes("webm") || generatedMedia.find(m => m.url === url)?.type === "video";
                    return (
                      <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10 group flex-shrink-0">
                        {isVideo
                          ? <video src={url} className="w-full h-full object-cover" />
                          : <img src={url} alt="" className="w-full h-full object-cover" />
                        }
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1.5">
                          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-white text-xs hover:bg-white/30"><Eye className="w-3 h-3" /> View</a>
                          <a href={url} download className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-white text-xs hover:bg-white/30"><Download className="w-3 h-3" /> Save</a>
                          <button onClick={() => { const updated = [...campaign.media_urls]; updated.splice(i,1); setCampaign(p=>({...p,media_urls:updated})); }}
                            className="flex items-center gap-1 px-2 py-1 bg-red-500/40 rounded text-white text-xs hover:bg-red-500/60"><X className="w-3 h-3" /> Remove</button>
                        </div>
                        {isVideo && <div className="absolute top-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-xs text-white font-bold">VIDEO</div>}
                        <div className="absolute bottom-1 right-1 bg-black/50 rounded px-1 text-xs text-white">{i+1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Platform + Caption + Hashtags (merged from Format step) ── */}
            <div className="border-t border-white/10 pt-5 space-y-4">
              <h3 className="font-bold text-foreground">Caption & Hashtags</h3>
              <div>
                <label className={lbl}>Target Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setCampaign(prev => ({
                      ...prev,
                      platforms: prev.platforms.includes(p.id) ? prev.platforms.filter(x => x !== p.id) : [...prev.platforms, p.id]
                    }))}
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold transition ${campaign.platforms.includes(p.id) ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300" : "border-border text-muted-foreground hover:border-fuchsia-500/30"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={lbl}>Caption</label>
                  <button onClick={generateContent} disabled={generating || !campaign.ai_prompt}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-fuchsia-600/20 text-fuchsia-400 hover:bg-fuchsia-600/30 disabled:opacity-40 transition">
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Re-generate
                  </button>
                </div>
                <textarea value={campaign.ai_output || campaign.caption}
                  onChange={e => setCampaign(p => ({ ...p, caption: e.target.value, ai_output: e.target.value }))} rows={6}
                  placeholder="Your caption will appear here after generation..."
                  className={inp + " resize-none"} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={lbl}>Hashtags</label>
                  <button onClick={async () => {
                    if (!campaign.ai_prompt && !selectedBrand) return;
                    setGenerating(true);
                    try {
                        type: "hashtag_set",
                        platform: campaign.platforms[0] || "instagram",
                        tone: campaign.tone,
                        prompt: `Generate 25 highly relevant hashtags for: "${campaign.ai_prompt || selectedBrand?.name}". Brand: ${selectedBrand?.name || ""}. Industry: ${selectedBrand?.industry || ""}. Output ONLY hashtags starting with # separated by spaces.`,
                      });
                      const raw = res?.content || res?.data?.content || res?.text || res?.data?.text || "";
                      const text = typeof raw === "string" ? raw : "";
                      setCampaign(p => ({ ...p, hashtags: text.trim() }));
                    } catch(e) { alert(e.message); }
                    setGenerating(false);
                  }} disabled={generating}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-fuchsia-600/20 text-fuchsia-400 hover:bg-fuchsia-600/30 disabled:opacity-40 transition">
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hash className="w-3 h-3" />} AI Hashtags
                  </button>
                </div>
                <textarea value={campaign.hashtags} onChange={e => setCampaign(p => ({ ...p, hashtags: e.target.value }))}
                  rows={3} placeholder="#yourbrand #marketing #trending — or click AI Hashtags"
                  className={inp + " resize-none text-fuchsia-300"} />
              </div>
            </div>
          </div>
        )}

        {/* Format step merged into Media step */}

        {/* ── STEP 4: SCHEDULE ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Schedule Posts</h2>
                <p className="text-sm text-muted-foreground">Plan up to 90 days. Each date creates one post.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={generateScheduleDates} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition">
                  <Calendar className="w-3 h-3" /> Auto-fill 12 Weeks
                </button>
                <button onClick={autoFillTopics} disabled={aiTopicLoading || !selectedBrand} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fuchsia-600/20 text-fuchsia-400 text-xs font-bold hover:bg-fuchsia-600/30 disabled:opacity-50 transition">
                  {aiTopicLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Fill Topics
                </button>
                <button onClick={addScheduleSlot} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-muted-foreground text-xs hover:bg-white/10 transition">
                  <Plus className="w-3 h-3" /> Add Slot
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {campaign.schedules.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{i+1}</span>
                  <input type="date" value={s.date} onChange={e => {
                    const updated = [...campaign.schedules];
                    updated[i] = { ...updated[i], date: e.target.value };
                    setCampaign(p => ({ ...p, schedules: updated }));
                  }} className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-fuchsia-500" />
                  <input type="time" value={s.time} onChange={e => {
                    const updated = [...campaign.schedules];
                    updated[i] = { ...updated[i], time: e.target.value };
                    setCampaign(p => ({ ...p, schedules: updated }));
                  }} className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-fuchsia-500" />
                  <input value={s.topic} onChange={e => {
                    const updated = [...campaign.schedules];
                    updated[i] = { ...updated[i], topic: e.target.value };
                    setCampaign(p => ({ ...p, schedules: updated }));
                  }} placeholder="Post topic (AI fills if blank)" className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-fuchsia-500" />
                  <button onClick={() => setCampaign(p => ({ ...p, schedules: p.schedules.filter((_, j) => j !== i) }))}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW & PUBLISH ── */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-foreground mb-1">Review & Publish</h2>
            {saved ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-2xl font-black text-foreground">Campaign Scheduled!</p>
                <p className="text-muted-foreground text-sm mt-2">{campaign.schedules.filter(s => s.date).length} posts queued</p>
                <div className="flex gap-3 justify-center mt-6">
                  <button onClick={() => navigate("/social-hub")} className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15">
                    View in Social Hub
                  </button>
                  <button onClick={() => { setSaved(false); setStep(0); setCampaign({ brand_id:"",campaign_name:"",content_type:"caption",ai_output:"",ai_prompt:"",tone:"Professional",platforms:["instagram"],selected_accounts:[],media_choice:"",media_urls:[],ref_images:[],ref_consent:false,caption:"",hashtags:"",media_type:"image",format:"feed",schedules:[{date:"",time:"09:00",topic:"",auto_topic:false}],notes:"" }); setGeneratedMedia([]); setConsentChecked([false,false,false,false]); }}
                    className="px-5 py-2.5 rounded-xl bg-fuchsia-600 text-white text-sm font-bold hover:opacity-90">
                    New Campaign
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Brand & Accounts</p>
                    <p className="font-bold text-foreground">{selectedBrand?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{campaign.selected_accounts.length} accounts · {campaign.platforms.join(", ")}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Content</p>
                    <p className="font-bold text-foreground capitalize">{campaign.content_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-foreground/80 line-clamp-3">{(campaign.ai_output || campaign.caption)?.slice(0, 150) || "No content yet"}</p>
                    {campaign.hashtags && <p className="text-xs text-fuchsia-400 line-clamp-1">{campaign.hashtags.slice(0, 80)}</p>}
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Media</p>
                    <p className="font-bold text-foreground">{campaign.media_urls.length} file(s)</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {campaign.media_urls.map((u,i) => {
                        const isVid = u.includes("mp4")||u.includes("mov")||u.includes("webm");
                        return isVid
                          ? <div key={i} className="w-10 h-10 rounded bg-black/50 border border-white/10 flex items-center justify-center text-xs text-white">🎬</div>
                          : <img key={i} src={u} alt="" className="w-10 h-10 rounded object-cover border border-white/10" />;
                      })}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Schedule</p>
                    <p className="font-bold text-foreground">{campaign.schedules.filter(s => s.date).length} posts</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.schedules.find(s => s.date)?.date || "No dates set"}
                      {campaign.schedules.filter(s=>s.date).length > 1 ? ` → ${campaign.schedules.filter(s=>s.date).slice(-1)[0]?.date}` : ""}
                    </p>
                  </div>
                </div>
                <button onClick={publishCampaign} disabled={saving || campaign.schedules.filter(s=>s.date).length === 0}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-black text-lg hover:opacity-90 disabled:opacity-50 transition">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {saving ? "Scheduling..." : `Schedule ${campaign.schedules.filter(s=>s.date).length} Post${campaign.schedules.filter(s=>s.date).length !== 1 ? "s" : ""}`}
                </button>
              </>
            )}
          </div>
        )}

      </div>

      {/* Navigation */}
      {!saved && (
        <div className="flex justify-between">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-30 transition">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
