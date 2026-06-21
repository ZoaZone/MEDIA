import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PayPalButton from "@/components/PayPalButton";
import { Check, Zap, ArrowRight, ArrowLeft, Loader2, Star, Sparkles, Gift, Mail, Phone, MessageSquare, Film, Music } from "lucide-react";

const PRICE_PER_CREDIT = 0.06;
const FREE_TRIAL_LIMIT = 25;
const CREDIT_PACKS = [10, 25, 50, 100];

const MESSAGING_RATES = [
  { Icon: Mail,          label: "Email",     provider: "SendGrid / Resend",     rate: "$1.30 / 1,000 emails",         byo: "Agency & Enterprise: bring your own SendGrid key — $0 platform fee" },
  { Icon: Phone,         label: "SMS",       provider: "Twilio",                rate: "≈ $0.013 / SMS (US)",           byo: "Agency & Enterprise: bring your own Twilio account — $0 platform fee" },
  { Icon: MessageSquare, label: "WhatsApp",  provider: "Meta Cloud API",        rate: "≈ $0.013 / conversation (US)", byo: "Agency & Enterprise: bring your own Meta BSP token — $0 platform fee" },
];

const M_LOGO = "/favicon.png";

const PLANS = [
  {
    name: "Starter", price_monthly: 49, price_yearly: 470, tier: 1,
    desc: "Perfect for small businesses and solopreneurs",
    color: "border-white/10",
    features: [
      "1 brand / client account", "500 AI generations/month", "1,000 bulk messages/month",
      "3 social accounts", "Basic funnel builder", "Lead capture forms",
      "Email support",
    ],
  },
  {
    name: "Growth", price_monthly: 149, price_yearly: 1430, tier: 2,
    desc: "For growing teams and freelancers managing clients",
    color: "border-fuchsia-500/50",
    popular: true,
    features: [
      "5 brand / client accounts", "2,500 AI generations/month", "10,000 bulk messages/month",
      "15 social accounts", "Advanced funnels & sequences", "Website scanner",
      "Ad creator + script writer", "Analytics dashboard", "Priority support",
    ],
  },
  {
    name: "Agency", price_monthly: 399, price_yearly: 3830, tier: 3,
    desc: "Full power for agencies managing unlimited clients",
    color: "border-amber-500/30",
    features: [
      "10 brands / unlimited clients", "10,000 AI generations/month", "50,000 bulk messages/month",
      "Unlimited social accounts", "White-label options", "Affiliate & agency portals",
      "BYO email/SMS/WhatsApp (zero platform fee)", "API access", "Dedicated account manager",
    ],
  },
  {
    name: "Enterprise", price_monthly: 999, price_yearly: 9590, tier: 4,
    desc: "Complete media production hub for studios & enterprises",
    color: "border-cyan-500/40",
    enterprise: true,
    features: [
      "25 brands / unlimited clients", "Unlimited AI generations", "Unlimited bulk messages",
      "Unlimited social accounts", "🎬 Movie Maker — multi-scene films with dubbing",
      "🎵 Song Creator — AI music in any language",
      "🎞 AI Media Editor — video/image editing suite",
      "BYO messaging credentials (zero platform fee)",
      "Custom integrations", "Dedicated success manager",
    ],
  },
];

const FEATURE_MATRIX = [
  { feature: "Brand / Client Accounts",  starter: "1",       growth: "5",        agency: "10",         enterprise: "25" },
  { feature: "AI Generations/mo",        starter: "500",     growth: "2,500",    agency: "10,000",     enterprise: "Unlimited" },
  { feature: "Bulk Messages/mo",         starter: "1,000",   growth: "10,000",   agency: "50,000",     enterprise: "Unlimited" },
  { feature: "Social Accounts",          starter: "3",       growth: "15",       agency: "Unlimited",  enterprise: "Unlimited" },
  { feature: "Funnel Builder",           starter: "Basic",   growth: "Advanced", agency: "Advanced",   enterprise: "Advanced" },
  { feature: "Website Scanner",          starter: "✗",       growth: "✓",        agency: "✓",          enterprise: "✓" },
  { feature: "Ad Creator",               starter: "✗",       growth: "✓",        agency: "✓",          enterprise: "✓" },
  { feature: "AI Media Editor",          starter: "✗",       growth: "✗",        agency: "✗",          enterprise: "✓" },
  { feature: "Movie Maker",              starter: "✗",       growth: "✗",        agency: "✗",          enterprise: "✓" },
  { feature: "Song Creator",             starter: "✗",       growth: "✗",        agency: "✗",          enterprise: "✓" },
  { feature: "BYO Messaging (no fee)",   starter: "✗",       growth: "✗",        agency: "✓",          enterprise: "✓" },
  { feature: "Affiliate Portal",         starter: "✗",       growth: "✗",        agency: "✓",          enterprise: "✓" },
  { feature: "White-label",              starter: "✗",       growth: "✗",        agency: "✓",          enterprise: "✓" },
  { feature: "API Access",               starter: "✗",       growth: "✗",        agency: "✓",          enterprise: "✓" },
  { feature: "Support",                  starter: "Email",   growth: "Priority", agency: "Dedicated",  enterprise: "Success Mgr" },
];

export default function Pricing() {
  const [billing, setBilling] = useState("monthly");
  const isIndia = typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith("Asia/");
  const [loadingPlan, setLoadingPlan] = useState(null);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });

  const handleCheckout = async (plan) => {
    if (!user) { window.location.href = "/auth"; return; }
    setLoadingPlan(plan.name);
    try {
      const res = await base44.functions.invoke("stripeCheckoutCREAM", { plan: plan.name.toLowerCase(), billing });
      const url = res?.data?.checkout_url;
      if (url) {
        window.location.href = url;
      } else if (res?.data?.demo) {
        window.location.href = "/onboarding";
      } else {
        alert("Checkout error: " + (res?.data?.error || "Unknown error"));
      }
    } catch (e) { alert("Checkout error: " + (e?.response?.data?.error || e.message)); }
    setLoadingPlan(null);
  };

  const savings = (p) => Math.round(((p.price_monthly * 12 - p.price_yearly) / (p.price_monthly * 12)) * 100);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Header */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center mb-4">
            <img src="https://media.base44.com/images/public/69c3c2f5acaefc3a7afad5fd/db61ca772_IMG_8881.jpg" alt="DigitalStudios.app" className="h-12 object-contain" onError={(e) => e.target.style.display="none"} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Choose your plan</h1>
          <p className="text-white/50 text-lg mb-6">From free trial to full enterprise media production.</p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-sm font-medium mb-8">
            <Gift className="w-4 h-4" /> Start free — {FREE_TRIAL_LIMIT} AI generations, no credit card required
          </div>

          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
            <button onClick={() => setBilling("monthly")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === "monthly" ? "bg-white/10 text-white" : "text-white/50"}`}>
              Monthly
            </button>
            <button onClick={() => setBilling("yearly")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing === "yearly" ? "bg-white/10 text-white" : "text-white/50"}`}>
              Yearly <span className="text-xs px-1.5 py-0.5 bg-fuchsia-500/20 text-fuchsia-300 rounded-full font-medium">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pay-as-you-go Credits callout — above plan cards so it's impossible to miss */}
        <div className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/25 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-start gap-3 flex-1">
            <Sparkles className="w-6 h-6 text-fuchsia-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-black text-white mb-0.5">Pay-as-you-go AI Credits</h3>
              <p className="text-sm text-white/50">No subscription? Buy credits anytime. 1 credit = 1 AI image or video scene = ${PRICE_PER_CREDIT.toFixed(2)}. Credits never expire.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            {CREDIT_PACKS.map(amt => (
              <div key={amt} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-center min-w-[64px]">
                <div className="text-lg font-black text-white">${amt}</div>
                <div className="text-[10px] text-white/40">{Math.floor(amt / PRICE_PER_CREDIT).toLocaleString()} cr</div>
              </div>
            ))}
          </div>
          <Link to="/billing" className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-all whitespace-nowrap">
            Buy Credits →
          </Link>
        </div>

        {/* Plan cards — 4 plans, 2×2 on mobile, 4-col on wide screens */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mb-12">
          {PLANS.map((plan) => {
            const price = billing === "yearly" ? plan.price_yearly : plan.price_monthly;
            const perMonth = billing === "yearly" ? Math.round(plan.price_yearly / 12) : plan.price_monthly;
            return (
              <div key={plan.name} className={`relative rounded-3xl p-6 border flex flex-col ${plan.color} ${
                plan.popular ? "bg-fuchsia-500/8 shadow-2xl shadow-fuchsia-500/20" :
                plan.enterprise ? "bg-gradient-to-b from-cyan-500/8 to-blue-500/5" : "bg-white/3"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                    <Star className="w-3 h-3 fill-white" /> Most Popular
                  </div>
                )}
                {plan.enterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                    <Film className="w-3 h-3" /> Media Hub
                  </div>
                )}
                <p className="text-white/40 text-xs mb-1 mt-1">{plan.desc}</p>
                <h3 className="text-lg font-black text-white mb-2">{plan.name}</h3>
                <div className="mb-1">
                  <span className="text-3xl font-black text-white">${perMonth}</span>
                  <span className="text-white/40 text-xs">/mo</span>
                </div>
                {billing === "yearly" && <p className="text-xs text-fuchsia-400 mb-4">Billed ${price}/year · save {savings(plan)}%</p>}
                {billing === "monthly" && <div className="mb-4" />}

                <div className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2 text-xs text-white/70">
                      <Check className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0 mt-0.5" /> {f}
                    </div>
                  ))}
                </div>

                <button onClick={() => handleCheckout(plan)} disabled={!!loadingPlan}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    plan.enterprise
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg"
                      : plan.popular
                        ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-fuchsia-500/30"
                        : "border border-white/15 text-white/80 hover:border-white/30 hover:text-white"
                  } disabled:opacity-60`}>
                  {loadingPlan === plan.name ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   plan.enterprise ? <><Film className="w-4 h-4" /> Contact Sales</> :
                   <>Get Started <ArrowRight className="w-4 h-4" /></>}
                </button>
                {isIndia && !plan.enterprise && (
                  <div className="mt-3">
                    <p className="text-xs text-center text-white/40 mb-2">🇮🇳 India? Pay in INR</p>
                    <PayPalButton amount={Math.round(perMonth * 85)} currency="INR" planName={plan.name} sourceApp="marketer" userEmail={user?.email || ""} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature matrix */}
        <div className="bg-white/3 border border-white/8 rounded-3xl overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-white/8">
            <h3 className="font-bold text-white">Full Feature Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-6 py-3 text-white/50 font-medium">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.name} className={`text-center px-4 py-3 font-bold ${p.popular ? "text-fuchsia-400" : p.enterprise ? "text-cyan-400" : "text-white/80"}`}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {FEATURE_MATRIX.map(row => (
                  <tr key={row.feature} className="hover:bg-white/3">
                    <td className="px-6 py-3 text-white/60">{row.feature}</td>
                    {[row.starter, row.growth, row.agency, row.enterprise].map((val, i) => (
                      <td key={i} className={`text-center px-4 py-3 font-medium ${
                        val === "✓" ? "text-fuchsia-400" : val === "✗" ? "text-white/20" : "text-white/80"
                      }`}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email, SMS & WhatsApp sending */}
        <div className="bg-white/3 border border-white/8 rounded-3xl p-7 mb-8">
          <h3 className="text-xl font-black text-white mb-1">Email, SMS &amp; WhatsApp Sending</h3>
          <p className="text-white/50 text-sm mb-1">
            Platform-managed sending is billed per message beyond your plan's monthly quota.
          </p>
          <p className="text-white/40 text-xs mb-5">
            Agency &amp; Enterprise plans: bring your own SendGrid, Twilio, or Meta BSP credentials for <strong className="text-white/70">zero platform fee</strong>.
            WhatsApp campaigns require pre-approved message templates per Meta Business API rules; transactional messages can be sent from your registered sender number without pre-approval.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MESSAGING_RATES.map(m => (
              <div key={m.label} className="p-4 rounded-2xl border border-white/10 bg-white/3">
                <div className="flex items-center gap-2 mb-1.5">
                  <m.Icon className="w-4 h-4 text-fuchsia-400" />
                  <span className="font-semibold text-white text-sm">{m.label}</span>
                </div>
                <p className="text-xs text-white/40 mb-1">via {m.provider}</p>
                <p className="text-sm font-bold text-white mb-1">{m.rate}</p>
                <p className="text-xs text-white/40">{m.byo}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legal note */}
        <p className="text-center text-xs text-white/25">
          All sales are final. Subscriptions auto-renew. Cancel anytime before renewal to avoid charges. For billing questions: care@aevoice.ai
        </p>
      </div>
    </div>
  );
}