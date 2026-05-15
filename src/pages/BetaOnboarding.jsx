import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2, Loader2, Sparkles, ArrowRight, Globe,
  Share2, Megaphone, Lock, Mail, User, Eye, EyeOff, Gift
} from "lucide-react";

const APP_URL = "https://media.aevoice.ai";
const M_LOGO = "https://media.base44.com/images/public/69b1f1d60b1fb9d791fddc64/d1aa347a6_generated_image.png";

const STEPS = [
  { id: 1, icon: Gift,      title: "Claim Your Free Access",  desc: "Your exclusive beta invite is waiting" },
  { id: 2, icon: User,      title: "Create Your Account",     desc: "Set up your password to get started" },
  { id: 3, icon: Globe,     title: "Tell Us About You",       desc: "So we can personalise your experience" },
  { id: 4, icon: Sparkles,  title: "You're In!",              desc: "Full Agency access unlocked for free" },
];

export default function BetaOnboarding() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Step 2 — account creation
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Step 3 — profile
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Validate token on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const validateToken = async () => {
      if (!token) { setError("Invalid invite link."); setLoading(false); return; }
      try {
        const results = await base44.entities.BetaInvite.filter({ token });
        if (!results || results.length === 0) {
          setError("This invite link is invalid or has expired.");
          setLoading(false);
          return;
        }
        const inv = results[0];
        if (inv.status === "registered") {
          setError("This invite has already been used. Please log in instead.");
          setLoading(false);
          return;
        }
        const expiry = new Date(inv.expires_at);
        if (expiry < new Date()) {
          setError("This invite link has expired. Please contact the team for a new one.");
          setLoading(false);
          return;
        }
        // Mark as clicked
        await base44.entities.BetaInvite.update(inv.id, {
          status: "clicked",
          clicked_at: new Date().toISOString(),
        });
        setInvite(inv);
        setLoading(false);
      } catch (e) {
        setError("Could not validate your invite. Please try again or contact support.");
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  // ── Step 2: Create account ──────────────────────────────────────────────────
  const handleCreateAccount = async () => {
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match."); return;
    }
    setError("");
    setCreatingAccount(true);
    try {
      // Register via Base44 auth
      await base44.auth.signUp({ email: invite.email, password });
      setCreatingAccount(false);
      setStep(3);
    } catch (e) {
      // If user already exists, try sign in
      try {
        await base44.auth.signIn({ email: invite.email, password });
        setCreatingAccount(false);
        setStep(3);
      } catch (e2) {
        setError(e2.message || "Account creation failed. Try a different password.");
        setCreatingAccount(false);
      }
    }
  };

  // ── Step 3: Save profile & activate subscription ────────────────────────────
  const handleSaveProfile = async () => {
    if (!fullName.trim()) { setError("Please enter your name."); return; }
    setError("");
    setSavingProfile(true);
    try {
      // Activate Agency-tier subscription
      await base44.entities.Subscription.create({
        owner_email: invite.email,
        plan_name: "Beta Pro",
        plan_tier: "agency",
        status: "active",
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      // Mark invite as used
      await base44.entities.BetaInvite.update(invite.id, {
        status: "registered",
        registered_at: new Date().toISOString(),
      });
      // Update BetaRequest if exists
      try {
        const brs = await base44.entities.BetaRequest.filter({ email: invite.email });
        if (brs.length > 0) {
          await base44.entities.BetaRequest.update(brs[0].id, {
            full_name: fullName,
            company,
            use_case: useCase,
            status: "approved",
            invite_sent: true,
          });
        }
      } catch (_) {}
      setSavingProfile(false);
      setStep(4);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setSavingProfile(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 animate-pulse">
          <span className="text-white font-black text-2xl">M</span>
        </div>
        <Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" />
        <p className="text-white/40 text-sm">Validating your invite…</p>
      </div>
    </div>
  );

  // ── Error state ──────────────────────────────────────────────────────────────
  if (!invite && error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔗</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Invite Not Found</h2>
        <p className="text-white/50 mb-6">{error}</p>
        <a href={APP_URL} className="inline-block px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl font-semibold text-sm">
          Go to Homepage
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={M_LOGO} alt="" className="w-10 h-10 rounded-xl" onError={e => e.target.style.display = "none"} />
          <span className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            MARKETER
          </span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((st, i) => (
            <div key={st.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > st.id  ? "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white" :
                step === st.id ? "bg-white/10 border-2 border-fuchsia-500 text-fuchsia-400" :
                                 "bg-white/5 text-white/20"
              }`}>
                {step > st.id ? <CheckCircle2 className="w-4 h-4" /> : st.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                  step > st.id ? "bg-gradient-to-r from-fuchsia-500 to-purple-600" : "bg-white/10"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">

          {/* ── STEP 1: Welcome ── */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-500/30 flex items-center justify-center mx-auto mb-5">
                <Gift className="w-8 h-8 text-fuchsia-400" />
              </div>
              <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full px-4 py-1.5 mb-4">
                <span className="text-fuchsia-400 text-xs font-semibold">🎉 Beta Invite Confirmed</span>
              </div>
              <h1 className="text-2xl font-black text-white mb-2">
                You're invited to<br />
                <span className="bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                  MARKETER Beta
                </span>
              </h1>
              <p className="text-white/50 text-sm mb-1">Invite reserved for</p>
              <p className="text-fuchsia-300 font-semibold text-sm mb-6">{invite?.email}</p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-3">
                {[
                  "✅ Full Agency-tier access — free for 1 year",
                  "✅ AI media creation, campaigns & scheduling",
                  "✅ Multi-channel: Email, SMS, WhatsApp, Social",
                  "✅ Priority support during beta",
                ].map((item, i) => (
                  <p key={i} className="text-white/70 text-sm">{item}</p>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-fuchsia-500/20"
              >
                Claim My Free Access <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Create Account ── */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Create Your Password</h2>
                  <p className="text-white/40 text-xs">{invite?.email}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1.5 block">Email</label>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <Mail className="w-4 h-4 text-white/30" />
                    <span className="text-white/50 text-sm">{invite?.email}</span>
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1.5 block">Password</label>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <Lock className="w-4 h-4 text-white/30" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
                    />
                    <button onClick={() => setShowPw(!showPw)} className="text-white/30 hover:text-white/60">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1.5 block">Confirm Password</label>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <Lock className="w-4 h-4 text-white/30" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateAccount}
                disabled={creatingAccount}
                className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-fuchsia-500/20"
              >
                {creatingAccount ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* ── STEP 3: Profile ── */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Tell Us About You</h2>
                  <p className="text-white/40 text-xs">Personalise your MARKETER experience</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1.5 block">Your Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-fuchsia-500/50 placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1.5 block">Company / Brand</label>
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Acme Marketing Co."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-fuchsia-500/50 placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1.5 block">What will you use MARKETER for?</label>
                  <select
                    value={useCase}
                    onChange={e => setUseCase(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-fuchsia-500/50"
                  >
                    <option value="" className="bg-[#1a1a2e]">Select your primary use case…</option>
                    <option value="social_media" className="bg-[#1a1a2e]">Social Media Management</option>
                    <option value="email_campaigns" className="bg-[#1a1a2e]">Email Marketing Campaigns</option>
                    <option value="content_creation" className="bg-[#1a1a2e]">AI Content Creation</option>
                    <option value="lead_generation" className="bg-[#1a1a2e]">Lead Generation & Funnels</option>
                    <option value="agency" className="bg-[#1a1a2e]">Running a Marketing Agency</option>
                    <option value="ecommerce" className="bg-[#1a1a2e]">E-commerce / D2C Brand</option>
                    <option value="other" className="bg-[#1a1a2e]">Other</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-fuchsia-500/20"
              >
                {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating Access…</> : <>Activate My Free Access <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* ── STEP 4: Done! ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                You're in, {fullName.split(" ")[0] || "there"}! 🎉
              </h2>
              <p className="text-white/50 text-sm mb-6">
                Full Agency-tier access activated. Welcome to the MARKETER beta — let's build something great.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6 text-left space-y-2">
                <p className="text-emerald-400 font-semibold text-sm">What's unlocked:</p>
                {[
                  "🎨 AI Media Studio — create visuals, copy, videos",
                  "📣 Campaigns — email, SMS & WhatsApp blasts",
                  "📅 Social Hub — schedule posts across all platforms",
                  "📊 Analytics — track performance in real time",
                ].map((item, i) => (
                  <p key={i} className="text-white/60 text-sm">{item}</p>
                ))}
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © 2026 AEVOICE · media.aevoice.ai · Questions? <a href="mailto:hello@aevoice.ai" className="hover:text-white/40 transition-colors">hello@aevoice.ai</a>
        </p>
      </div>
    </div>
  );
}
