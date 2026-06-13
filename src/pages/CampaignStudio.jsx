import { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2, FileText, Image as ImageIcon, Calendar, Check, Loader2, X, Upload, Plus, Share2, Sparkles, CheckCircle2, Wand2 } from "lucide-react";

const STEPS = [
  { id: "brand", label: "Brand", icon: Building2 },
  { id: "accounts", label: "Accounts", icon: Share2 },
  { id: "content", label: "Content", icon: FileText },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "review", label: "Review", icon: CheckCircle2 }
];

const inp = "w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-fuchsia-500/70 focus:ring-1 focus:ring-fuchsia-500/50 transition-all";
const lbl = "block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2";

export default function CampaignStudio() {
  const { user } = useOutletContext() || {};
  const qc = useQueryClient();
  const navigate = useNavigate();
  const mediaRef = useRef();

  const [step, setStep] = useState(0);
  const [campaign, setCampaign] = useState({
    brand_id: "", campaign_name: "", content_type: "caption", ai_output: "", ai_prompt: "",
    tone: "Professional", platforms: ["instagram"], selected_accounts: [],
    media_urls: [], caption: "", hashtags: "",
    schedules: [{ date: "", time: "09:00", topic: "", auto_topic: false }]
  });

  const [generating, setGenerating] = useState(false);
  const [generatingMedia, setGeneratingMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: () => base44.entities.Brand.list("-created_date", 20) });
  const { data: allAccounts = [] } = useQuery({ queryKey: ["social_accounts"], queryFn: () => base44.entities.SocialAccount.list("-created_date", 100) });

  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("campaignStudio_prefill");
      if (prefill) {
        const data = JSON.parse(prefill);
        setCampaign(p => ({ ...p, ...data }));
        if (data.ai_output) setStep(2);
        sessionStorage.removeItem("campaignStudio_prefill");
      }
    } catch (e) { console.error(e); }

    try {
      const mediaImport = sessionStorage.getItem("mediaImportData");
      if (mediaImport) {
        const urls = JSON.parse(mediaImport);
        setCampaign(p => ({ ...p, media_urls: [...new Set([...p.media_urls, ...urls])] }));
        setStep(3);
        sessionStorage.removeItem("mediaImportData");
      }
    } catch (e) { console.error(e); }
  }, []);

  const selectedBrand = brands.find(b => b.id === campaign.brand_id);
  const brandAccounts = allAccounts.filter(a => a.brand_id === campaign.brand_id);

  const generateContent = async () => {
    if (!campaign.ai_prompt.trim()) return;
    setGenerating(true);
    const brandContext = selectedBrand ? `\n\nBrand: ${selectedBrand.name}.` : "";
    
    try {
      const res = await fetch("/api/functions/generateMediaContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: campaign.content_type, platform: campaign.platforms[0], tone: campaign.tone, prompt: `${campaign.ai_prompt}${brandContext}` })
      }).then(r => r.json());

      const raw = res?.content || res?.data?.content || "";
      const text = typeof raw === "string" ? raw : JSON.stringify(raw);
      setCampaign(p => ({ ...p, ai_output: text, caption: text }));
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const uploadMedia = async (files) => {
    if (!files?.length) return;
    const urls = [];
    for (const file of Array.from(files)) {
      try { urls.push(await base44.storage.uploadFile(file)); } catch (e) { console.error(e); }
    }
    setCampaign(p => ({ ...p, media_urls: [...p.media_urls, ...urls] }));
  };

  const generateImage = async () => {
    if (!campaign.ai_prompt.trim()) return;
    setGeneratingMedia(true);
    try {
      const res = await base44.integrations.Core.GenerateImage({ prompt: `${campaign.ai_prompt}. High quality marketing image.` });
      if (res?.url) setCampaign(p => ({ ...p, media_urls: [...p.media_urls, res.url] }));
    } catch (e) { console.error(e); }
    setGeneratingMedia(false);
  };

  const publishCampaign = async () => {
    setSaving(true);
    setTimeout(() => { setSaved(true); setSaving(false); }, 1500); // Replace with actual API save
  };

  const canNext = () => (step === 0 ? !!campaign.brand_id : true);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 p-4">
      
      {/* Sleek Header */}
      <div>
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-600 flex items-center gap-3">
          <Sparkles className="text-fuchsia-500" /> Campaign Studio
        </h1>
        <p className="text-neutral-400 mt-2">Design, generate, and deploy your marketing at scale.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === i;
          const isPast = i < step;
          return (
            <button key={s.id} onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 border ${
                isActive ? "bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.15)]" : 
                isPast ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 cursor-pointer" : 
                "bg-transparent border-transparent text-neutral-600 cursor-not-allowed"
              }`}>
              {isPast ? <Check className="w-4 h-4 text-emerald-500" /> : <Icon className="w-4 h-4" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 min-h-[450px] shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        {/* STEP 0: BRAND */}
        {step === 0 && (
          <div className="space-y-8 relative z-10">
            <div>
              <label className={lbl}>Campaign Details</label>
              <input value={campaign.campaign_name} onChange={e => setCampaign(p => ({ ...p, campaign_name: e.target.value }))} placeholder="Campaign Name (e.g. Summer Sale 2026)" className={inp} />
            </div>
            <div>
              <label className={lbl}>Select Brand Identity</label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.map(b => (
                  <button key={b.id} onClick={() => setCampaign(p => ({ ...p, brand_id: b.id }))}
                    className={`p-6 rounded-2xl border text-left transition-all ${campaign.brand_id === b.id ? "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_20px_rgba(217,70,239,0.1)]" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"}`}>
                    <p className="font-bold text-lg text-white">{b.name}</p>
                    <p className="text-xs text-neutral-500 mt-1">{b.industry || "General"}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: ACCOUNTS (With Empty State) */}
        {step === 1 && (
          <div className="space-y-6 relative z-10">
            <h2 className="text-xl font-bold text-white">Target Social Accounts</h2>
            
            {brandAccounts.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-neutral-800 rounded-3xl bg-neutral-900/50">
                <Share2 className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                <p className="text-lg font-bold text-white mb-2">No accounts found</p>
                <p className="text-sm text-neutral-400 mb-6 max-w-md mx-auto">This brand doesn't have any social media accounts linked yet. You can still create the campaign, but scheduling requires an account.</p>
                <button onClick={() => navigate("/brand-manager")} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-sm font-medium transition-colors">
                  Go to Brand Manager
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brandAccounts.map(a => {
                  const selected = campaign.selected_accounts.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => setCampaign(p => ({
                      ...p,
                      selected_accounts: selected ? p.selected_accounts.filter(id => id !== a.id) : [...p.selected_accounts, a.id],
                    }))}
                      className={`p-5 rounded-2xl border text-left transition-all flex items-center justify-between ${selected ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"}`}>
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

        {/* STEP 2: CONTENT */}
        {step === 2 && (
          <div className="space-y-6 relative z-10">
            <h2 className="text-xl font-bold text-white">AI Content Engine</h2>
            <textarea value={campaign.ai_prompt} onChange={e => setCampaign(p => ({ ...p, ai_prompt: e.target.value }))} placeholder="What are we promoting?" rows={3} className={inp} />
            <button onClick={generateContent} disabled={generating || !campaign.ai_prompt} className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />} Generate Campaign Copy
            </button>
            {campaign.ai_output && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <label className={lbl}>AI Output</label>
                <textarea value={campaign.ai_output} onChange={e => setCampaign(p => ({ ...p, ai_output: e.target.value, caption: e.target.value }))} rows={10} className={`${inp} font-mono text-sm leading-relaxed`} />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: MEDIA */}
        {step === 3 && (
          <div className="space-y-6 relative z-10">
            <h2 className="text-xl font-bold text-white">Media Assets</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <button onClick={() => mediaRef.current?.click()} className="p-8 border-2 border-dashed border-neutral-700 rounded-2xl bg-neutral-900/50 text-center hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all group">
                <Upload className="w-8 h-8 mx-auto text-neutral-500 group-hover:text-fuchsia-400 mb-3 transition-colors" /> 
                <span className="font-bold text-white">Upload Files</span>
              </button>
              <button onClick={generateImage} disabled={generatingMedia} className="p-8 border-2 border-dashed border-neutral-700 rounded-2xl bg-neutral-900/50 text-center hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all group">
                {generatingMedia ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-fuchsia-500" /> : <ImageIcon className="w-8 h-8 mx-auto text-neutral-500 group-hover:text-fuchsia-400 mb-3 transition-colors" />} 
                <span className="font-bold text-white">Generate AI Image</span>
              </button>
            </div>
            <input ref={mediaRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => uploadMedia(e.target.files)} />
            
            {campaign.media_urls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                {campaign.media_urls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-800 group">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setCampaign(p => ({ ...p, media_urls: p.media_urls.filter((_, j) => j !== i) }))} className="absolute top-2 right-2 bg-black/70 backdrop-blur-md rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4 text-white" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: SCHEDULE */}
        {step === 4 && (
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Schedule Timeline</h2>
              <button onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 1);
                setCampaign(p => ({ ...p, schedules: [...p.schedules, { date: d.toISOString().split("T")[0], time: "09:00", topic: "" }] }))
              }} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-xs font-bold text-white transition-colors flex items-center gap-2">
                <Plus className="w-3 h-3" /> Add Slot
              </button>
            </div>
            <div className="space-y-3">
              {campaign.schedules.map((s, i) => (
                <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
                  <span className="w-6 text-center text-neutral-500 font-mono text-xs">{i+1}</span>
                  <input type="date" value={s.date} onChange={e => { const updated = [...campaign.schedules]; updated[i].date = e.target.value; setCampaign(p => ({ ...p, schedules: updated })); }} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white" />
                  <input type="time" value={s.time} onChange={e => { const updated = [...campaign.schedules]; updated[i].time = e.target.value; setCampaign(p => ({ ...p, schedules: updated })); }} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white" />
                  <input value={s.topic} placeholder="Post Topic / Summary" onChange={e => { const updated = [...campaign.schedules]; updated[i].topic = e.target.value; setCampaign(p => ({ ...p, schedules: updated })); }} className="flex-1 min-w-[200px] bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600" />
                  <button onClick={() => setCampaign(p => ({ ...p, schedules: p.schedules.filter((_, j) => j !== i) }))} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="space-y-6 text-center py-12 relative z-10">
            {saved ? (
              <div className="animate-in zoom-in slide-in-from-bottom-4 duration-700">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <p className="text-4xl font-black text-white mb-3">Pipeline Executed</p>
                <p className="text-neutral-400 text-lg mb-8">Your campaign is queued for publishing.</p>
                <button onClick={() => navigate("/social-hub")} className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-full font-bold text-white transition-colors">
                  Go to Social Hub
                </button>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <Wand2 className="w-16 h-16 text-fuchsia-500 mx-auto mb-6 opacity-80" />
                <h2 className="text-3xl font-black text-white mb-2">Ready to Launch?</h2>
                <p className="text-neutral-400 mb-8">Review your timeline and execute the campaign.</p>
                <button onClick={publishCampaign} disabled={saving} className="w-full py-5 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-black text-xl hover:opacity-90 shadow-[0_0_40px_rgba(217,70,239,0.4)] transition-all flex items-center justify-center gap-3">
                  {saving ? <Loader2 className="animate-spin" /> : "Deploy Campaign"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      {!saved && (
        <div className="flex justify-between items-center mt-8">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="px-6 py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-full font-bold text-white disabled:opacity-30 transition-colors">
            Back
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()} className="px-8 py-3 bg-white hover:bg-neutral-200 text-black rounded-full font-black disabled:opacity-50 transition-colors">
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}