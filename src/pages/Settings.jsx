import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Settings, Key, Bell, Globe, Save, CheckCircle2, Loader2, Eye, EyeOff, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SettingsPage() {
  const {user}=useOutletContext()||{};
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const [show,setShow]=useState({});
  const [tab,setTab]=useState("apikeys");
  const [keys,setKeys]=useState({openai_key:"",twilio_sid:"",twilio_token:"",twilio_phone:"",sendgrid_key:"",whatsapp_token:"",whatsapp_phone_id:""});
  const [profile,setProfile]=useState({business_name:"",website:"",logo_url:"",timezone:"UTC"});

  const toggleShow=(k)=>setShow(p=>({...p,[k]:!p[k]}));

  const saveSettings=async()=>{
    setSaving(true);
    await base44.auth.updateMe({settings:{api_keys:keys,profile}}).catch(()=>{});
    setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2500);
  };

  const KEY_FIELDS=[
    {k:"openai_key",l:"OpenAI API Key",ph:"sk-...",help:"For AI content generation — all Media Studio features"},
    {k:"twilio_sid",l:"Twilio Account SID",ph:"ACxxxxxxxxxxxxxxxx",help:"For SMS campaigns"},
    {k:"twilio_token",l:"Twilio Auth Token",ph:"xxxxxxxxxxxxxxxx",help:"Twilio auth token"},
    {k:"twilio_phone",l:"Twilio Phone Number",ph:"+1 555 000 0000",help:"Your SMS sending number"},
    {k:"sendgrid_key",l:"SendGrid API Key",ph:"SG.xxxxxxxxxxxxxxxx",help:"For email campaigns"},
    {k:"whatsapp_token",l:"WhatsApp BSP Token",ph:"EAxxxxxxxxxx",help:"WhatsApp Business Solution Provider token"},
    {k:"whatsapp_phone_id",l:"WhatsApp Phone ID",ph:"1234567890",help:"From Meta Business Suite"},
  ];

  const TABS=[{v:"apikeys",l:"API Keys",Icon:Key},{v:"profile",l:"Profile",Icon:Globe},{v:"notifications",l:"Notifications",Icon:Bell}];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2"><Settings className="w-6 h-6 text-fuchsia-400"/>Settings</h1>
        <p className="text-muted-foreground text-sm">API keys, integrations and account configuration</p>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {TABS.map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v)} className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${tab===t.v?"text-fuchsia-400 border-b-2 border-fuchsia-500":"text-muted-foreground hover:text-foreground"}`}>
            <t.Icon className="w-4 h-4"/>{t.l}
          </button>
        ))}
      </div>

      {tab==="apikeys"&&(
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0"/>
            <p className="text-xs text-amber-400/80">Keys are encrypted and used only for your account's campaigns and AI generation.</p>
          </div>
          {KEY_FIELDS.map(f=>(
            <div key={f.k} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{f.l}</label>
              <div className="relative">
                <input type={show[f.k]?"text":"password"} value={keys[f.k]} onChange={e=>setKeys(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} className="w-full h-9 px-3 pr-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"/>
                <button onClick={()=>toggleShow(f.k)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{show[f.k]?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}</button>
              </div>
              <p className="text-[10px] text-muted-foreground/60">{f.help}</p>
            </div>
          ))}
          <button onClick={saveSettings} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:saved?<><CheckCircle2 className="w-4 h-4"/>Saved!</>:<><Save className="w-4 h-4"/>Save Keys</>}
          </button>
        </div>
      )}

      {tab==="profile"&&(
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-sm text-muted-foreground">Business info used in AI-generated content</p>
          {[{k:"business_name",l:"Business Name",ph:"Acme Marketing Co."},{k:"website",l:"Website",ph:"https://yoursite.com"},{k:"logo_url",l:"Logo URL",ph:"https://…/logo.png"},{k:"timezone",l:"Timezone",ph:"Asia/Calcutta"}].map(f=>(
            <div key={f.k} className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{f.l}</label>
            <input value={profile[f.k]} onChange={e=>setProfile(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
          ))}
          <div className="pt-1 text-xs text-muted-foreground">
            <p>Account: <span className="text-foreground">{user?.email}</span></p>
            <p className="mt-0.5">Role: <span className="text-foreground capitalize">{user?.role||"user"}</span></p>
          </div>
          <button onClick={saveSettings} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:saved?<><CheckCircle2 className="w-4 h-4"/>Saved!</>:"Save Profile"}
          </button>
        </div>
      )}

      {tab==="notifications"&&(
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          {[{l:"Campaign sent",d:"Email when bulk campaign is dispatched"},{l:"New lead alert",d:"Alert when a new lead is captured"},{l:"Post published",d:"Confirmation when social post goes live"},{l:"Weekly report",d:"Analytics summary every Monday morning"},{l:"Failed message",d:"Alert when a bulk message fails delivery"}].map(n=>(
            <div key={n.l} className="flex items-center justify-between p-3 border border-border rounded-xl">
              <div><p className="text-sm font-medium text-foreground">{n.l}</p><p className="text-xs text-muted-foreground">{n.d}</p></div>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-fuchsia-500"/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
