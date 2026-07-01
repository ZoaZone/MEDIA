import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle2, RefreshCw, Shield } from "lucide-react";

const LOGO = "/logo.png";
const BRAND = "media.aevoice.ai";
const TAGLINE = "AI Marketing & Media Platform";
const DASHBOARD = "/dashboard";

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange, disabled }) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  const refs = Array.from({ length: 6 }, () => null);
  const setRef = (i) => (el) => { refs[i] = el; };

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = value.slice(0, i) + value.slice(i + 1);
        onChange(next);
      } else if (i > 0) {
        refs[i - 1]?.focus();
        const next = value.slice(0, i - 1) + value.slice(i);
        onChange(next);
      }
      return;
    }
    if (/^\d$/.test(e.key)) {
      const next = (value.slice(0, i) + e.key + value.slice(i + 1)).slice(0, 6);
      onChange(next);
      if (i < 5) refs[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) { onChange(pasted); refs[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={setRef(i)} type="text" inputMode="numeric" maxLength={1}
          value={d} disabled={disabled}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          onChange={() => {}}
          className="w-11 h-12 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-xl font-bold focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50 select-none"
        />
      ))}
    </div>
  );
}

// ─── Password strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const score = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-500", "bg-amber-500", "bg-emerald-400", "bg-emerald-500"];
  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className={`h-1 flex-1 rounded-full transition-all ${n <= score ? colors[score] : "bg-slate-700"}`} />
        ))}
      </div>
      <p className="text-[10px] text-slate-500">{labels[score] || "Too short (min 8)"}</p>
    </div>
  );
}

// ─── Main Auth Page ─────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || DASHBOARD;

  const [mode, setMode] = useState("login");   // login | signup | reset
  const [flow, setFlow] = useState("email");   // email | otp | password | done
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Already logged in — skip to dashboard
  useEffect(() => {
    const token = localStorage.getItem("base44_access_token");
    if (!token) return;
    base44.auth.me()
      .then(() => navigate(DASHBOARD, { replace: true }))
      .catch(() => { localStorage.removeItem("base44_access_token"); localStorage.removeItem("token"); });
  }, []);

  const resetFlow = (newMode) => {
    setMode(newMode); setFlow("email"); setOtp(""); setPassword(""); setConfirm(""); setError(""); setInfo("");
  };

  // ── Step 1: Send OTP ─────────────────────────────────────────────────────
  const sendOTP = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setOtpSending(true); setError("");
    try {
      await base44.functions.invoke("sendAuthOTP", { action: "send", email: email.trim().toLowerCase(), purpose: mode });
      setFlow("otp");
    } catch (err) {
      setError(err?.message || "Failed to send verification code. Please try again.");
    } finally { setOtpSending(false); }
  };

  const resendOTP = async () => {
    setResending(true); setError(""); setResent(false); setOtp("");
    try {
      await base44.functions.invoke("sendAuthOTP", { action: "send", email: email.trim().toLowerCase(), purpose: mode });
      setResent(true);
      setTimeout(() => setResent(false), 6000);
    } catch (err) { setError("Failed to resend. Please try again."); }
    setResending(false);
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const verifyOTP = async (code) => {
    const finalCode = code || otp;
    if (finalCode.length < 6) return;
    setLoading(true); setError("");
    try {
      await base44.functions.invoke("sendAuthOTP", { action: "verify", email: email.trim().toLowerCase(), otp: finalCode.trim(), purpose: mode });
      setFlow("password");
    } catch (err) {
      setError(err?.message || "Incorrect code. Please try again.");
    } finally { setLoading(false); }
  };

  const handleOTPChange = (val) => {
    setOtp(val);
    if (val.length === 6) setTimeout(() => verifyOTP(val), 200);
  };

  // ── Step 3: Submit password ──────────────────────────────────────────────
  const submitPassword = async (e) => {
    e?.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (mode !== "login" && password !== confirm) { setError("Passwords do not match."); return; }
    if (mode === "signup" && !name.trim()) { setError("Please enter your full name."); return; }
    setLoading(true); setError("");
    const safeFrom = (from && !/\/(login|auth|\/)/i.test(from)) ? from : DASHBOARD;
    try {
      if (mode === "signup") {
        try { await base44.auth.register({ email: email.trim().toLowerCase(), password, full_name: name.trim() }); } catch (_) {}
        await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      } else if (mode === "reset") {
        try { await base44.auth.register({ email: email.trim().toLowerCase(), password, full_name: email.split("@")[0] }); } catch (_) {}
        await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      } else {
        // login
        await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      }
      navigate(safeFrom, { replace: true });
    } catch (err) {
      const msg = err?.message || "";
      if (mode === "login" && (msg.includes("password") || msg.includes("credential") || msg.includes("Invalid"))) {
        setError("Incorrect password. Try again or use 'Forgot password' to reset.");
      } else if (msg.includes("already") || msg.includes("exists")) {
        // User exists — just try login
        try {
          await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
          navigate(safeFrom, { replace: true });
          return;
        } catch (e2) { setError(e2?.message || "Authentication failed."); }
      } else {
        setError(msg || "Authentication failed. Please try again.");
      }
    } finally { setLoading(false); }
  };

  // ─── UI helpers ───────────────────────────────────────────────────────────
  const modeLabel = { login: "Sign In", signup: "Create Account", reset: "Reset Password" };
  const stepLabel = {
    email: mode === "login" ? "Enter your email to continue" : mode === "signup" ? "Start with your email address" : "Enter your email to reset password",
    otp: `We emailed a 6-digit code to ${email}`,
    password: mode === "login" ? "Enter your password" : mode === "signup" ? "Set your password" : "Create a new password",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#050a14" }}>
      {/* Glow bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.4), transparent)" }} />
      </div>

      <div className="w-full max-w-sm relative z-10 space-y-6">

        {/* Logo + Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center">
            <img src={LOGO} alt={BRAND} className="h-12 w-auto rounded-xl" onError={e => { e.target.style.display="none"; }} />
          </div>
          <div>
            <p className="text-white font-black text-xl tracking-tight">{BRAND}</p>
            <p className="text-slate-500 text-xs mt-0.5">{TAGLINE}</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-black/40 space-y-5">

          {/* Mode tabs */}
          {flow === "email" && (
            <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl">
              {["login", "signup"].map(m => (
                <button key={m} onClick={() => resetFlow(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === m ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          {/* Step header */}
          <div>
            {flow !== "email" && (
              <button onClick={() => { setFlow(flow === "password" ? "otp" : "email"); setError(""); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            <h2 className="text-white font-black text-lg">{modeLabel[mode]}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{stepLabel[flow]}</p>
          </div>

          {/* Error / Info */}
          {error && (
            <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20 leading-relaxed">{error}</div>
          )}
          {info && (
            <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{info}</div>
          )}
          {resent && (
            <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center">✓ New code sent to {email}</div>
          )}

          {/* ── STEP: EMAIL ── */}
          {flow === "email" && (
            <form onSubmit={sendOTP} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="email" value={email} required autoFocus
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-slate-500 transition-colors" />
                </div>
              </div>
              <button type="submit" disabled={otpSending || !email}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-violet-500/20">
                {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {otpSending ? "Sending code..." : "Send Verification Code →"}
              </button>
              {mode === "login" && (
                <button type="button" onClick={() => resetFlow("reset")}
                  className="w-full text-center text-xs text-slate-500 hover:text-violet-400 transition-colors py-1">
                  Forgot password?
                </button>
              )}
            </form>
          )}

          {/* ── STEP: OTP ── */}
          {flow === "otp" && (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Shield className="w-4 h-4 text-violet-400" />
                Enter the 6-digit code from your email
              </div>
              <OTPInput value={otp} onChange={handleOTPChange} disabled={loading} />
              <button onClick={() => verifyOTP(otp)} disabled={loading || otp.length < 6}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Didn't get it?</span>
                <button onClick={resendOTP} disabled={resending}
                  className="flex items-center gap-1 text-slate-500 hover:text-violet-400 transition-colors disabled:opacity-50">
                  {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Resend code
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PASSWORD ── */}
          {flow === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={name} required autoFocus
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-slate-500 transition-colors" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  {mode === "reset" ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type={showPw ? "text" : "password"} value={password} required
                    autoFocus={mode !== "signup"}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-slate-500 transition-colors" />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode !== "login" && <PasswordStrength password={password} />}
              </div>
              {mode !== "login" && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type={showPw ? "text" : "password"} value={confirm} required
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 py-2.5 rounded-xl bg-slate-800 border text-white text-sm focus:outline-none focus:border-violet-500 placeholder-slate-500 transition-colors ${confirm && confirm !== password ? "border-red-500/60" : "border-slate-700"}`} />
                  </div>
                  {confirm && confirm !== password && <p className="text-xs text-red-400 mt-1">Passwords don't match</p>}
                </div>
              )}
              <button type="submit" disabled={loading || !password || (mode !== "login" && password !== confirm)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Please wait..." : mode === "signup" ? "Create Account" : mode === "reset" ? "Set New Password" : "Sign In"}
              </button>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center space-y-2">
          {mode !== "signup" && flow === "email" && (
            <p className="text-xs text-slate-600">
              No account?{" "}
              <button onClick={() => resetFlow("signup")} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign up free</button>
            </p>
          )}
          {mode === "signup" && flow === "email" && (
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <button onClick={() => resetFlow("login")} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</button>
            </p>
          )}
          <p className="text-xs text-slate-700">
            © 2026 {BRAND} · AI Marketing & Media
          </p>
        </div>
      </div>
    </div>
  );
}
