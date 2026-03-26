import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, X, Volume2, VolumeX, MessageSquare, Bot, Loader2, Phone } from "lucide-react";

const SRI_FN   = "https://sreeagent.base44.app/functions/sriChat";
const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG";
const DEFAULT_COLOR    = "#d946ef";
const DEFAULT_NAME     = "Sree · MARKETER";
const DEFAULT_GREETING = "Hi! I am Sree, your marketing AI. Ask me about AI content creation, bulk messaging, social scheduling, funnels, or lead generation!";
const SITE_SYSTEM_PROMPT = "You are Sree, the AI assistant for MARKETER at media.aevoice.ai. MARKETER is a full-stack AI marketing OS. Features: AI generates posts, ads, emails and scripts; schedules to 10+ social platforms; bulk SMS, WhatsApp and email campaigns; visual funnel builder with A/B testing; lead capture with CRM sync; website auto-scan; ROI analytics; AI media studio. Plans: Starter $49/mo, Growth $149/mo, Agency $399/mo. URL: https://media.aevoice.ai. The omnichannel AI platform for voice calls, SMS, web chat, WhatsApp, email, and social media. Under 100 words.";

function getConfig() {
  const p = new URLSearchParams(window.location.search);
  return {
    name:     p.get("name")     || DEFAULT_NAME,
    color:    p.get("color")    || DEFAULT_COLOR,
    greeting: p.get("greeting") || DEFAULT_GREETING,
    mode:     p.get("mode")     || "both",
    lang:     p.get("lang")     || "en-US",
    position: p.get("position") || "bottom-right",
  };
}

export default function WidgetHost() {
  const cfg = getConfig();
  const [isOpen, setIsOpen]       = useState(false);
  const [mode, setMode]           = useState("text");
  const [messages, setMessages]   = useState([{ role: "assistant", content: cfg.greeting }]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const [voiceOn, setVoiceOn]     = useState(true);
  const [liveText, setLiveText]   = useState("");
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceOk, setVoiceOk]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const recRef = useRef(null); const audioRef = useRef(null); const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!isOpen && messages.length > 1) setUnread(n => n + 1);
    if (isOpen) setUnread(0);
  }, [messages]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setVoiceOk(true);
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = cfg.lang;
    rec.onresult = (e) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      setLiveText(final || interim);
      if (final) { setListening(false); setLiveText(""); send(final, "voice"); }
    };
    rec.onerror = () => { setListening(false); setVoiceStatus("idle"); };
    rec.onend   = () => setListening(false);
    recRef.current = rec;
  }, []);

  const send = useCallback(async (text, sendMode = "text") => {
    const t = (text || input).trim();
    if (!t || loading) return;
    if (sendMode === "text") setInput("");
    setLoading(true);
    setVoiceStatus(sendMode === "voice" ? "processing" : "idle");
    setMessages(prev => [...prev, { role: "user", content: t }]);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(SRI_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, history, systemPrompt: SITE_SYSTEM_PROMPT, mode: sendMode === "voice" && voiceOn ? "voice" : "text" }),
      });
      const data = await res.json();
      const reply = data?.reply || data?.content || "How can I help?";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (sendMode === "voice" && voiceOn) {
        if (data?.audio) {
          setVoiceStatus("speaking"); setSpeaking(true);
          try {
            const bytes = new Uint8Array(atob(data.audio).split("").map(c => c.charCodeAt(0)));
            const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mp3" }));
            const a = new Audio(url); audioRef.current = a;
            a.onended = () => { setSpeaking(false); setVoiceStatus("idle"); URL.revokeObjectURL(url); };
            await a.play();
          } catch { setSpeaking(false); setVoiceStatus("idle"); }
        } else {
          const utt = new SpeechSynthesisUtterance(reply.substring(0, 200));
          utt.lang = cfg.lang;
          utt.onend = () => { setSpeaking(false); setVoiceStatus("idle"); };
          setVoiceStatus("speaking"); setSpeaking(true);
          speechSynthesis.speak(utt);
        }
      } else {
        setVoiceStatus("idle");
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error — please try again." }]);
      setVoiceStatus("idle");
    }
    setLoading(false);
  }, [input, messages, loading, voiceOn, cfg]);

  const startListen = () => {
    if (!recRef.current) return;
    if (audioRef.current) { audioRef.current.pause(); setSpeaking(false); }
    speechSynthesis.cancel();
    setListening(true); setVoiceStatus("listening"); setLiveText("");
    try { recRef.current.start(); } catch { setListening(false); setVoiceStatus("idle"); }
  };
  const stopListen = () => { recRef.current?.stop(); setListening(false); setVoiceStatus("idle"); };

  const pc  = cfg.color;
  const pos = cfg.position === "bottom-left" ? "left-6" : "right-6";

  if (!isOpen) return (
    <div className={`fixed bottom-6 ${pos} z-[9999]`}>
      <button onClick={() => setIsOpen(true)}
        style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}
        className="w-14 h-14 rounded-full text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center relative">
        <MessageSquare className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">{unread}</span>
        )}
      </button>
      <p className="text-[9px] text-center mt-1 text-slate-400 font-medium">{cfg.name}</p>
    </div>
  );

  return (
    <div className={`fixed bottom-6 ${pos} z-[9999] w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0d1526]`}
      style={{ maxHeight: "min(600px, calc(100vh - 80px))" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${pc}ee, ${pc}88)` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
            <img src={LOGO_URL} alt="" className="w-full h-full object-cover"
              onError={e => { e.target.style.display = "none"; }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{cfg.name}</p>
            <p className="text-[10px] text-white/70 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                voiceStatus === "listening"  ? "bg-red-400 animate-pulse" :
                voiceStatus === "processing" ? "bg-amber-400 animate-pulse" :
                voiceStatus === "speaking"   ? "bg-blue-400 animate-pulse" :
                "bg-emerald-400"
              }`} />
              {voiceStatus === "idle" ? "Online" : voiceStatus === "listening" ? "Listening..." :
               voiceStatus === "processing" ? "Thinking..." : "Speaking..."}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {voiceOk && cfg.mode !== "text" && (
            <button onClick={() => setMode(m => m === "text" ? "voice" : "text")}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors">
              {mode === "text" ? <Phone className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => setVoiceOn(v => !v)} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors">
            {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voice mode */}
      {mode === "voice" && voiceOk && cfg.mode !== "text" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#0d1526] to-[#060c1a] min-h-[280px]">
          <div className="relative mb-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${listening ? "scale-110" : ""}`}
              style={{ background: `radial-gradient(circle, ${pc}dd, ${pc})`, boxShadow: listening ? `0 0 40px ${pc}50` : `0 8px 30px ${pc}25` }}>
              {speaking ? <Volume2 className="w-9 h-9" /> : loading ? <Loader2 className="w-9 h-9 animate-spin" /> : <Mic className="w-9 h-9" />}
            </div>
            {listening && <div className="absolute inset-0 rounded-full border-4 animate-ping" style={{ borderColor: `${pc}40` }} />}
          </div>
          <p className="font-semibold text-base text-white mb-1">
            {listening ? "Listening..." : speaking ? "Speaking..." : loading ? "Thinking..." : "Tap to speak"}
          </p>
          {liveText && <p className="text-sm text-slate-400 italic mb-3 text-center max-w-[240px]">"{liveText}"</p>}
          {messages.length > 1 && messages[messages.length - 1].role === "assistant" && (
            <div className="max-w-[260px] rounded-2xl bg-white/5 p-3 mb-5 text-center">
              <p className="text-xs text-slate-300">
                {messages[messages.length - 1].content.substring(0, 120)}
                {messages[messages.length - 1].content.length > 120 ? "..." : ""}
              </p>
            </div>
          )}
          <button onClick={listening ? stopListen : startListen} disabled={loading || speaking}
            className="h-11 px-7 rounded-full text-white font-semibold text-sm disabled:opacity-50 shadow-lg transition-all"
            style={{ background: listening ? "#ef4444" : `linear-gradient(135deg, ${pc}, ${pc}cc)`, boxShadow: `0 4px 20px ${pc}40` }}>
            {listening ? "Stop" : "Speak"}
          </button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d1526]">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white"
                    style={{ background: `linear-gradient(135deg, ${pc}, ${pc}aa)` }}>
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "text-white rounded-tr-sm" : "bg-white/5 text-slate-200 rounded-tl-sm"
                }`} style={m.role === "user" ? { background: `linear-gradient(135deg, ${pc}, ${pc}cc)` } : {}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 text-white flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${pc}, ${pc}aa)` }}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white/5">
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {/* Input */}
          <div className="px-3 py-3 border-t border-white/5 bg-[#0d1526] flex-shrink-0">
            <form onSubmit={e => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Message ${cfg.name}...`}
                className="flex-1 text-sm bg-transparent outline-none text-white placeholder-slate-600" />
              {voiceOk && cfg.mode !== "text" && (
                <button type="button" onClick={listening ? stopListen : startListen}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    listening ? "bg-red-500 text-white" : "bg-white/10 text-slate-400 hover:bg-white/20"
                  }`}>
                  {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
              <button type="submit" disabled={loading || !input.trim()}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[9px] text-center mt-1.5 text-slate-500">
              Powered by <strong className="text-slate-400">AEVOICE.AI</strong> · Sree: The assistant no business can afford to be without.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
