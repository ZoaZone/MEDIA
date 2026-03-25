import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Share2, Globe, Megaphone, Users, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GlassCard from "@/components/ui/GlassCard";

const steps = [
  { icon: Share2, title: "Connect Social Accounts", desc: "Link your social media platforms" },
  { icon: Globe, title: "Scan Your Website", desc: "Let AI analyze your business" },
  { icon: Megaphone, title: "Create First Campaign", desc: "Launch your first marketing campaign" },
  { icon: Users, title: "Invite Your Team", desc: "Add team members to collaborate" },
];

export default function PostPaymentOnboarding() {
  const [step, setStep] = useState(0);
  const [socialForm, setSocialForm] = useState({ platform: "instagram", account_name: "" });
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSocial = async () => {
    if (!socialForm.account_name) return;
    setLoading(true);
    await base44.entities.SocialAccount.create({ ...socialForm, status: "connected", connected_at: new Date().toISOString() });
    setLoading(false);
    setStep(1);
  };

  const handleScan = async () => {
    if (!websiteUrl) return;
    setLoading(true);
    await base44.entities.WebsiteScan.create({ website_url: websiteUrl, scan_status: "pending", scan_at: new Date().toISOString() });
    setLoading(false);
    setStep(2);
  };

  const handleCampaign = async () => {
    if (!campaignName) return;
    setLoading(true);
    await base44.entities.MarketingCampaign.create({ name: campaignName, type: "email", status: "draft" });
    setLoading(false);
    setStep(3);
  };

  const handleInvite = async () => {
    setStep(4);
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-magenta flex items-center justify-center mx-auto mb-4 shadow-lg shadow-magenta/20">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <h1 className="text-2xl font-black text-white">Welcome to <span className="gradient-text">Marketer</span></h1>
          <p className="text-sm text-white/40 mt-2">Let's get you set up in 4 quick steps</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-emerald-500 text-white" : i === step ? "gradient-magenta text-white" : "bg-white/5 text-white/30"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-emerald-500" : "bg-white/10"}`} />}
            </React.Fragment>
          ))}
        </div>

        {step < 4 && (
          <GlassCard className="neon-magenta">
            <div className="flex items-center gap-3 mb-6">
              {React.createElement(steps[step].icon, { className: "w-5 h-5 text-magenta" })}
              <div>
                <h2 className="text-lg font-bold text-white">{steps[step].title}</h2>
                <p className="text-xs text-white/40">{steps[step].desc}</p>
              </div>
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60 text-xs">Platform</Label>
                  <Select value={socialForm.platform} onValueChange={(v) => setSocialForm({ ...socialForm, platform: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["instagram", "facebook", "tiktok", "linkedin", "youtube"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Account Name</Label>
                  <Input value={socialForm.account_name} onChange={(e) => setSocialForm({ ...socialForm, account_name: e.target.value })} className="bg-white/5 border-white/10 text-white mt-1" placeholder="@youraccount" />
                </div>
                <Button onClick={handleSocial} disabled={loading} className="w-full gradient-magenta border-0 text-white hover:opacity-90">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Connect & Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60 text-xs">Website URL</Label>
                  <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" placeholder="https://yourwebsite.com" />
                </div>
                <Button onClick={handleScan} disabled={loading} className="w-full gradient-magenta border-0 text-white hover:opacity-90">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Scan & Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60 text-xs">Campaign Name</Label>
                  <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" placeholder="My First Campaign" />
                </div>
                <Button onClick={handleCampaign} disabled={loading} className="w-full gradient-magenta border-0 text-white hover:opacity-90">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create & Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60 text-xs">Team Member Email</Label>
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" placeholder="team@company.com" />
                </div>
                <Button onClick={handleInvite} className="w-full gradient-magenta border-0 text-white hover:opacity-90">
                  Finish Setup <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-full text-white/40 hover:text-white">Skip for now</Button>
              </div>
            )}
          </GlassCard>
        )}

        {step === 4 && (
          <GlassCard className="text-center py-12 neon-magenta">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">You're All Set!</h2>
            <p className="text-sm text-white/40">Redirecting to your dashboard...</p>
          </GlassCard>
        )}

        {step < 4 && (
          <button onClick={() => setStep(s => Math.min(s + 1, 4))} className="text-xs text-white/30 hover:text-white/50 mt-4 block mx-auto">Skip this step</button>
        )}
      </div>
    </div>
  );
}