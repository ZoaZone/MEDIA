import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Settings, Key, Bell, Globe, Save, CheckCircle2, Loader2, Eye, EyeOff, Zap, User, Palette } from "lucide-react";
import { base44 } from "@/api/base44Client";

const KEY_FIELDS = [
  { k: "sendgrid_key",    l: "SendGrid API Key",      ph: "SG.xxxxxxxx", help: "For email campaigns — get from sendgrid.com/account/apikeys" },
  { k: "twilio_sid",      l: "Twilio Account SID",    ph: "ACxxxxxxxx",  help: "From twilio.com/console — for SMS campaigns" },
  { k: "twilio_token",    l: "Twilio Auth Token",      ph: "xxxxxxxx",    help: "Twilio auth token from console" },
  { k: "twilio_phone",    l: "Twilio Phone Number",    ph: "+1 555 0000", help: "Your SMS sending number (E.164 format)" },
  { k: "whatsapp_token",  l: "WhatsApp BSP Token",     ph: "EAxxxxxxxx",  help: "WhatsApp Business API token from Meta Business Suite" },
  { k: "whatsapp_phone_id", l: "WhatsApp Phone ID",   ph: "1234567890",  help: "Phone number ID from Meta Business Suite → WhatsApp" },
  { k: "stripe_key",      l: "Stripe Secret Key",     ph: "sk_live_...", help: "From dashboard.stripe.com/apikeys (optional — PayPal works without this)" },
];

const TIMEZONES = ["UTC", "Asia/Calcutta", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore", "Asia/Dubai"];

export default function SettingsPage() {
  const { user } = useOutletContext() || {};
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({});
  const [tab, setTab] = useState("apikeys");
  const [keys, setKeys] = useState({
    sendgrid_key: "", twilio_sid: "", twilio_token: "", twilio_phone: "",
    whatsapp_token: "", whatsapp_phone_id: "", stripe_key: "",
  });
  const [profile, setProfile] = useState({ full_name: "", business_name: "", website: "", logo_url: "", timezone: "Asia/Calcutta" });
  const [notifs, setNotifs] = useState({ email_campaigns: true, email_leads: true, email_social: false, weekly_report: true });

  useEffect(() => {
    if (user?.settings) {
      if (user.settings.api_keys) setKeys(k => ({ ...k, ...user.settings.api_keys }));
      if (user.settings.profile) setProfile(p => ({ ...p, ...user.settings.profile }));
      if (user.settings.notifications) setNotifs(n => ({ ...n, ...user.settings.notifications }));
    }
    if (user?.full_name) setProfile(p => ({ ...p, full_name: user.full_name }));
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ settings: { api_keys: keys, profile, notifications: notifs } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const TABS = [
    { v: "apikeys",  l: "API Keys",     Icon: Key },
    { v: "profile",  l: "Profile",      Icon: User },
    { v: "notifs",   l: "Notifications",Icon: Bell },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-fuchsia-400" /> Settings
          </h1>
          <p className="text-muted-foreground text-sm">Configure API keys, integrations, and preferences</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-fuchsia-500/20">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <t.Icon className="w-4 h-4" /> {t.l}
          </button>
        ))}
      </div>

      {/* API Keys */}
      {tab === "apikeys" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
            <Zap className="w-3.5 h-3.5 inline mr-1.5" />
            Keys are encrypted and stored in your account settings. They are used only for your campaigns.
          </div>
          {KEY_FIELDS.map(({ k, l, ph, help }) => (
            <div key={k}>
              <label className="text-sm font-medium text-foreground block mb-1">{l}</label>
              <p className="text-xs text-muted-foreground mb-1.5">{help}</p>
              <div className="relative">
                <input
                  type={show[k] ? "text" : "password"}
                  value={keys[k] || ""}
                  onChange={e => setKeys(p => ({ ...p, [k]: e.target.value }))}
                  placeholder={ph}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-card border border-border text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                />
                <button onClick={() => setShow(p => ({ ...p, [k]: !p[k] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile */}
      {tab === "profile" && (
        <div className="space-y-4">
          {[
            { k: "full_name", l: "Your Name", ph: "Jane Smith", type: "text" },
            { k: "business_name", l: "Business Name", ph: "Acme Marketing Agency", type: "text" },
            { k: "website", l: "Website", ph: "https://youragency.com", type: "url" },
            { k: "logo_url", l: "Logo URL", ph: "https://...", type: "url" },
          ].map(({ k, l, ph, type }) => (
            <div key={k}>
              <label className="text-sm font-medium text-foreground block mb-1">{l}</label>
              <input type={type} value={profile[k] || ""} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))}
                placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-fuchsia-500/50 transition-colors" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Timezone</label>
            <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-fuchsia-500/50 transition-colors">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === "notifs" && (
        <div className="space-y-3">
          {[
            { k: "email_campaigns", l: "Campaign completion emails", desc: "Get notified when a campaign finishes sending" },
            { k: "email_leads",     l: "New lead notifications",     desc: "Email alert when a new lead is captured" },
            { k: "email_social",    l: "Social post alerts",         desc: "Get notified when scheduled posts go live" },
            { k: "weekly_report",   l: "Weekly performance report",  desc: "Summary of your marketing metrics every Monday" },
          ].map(({ k, l, desc }) => (
            <div key={k} className="flex items-start justify-between p-4 rounded-xl bg-card border border-border gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{l}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <button onClick={() => setNotifs(p => ({ ...p, [k]: !p[k] }))}
                className={`w-10 h-5.5 rounded-full flex-shrink-0 transition-all relative mt-0.5 ${notifs[k] ? "bg-fuchsia-500" : "bg-muted"}`}
                style={{ height: "22px", width: "40px" }}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${notifs[k] ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
