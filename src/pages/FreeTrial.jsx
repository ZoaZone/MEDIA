import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Search, User, MapPin, Briefcase, Lock, Star, ArrowRight, Loader2, X, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const M_LOGO = "https://media.base44.com/images/public/69b1f1d60b1fb9d791fddc64/d1aa347a6_generated_image.png";

// Sample match profiles (demo data)
const DEMO_MATCHES = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Digital Marketing Manager",
    company: "TechBrand India",
    location: "Mumbai, MH",
    skills: ["SEO", "Social Media", "Email Campaigns"],
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop",
    match: 96,
  },
  {
    id: 2,
    name: "Arjun Mehta",
    role: "Growth Hacker",
    company: "StartupXcel",
    location: "Bengaluru, KA",
    skills: ["Funnels", "Paid Ads", "Analytics"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
    match: 91,
  },
  {
    id: 3,
    name: "Neha Kapoor",
    role: "Content Strategist",
    company: "CreativeHub",
    location: "Delhi, DL",
    skills: ["Content", "Influencer Marketing", "Brand Building"],
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop",
    match: 88,
  },
  {
    id: 4,
    name: "Rohan Desai",
    role: "Agency Owner",
    company: "MediaPro Agency",
    location: "Pune, MH",
    skills: ["Agency Management", "Client Relations", "ROI Tracking"],
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
    match: 85,
  },
  {
    id: 5,
    name: "Kavya Reddy",
    role: "Social Media Lead",
    company: "Fashion Forward",
    location: "Hyderabad, TS",
    skills: ["Instagram", "TikTok", "Reels", "Stories"],
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
    match: 82,
  },
  {
    id: 6,
    name: "Vikram Nair",
    role: "Performance Marketer",
    company: "AdScale Solutions",
    location: "Chennai, TN",
    skills: ["PPC", "Meta Ads", "Google Ads", "CRO"],
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop",
    match: 79,
  },
];

export default function FreeTrial() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState("profile"); // "profile" | "searching" | "matches"
  const [profile, setProfile] = useState({ name: "", role: "", company: "", location: "", skills: "", avatar: null, avatarUrl: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [lockedModal, setLockedModal] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfile(p => ({ ...p, avatarUrl: file_url }));
    } catch {
      // fallback: local preview
      setProfile(p => ({ ...p, avatarUrl: URL.createObjectURL(file) }));
    }
    setUploading(false);
  };

  const handleSubmitProfile = (e) => {
    e.preventDefault();
    if (!profile.name || !profile.role) return;
    setStep("searching");
    setTimeout(() => setStep("matches"), 2200);
  };

  const filteredMatches = DEMO_MATCHES.filter(m => {
    const q = searchQuery.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.location.toLowerCase().includes(q) || m.skills.some(s => s.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <img src={M_LOGO} alt="" className="w-7 h-7 rounded-lg" onError={e => e.target.style.display="none"} />
            <span className="font-black text-sm bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">media.aevoice.ai</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-xs font-medium mb-4">
            ✨ Free Trial — No Credit Card Required
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Find Your Marketing Match</h1>
          <p className="text-white/50 text-base">Upload your profile and discover collaborators, clients, and partners on our platform.</p>
        </div>

        {/* STEP: Profile Form */}
        {step === "profile" && (
          <div className="bg-white/3 border border-white/10 rounded-3xl p-8">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><User className="w-5 h-5 text-fuchsia-400" /> Your Profile</h2>
            <form onSubmit={handleSubmitProfile} className="space-y-5">
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-fuchsia-500/50 transition-colors"
                  onClick={() => fileRef.current?.click()}>
                  {profile.avatarUrl
                    ? <img src={profile.avatarUrl} className="w-full h-full object-cover" />
                    : uploading
                    ? <Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" />
                    : <Upload className="w-6 h-6 text-white/30" />}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-fuchsia-400 hover:text-fuchsia-300">
                  {profile.avatarUrl ? "Change photo" : "Upload profile photo"}
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Full Name *</label>
                  <input required value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500/50"
                    placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Role / Title *</label>
                  <input required value={profile.role} onChange={e => setProfile(p => ({...p, role: e.target.value}))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500/50"
                    placeholder="e.g. Marketing Manager" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Company / Brand</label>
                  <input value={profile.company} onChange={e => setProfile(p => ({...p, company: e.target.value}))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500/50"
                    placeholder="Your company name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Location</label>
                  <input value={profile.location} onChange={e => setProfile(p => ({...p, location: e.target.value}))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500/50"
                    placeholder="City, State" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Skills / Expertise (comma separated)</label>
                <input value={profile.skills} onChange={e => setProfile(p => ({...p, skills: e.target.value}))}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500/50"
                  placeholder="e.g. SEO, Social Media, Email Campaigns" />
              </div>
              <button type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/25">
                Find My Matches <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP: Searching */}
        {step === "searching" && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-20 h-20 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
              <Search className="w-9 h-9 text-fuchsia-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white mb-1">Finding your best matches…</p>
              <p className="text-sm text-white/40">AI is analysing profiles across the platform</p>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce" style={{ animationDelay: i*0.15+"s" }} />
              ))}
            </div>
          </div>
        )}

        {/* STEP: Matches */}
        {step === "matches" && (
          <div>
            {/* Search bar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500/40"
                  placeholder="Search by name, role, location, skill…" />
              </div>
              <button onClick={() => setStep("profile")} className="text-xs text-white/40 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl transition-colors">
                Edit Profile
              </button>
            </div>

            {/* Profile summary */}
            <div className="mb-6 p-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} className="w-full h-full object-cover" />
                  : <User className="w-6 h-6 text-fuchsia-400" />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{profile.name}</p>
                <p className="text-white/50 text-xs">{profile.role}{profile.company ? ` · ${profile.company}` : ""}{profile.location ? ` · ${profile.location}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-fuchsia-400 font-bold text-sm">{filteredMatches.length}</p>
                <p className="text-white/40 text-xs">matches found</p>
              </div>
            </div>

            {/* Match grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredMatches.map((match, idx) => {
                const isLocked = idx >= 2; // first 2 visible, rest locked
                return (
                  <div key={match.id} className={`relative rounded-2xl border p-5 transition-all ${isLocked ? "border-white/8 bg-white/2" : "border-white/12 bg-white/4 hover:border-white/20"}`}>
                    {/* Match % badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30">
                      <Star className="w-3 h-3 text-fuchsia-400 fill-fuchsia-400" />
                      <span className="text-xs font-bold text-fuchsia-300">{match.match}% match</span>
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <img src={match.avatar} alt={match.name}
                        className={`w-14 h-14 rounded-xl object-cover flex-shrink-0 ${isLocked ? "blur-sm opacity-50 grayscale" : ""}`}
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${match.name}&background=7c3aed&color=fff`; }} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm mb-0.5 ${isLocked ? "blur-sm select-none" : "text-white"}`}>{match.name}</p>
                        <p className="text-fuchsia-300 text-xs font-medium mb-1 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {match.role}
                        </p>
                        <p className="text-white/40 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {match.company} · {match.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {match.skills.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">{s}</span>
                      ))}
                    </div>

                    {isLocked ? (
                      <button onClick={() => setLockedModal(match)}
                        className="w-full py-2.5 rounded-xl border border-white/15 text-white/50 text-xs font-semibold flex items-center justify-center gap-2 hover:border-fuchsia-500/40 hover:text-fuchsia-300 transition-all">
                        <Lock className="w-3.5 h-3.5" /> Upgrade to Contact
                      </button>
                    ) : (
                      <button onClick={() => setLockedModal(match)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md shadow-fuchsia-500/20">
                        Contact {match.name.split(" ")[0]} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upgrade CTA */}
            <div className="mt-10 p-6 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/5 text-center">
              <Lock className="w-7 h-7 text-fuchsia-400 mx-auto mb-3" />
              <h3 className="font-bold text-white text-lg mb-1">Unlock All Matches & Contact Anyone</h3>
              <p className="text-white/50 text-sm mb-5">Upgrade to a paid plan to message all matches, access analytics, AI tools, and more.</p>
              <Link to="/pricing"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold text-sm hover:opacity-90 shadow-lg shadow-fuchsia-500/25">
                View Plans & Upgrade <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Upgrade / Contact Modal */}
      {lockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setLockedModal(null)}>
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setLockedModal(null)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            <div className="text-center mb-5">
              <img src={lockedModal.avatar} alt={lockedModal.name}
                className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 border border-white/10"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${lockedModal.name}&background=7c3aed&color=fff`; }} />
              <h3 className="font-bold text-white">{lockedModal.name}</h3>
              <p className="text-white/50 text-xs">{lockedModal.role} · {lockedModal.company}</p>
            </div>
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl p-4 mb-5 text-center">
              <Lock className="w-5 h-5 text-fuchsia-400 mx-auto mb-2" />
              <p className="text-sm text-white/80 font-medium">Upgrade to contact {lockedModal.name.split(" ")[0]}</p>
              <p className="text-xs text-white/40 mt-1">Plans start from $49/month. Unlock messaging, AI tools, and more.</p>
            </div>
            <div className="space-y-3">
              <Link to="/pricing"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold text-sm hover:opacity-90">
                Upgrade Now <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => setLockedModal(null)}
                className="w-full py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-colors">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}