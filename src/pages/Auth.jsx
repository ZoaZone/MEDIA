import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2, Mail, Smartphone } from "lucide-react";
import StepEmail from "@/components/auth/StepEmail";
import StepVerifyOTP from "@/components/auth/StepVerifyOTP";
import StepSetPassword from "@/components/auth/StepSetPassword";
import StepPhone from "@/components/auth/StepPhone";

const DASHBOARD = "/dashboard";

/**
 * Auth — fully custom, zero Base44 branding.
 *
 * Flows:
 *  LOGIN:  enter email → verify OTP → enter password → sign in
 *  SIGNUP: enter email → verify OTP → set name + password → register
 *  RESET:  enter email → verify OTP → create new password → sign in
 */
export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || DASHBOARD;

  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
  const [channel, setChannel] = useState("email"); // "email" | "phone"
  const [step, setStep] = useState("email"); // "email" | "otp" | "password"
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Already logged in → redirect
  useEffect(() => {
    const token = localStorage.getItem("base44_access_token");
    if (token) navigate(from, { replace: true });
  }, []);

  const resetFlow = (newMode) => {
    setMode(newMode);
    setStep("email");
    setEmail("");
    setError("");
  };

  const switchChannel = (ch) => {
    setChannel(ch);
    setStep("email");
    setEmail("");
    setError("");
  };

  const handleOTPVerified = () => setStep("password");

  const handlePasswordSubmit = async ({ password, name }) => {
    setLoading(true);
    setError("");
    const safeFrom = (from && !/\/(login|auth)/i.test(from)) ? from : DASHBOARD;
    try {
      if (mode === "signup") {
        await base44.auth.register({ email, password, full_name: name });
        await base44.auth.loginViaEmailPassword(email, password);
      } else {
        try {
          await base44.auth.loginViaEmailPassword(email, password);
        } catch {
          if (mode === "reset") {
            await base44.auth.register({ email, password });
            await base44.auth.loginViaEmailPassword(email, password);
          } else {
            throw new Error("Invalid email or password.");
          }
        }
      }
      navigate(safeFrom, { replace: true });
    } catch (err) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: { email: "Sign in", otp: "Check your email", password: "Enter your password" },
    signup: { email: "Create account", otp: "Verify your email", password: "Set your password" },
    reset: { email: "Reset password", otp: "Check your email", password: "New password" },
  };
  const subtitles = {
    login: {
      email: "Enter your email to continue",
      otp: "Enter the 6-digit code we sent you",
      password: "Enter your password to sign in",
    },
    signup: {
      email: "Enter your email to get started",
      otp: "Enter the 6-digit code we sent you",
      password: "Choose a strong password",
    },
    reset: {
      email: "We'll send a verification code",
      otp: "Enter the 6-digit code we sent you",
      password: "Create a new password",
    },
  };

  const stepIndex = { email: 0, otp: 1, password: 2 };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#050a14" }}>
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.35), transparent)" }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Back to home */}
        <button onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-7 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </button>

        {/* Logo + branding */}
        <div className="text-center mb-7">
          <img src="https://media.base44.com/images/public/69c3c2f5acaefc3a7afad5fd/db61ca772_IMG_8881.jpg" alt="DigitalStudios.app"
            className="h-14 object-contain mx-auto mb-1"
            onError={e => { e.target.style.display = "none"; }} />
          <p className="text-xs text-slate-400 mt-0.5">AI Marketing &amp; Media Platform</p>
        </div>

        {/* 3-step progress bar */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["email", "otp", "password"].map((s, i) => {
            const done = stepIndex[step] > i;
            const active = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  active ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                  : done ? "bg-emerald-500 text-white"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < 2 && (
                  <div className={`w-8 h-0.5 rounded-full transition-all ${done ? "bg-emerald-500" : "bg-slate-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
          <div className="text-center mb-5">
            <h2 className="text-base font-bold text-white">{titles[mode][step]}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {step === "otp" && channel === "phone"
                ? "Enter the 6-digit code sent to your mobile"
                : subtitles[mode][step]}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>
          )}

          {/* Channel switcher — only on first step */}
          {step === "email" && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => switchChannel("email")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${channel === "email" ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300"}`}>
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button
                onClick={() => switchChannel("phone")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${channel === "phone" ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300"}`}>
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          )}

          {step === "email" && channel === "email" && (
            <StepEmail purpose={mode} onNext={(e) => { setEmail(e); setStep("otp"); }} />
          )}

          {step === "email" && channel === "phone" && (
            <StepPhone purpose={mode} onNext={(phone) => { setEmail(phone); setStep("otp"); }} />
          )}

          {step === "otp" && (
            <StepVerifyOTP
              email={email}
              purpose={mode}
              onVerified={handleOTPVerified}
              onBack={() => setStep("email")}
            />
          )}

          {step === "password" && (
            <StepSetPassword
              requireName={mode === "signup"}
              label={mode === "signup" ? "Create Account" : mode === "reset" ? "Set New Password" : "Sign In"}
              loading={loading}
              onSubmit={handlePasswordSubmit}
            />
          )}

          {/* Mode switcher */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center space-y-2">
            {mode === "login" && (
              <>
                <button onClick={() => resetFlow("reset")}
                  className="block w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Forgot password?
                </button>
                <p className="text-xs text-slate-500">
                  No account?{" "}
                  <button onClick={() => resetFlow("signup")} className="text-violet-400 hover:underline font-medium">
                    Sign up free
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-xs text-slate-500">
                Already have an account?{" "}
                <button onClick={() => resetFlow("login")} className="text-violet-400 hover:underline font-medium">
                  Sign in
                </button>
              </p>
            )}
            {mode === "reset" && (
              <button onClick={() => resetFlow("login")}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          By continuing you agree to our{" "}
          <a href="/privacy" className="hover:text-slate-400 underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}