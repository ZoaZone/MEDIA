import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  FileText, Wand2, Copy, RefreshCw, CheckCircle2, Loader2,
  History, ChevronRight, Sparkles, Image, Video, Trash2,
  ArrowRight, Play, Clock, Download, BookOpen, X, Send
} from "lucide-react";

const TYPES = [
  { v: "video_script",    l: "Video Script",    icon: "🎬" },
  { v: "ad_script",       l: "Ad Script",       icon: "📢" },
  { v: "email_sequence",  l: "Email Sequence",  icon: "📧" },
  { v: "cold_outreach",   l: "Cold Outreach",   icon: "🤝" },
  { v: "follow_up",       l: "Follow-Up",       icon: "🔄" },
  { v: "pitch",           l: "Sales Pitch",     icon: "💼" },
];
const PLATFORMS = ["General","Instagram","TikTok","YouTube","LinkedIn","Facebook","Email","SMS"];
const TONES = ["Professional","Casual","Exciting","Urgent","Friendly","Luxury","Humorous","Inspirational"];
const DURATIONS = [{ v: 30, l: "30s" },{ v: 60, l: "1 min" },{ v: 120, l: "2 min" },{ v: 300, l: "5 min" },{ v: 600, l: "10 min" }];

export default function ScriptWriter() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: "video_script", platform: "General", tone: "Professional", duration_seconds: 60, prompt: "" });
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Load saved scripts (history)
  const { data: scripts = [], isLoading: historyLoading } = useQuery({
    queryKey: ["script_history"],
    queryFn: () => base44.entities.ScriptTemplate.list("-created_date", 50),
  });

  const generate = async () => {
    if (!form.prompt) { alert("Enter a topic or brief first"); return; }
    setLoading(true); setOutput(""); setSavedId(null);
    try {
      const typeLabel = TYPES.find(t => t.v === form.type)?.l || form.type;
      const res = await base44.functions.invoke("generateMediaContent", {
        type: form.type,
        platform: form.platform,
        tone: form.tone,
        prompt: `Write a ${form.tone.toLowerCase()} ${typeLabel} for ${form.platform}.\n\nTopic / Brief: ${form.prompt}\n\nDuration: ~${form.duration_seconds} seconds.\n\nStructure:\n- HOOK (first 3 seconds — grabs attention immediately)\n- BODY (main message, scenes, dialogue)\n- CTA (clear call to action at the end)\n\nInclude scene descriptions, camera direction notes, and any text overlays. Make it ready to shoot.`,
      });
      const text = res?.content || res?.data?.content || res?.text || res?.data?.text || "";
      setOutput(typeof text === "string" ? text : JSON.stringify(text));
    } catch (e) { setOutput("Error: " + e.message); }
    setLoading(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    if (!output) return;
    setSaving(true);
    try {
      const record = await base44.entities.ScriptTemplate.create({
        type: form.type,
        platform: form.platform,
        tone: form.tone,
        title: form.prompt.slice(0, 80),
        content: output,
        duration_seconds: form.duration_seconds,
        ai_generated: true,
      });
      setSavedId(record.id);
      qc.invalidateQueries(["script_history"]);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const deleteScript = async (id) => {
    if (!confirm("Delete this script?")) return;
    setDeleting(id);
    try {
      await base44.entities.ScriptTemplate.delete(id);
      qc.invalidateQueries(["script_history"]);
      if (selectedScript?.id === id) setSelectedScript(null);
    } catch (e) { alert(e.message); }
    setDeleting(null);
  };

  const loadScript = (script) => {
    setForm({
      type: script.type || "video_script",
      platform: script.platform || "General",
      tone: script.tone || "Professional",
      duration_seconds: script.duration_seconds || 60,
      prompt: script.title || "",
    });
    setOutput(script.content || "");
    setSavedId(script.id);
    setSelectedScript(script);
    setShowHistory(false);
  };

  // Send script to Campaign Studio as content
  const sendToCampaign = () => {
    if (!output) return;
    // Store in sessionStorage for Campaign Studio to pick up
    sessionStorage.setItem("campaignStudio_prefill", JSON.stringify({
      content_type: "video_script",
      ai_output: output,
      ai_prompt: form.prompt,
      campaign_name: form.prompt.slice(0, 60),
    }));
    navigate("/campaign-studio");
  };

  // Send script to Media Studio for video generation
  const sendToMediaStudio = () => {
    if (!output) return;
    sessionStorage.setItem("mediaStudio_prefill", JSON.stringify({
      type: "ai_video",
      prompt: `${form.prompt}. Script:\n${output.slice(0, 400)}`,
      platform: form.platform,
      tone: form.tone,
    }));
    navigate("/media-studio");
  };

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.prompt.slice(0, 30)}_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-fuchsia-400" /> Script Writer
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered scripts — video, ad, email, pitch and more</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${showHistory ? "bg-fuchsia-600 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"}`}
        >
          <History className="w-4 h-4" />
          History ({scripts.length})
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Left — config */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-foreground">Configure Script</h3>

            {/* Script type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Script Type</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button key={t.v} onClick={() => setForm(p => ({ ...p, type: t.v }))}
                    className={`p-2.5 rounded-xl border text-left transition text-xs ${form.type === t.v ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                    <span className="text-base mr-1">{t.icon}</span>{t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Platform</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${form.platform === p ? "bg-fuchsia-600 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${form.tone === t ? "bg-fuchsia-600 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d.v} onClick={() => setForm(f => ({ ...f, duration_seconds: d.v }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${form.duration_seconds === d.v ? "bg-fuchsia-600 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Topic / Brief *</label>
              <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} rows={4}
                placeholder="Describe what the script is about, the product, the message, or paste your brief..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-fuchsia-500 resize-none" />
            </div>

            <button onClick={generate} disabled={loading || !form.prompt}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {loading ? "Writing Script..." : "Generate Script"}
            </button>
          </div>
        </div>

        {/* Right — output */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-white/10 rounded-2xl p-5 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-fuchsia-400" /> Script Output
              </h3>
              {output && (
                <div className="flex gap-2">
                  <button onClick={generate} disabled={loading} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition" title="Regenerate">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={copy} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition" title="Copy">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={download} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
                <p className="text-muted-foreground text-sm">Writing your script...</p>
              </div>
            ) : output ? (
              <textarea value={output} onChange={e => setOutput(e.target.value)} rows={20}
                className="w-full bg-transparent text-sm text-foreground focus:outline-none resize-none leading-relaxed font-mono" />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-medium">Your script will appear here</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Configure and click Generate Script</p>
              </div>
            )}
          </div>

          {/* Action bar — only show when output exists */}
          {output && (
            <div className="bg-card border border-white/10 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What would you like to do next?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={save} disabled={saving || !!savedId}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${savedId ? "bg-emerald-500/20 text-emerald-400 cursor-default" : "bg-white/10 text-foreground hover:bg-white/15"}`}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedId ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {saving ? "Saving..." : savedId ? "Saved!" : "Save to History"}
                </button>
                <button onClick={sendToMediaStudio}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-sm font-bold hover:bg-rose-500/30 transition">
                  <Video className="w-4 h-4" /> Generate Video
                </button>
                <button onClick={sendToCampaign}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition">
                  <Send className="w-4 h-4" /> Use in Campaign
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-fuchsia-400" /> Saved Scripts ({scripts.length})
            </h3>
            <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" /></div>
          ) : scripts.length === 0 ? (
            <div className="text-center py-10">
              <History className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground text-sm">No saved scripts yet. Generate and save one!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scripts.map(s => {
                const typeInfo = TYPES.find(t => t.v === s.type);
                return (
                  <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-fuchsia-500/30 transition group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">{typeInfo?.icon || "📄"}</span>
                        <p className="font-semibold text-foreground text-sm truncate">{s.title || "Untitled Script"}</p>
                      </div>
                      <button onClick={() => deleteScript(s.id)} disabled={deleting === s.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex-shrink-0">
                        {deleting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400">{typeInfo?.l || s.type}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">{s.platform}</span>
                      {s.duration_seconds && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{s.duration_seconds}s</span>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{s.content?.slice(0, 100)}...</p>
                    <div className="flex gap-2">
                      <button onClick={() => loadScript(s)}
                        className="flex-1 py-1.5 rounded-lg bg-fuchsia-600/20 text-fuchsia-400 text-xs font-bold hover:bg-fuchsia-600/30 transition">
                        Load
                      </button>
                      <button onClick={() => { setSelectedScript(s); setOutput(s.content); sendToMediaStudio(); }}
                        className="py-1.5 px-2 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition" title="Generate Video">
                        <Video className="w-3 h-3" />
                      </button>
                      <button onClick={() => { loadScript(s); setTimeout(sendToCampaign, 100); }}
                        className="py-1.5 px-2 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition" title="Use in Campaign">
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
