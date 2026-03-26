import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Cpu, Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft, UserPlus } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/Dashboard";

  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ email: "", password: "", name: "" });
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg,   setMsg]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("base44_access_token");
    if (token) navigate(from, { replace: true });
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setMsg("");
    try {
      if (mode === "login") {
        await base44.auth.login({ email: form.email, password: form.password });
        navigate(from, { replace: true });
      } else if (mode === "signup") {
        await base44.auth.signup({ email: form.email, password: form.password, full_name: form.name });
        navigate("/Pricing", { replace: true });
      } else {
        await base44.auth.requestPasswordReset({ email: form.email });
        setMsg("Reset link sent — check your email.");
      }
    } catch (err) {
      setError(err?.message || err?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-700/5 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-sm relative z-10">
        <button onClick={() => navigate("/Home")} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </button>
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-4 shadow-2xl shadow-violet-500/30">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">MARKETER · media.aevoice.ai</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Full Name</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type="text" value={form.name} onChange={e=>setForm(p=>{...p,name:e.target.value})} placeholder="Your name" required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder-slate-600" />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input type="email" value={form.email} onChange={e=>setForm(p=>{...p,email:e.target.value})} placeholder="you@media.aevoice.ai" required
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder-slate-600" />
            </div>
          </div>
          {mode !== "reset" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">Password</label>
                {mode === "login" && (
                  <button type="button" onClick={()=>setMode("reset")} className="text-xs text-violet-500/70 hover:text-violet-500">Forgot?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type={show?"text":"password"} value={form.password} onChange={e=>setForm(p=>{...p,password:e.target.value})} placeholder="••••••••" required
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder-slate-600" />
                <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                  {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
          )}
          {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">{error}</div>}
          {msg   && <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl">{msg}</div>}
          <button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-700 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 mt-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Working…</> :
              mode === "login" ? "Sign In to MARKETER" :
              mode === "signup" ? "Create Account →" : "Send Reset Link"}
          </button>
        </form>
        <div className="mt-5 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <>No account? <button onClick={()=>setMode("signup")} className="text-violet-500 hover:opacity-80 font-medium">Sign up free</button></>
          ) : mode === "signup" ? (
            <>Already have an account? <button onClick={()=>setMode("login")} className="text-violet-500 hover:opacity-80 font-medium">Sign in</button></>
          ) : (
            <button onClick={()=>setMode("login")} className="text-violet-500 hover:opacity-80">Back to sign in</button>
          )}
        </div>
        <div className="mt-8 flex items-center justify-center gap-2">
          {["Home","Login","Plan","Dashboard"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${
                step === "Login" ? "bg-violet-500/20 text-violet-500 border border-violet-500/30" : "text-slate-600"
              }`}>
                <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px]"
                  style={{borderColor: step==="Login"?"currentColor":"rgb(71,85,105)"}}>{i+1}</span>
                {step}
              </div>
              {i < 3 && <span className="text-slate-700">›</span>}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-700 mt-4">Part of AEVOICE.AI — The ultimate business technology.</p>
      </div>
    </div>
  );
}
