import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Users, Megaphone, BarChart3, DollarSign, Loader2, Search, Gift, Send, CheckCircle2, X, Plus, Link, Copy, UserCheck, Clock, UserX } from "lucide-react";

export default function AdminDashboard() {
  const {user}=useOutletContext()||{};
  const [tab,setTab]=useState("overview");
  const [search,setSearch]=useState("");
  const qc=useQueryClient();

  // Beta invite state
  const [inviteEmails,setInviteEmails]=useState("");
  const [inviteNote,setInviteNote]=useState("");
  const [inviting,setInviting]=useState(false);
  const [inviteResults,setInviteResults]=useState([]);
  const [linkCopied,setLinkCopied]=useState(false);

  const {data:subs=[]}=useQuery({queryKey:["admin_subs"],queryFn:()=>base44.entities.Subscription.filter({},"-created_date",200)});
  const {data:betaRequests=[],refetch:refetchBeta}=useQuery({queryKey:["beta_requests"],queryFn:()=>base44.entities.BetaRequest.filter({},"-created_date",200)});
  const {data:campaigns=[]}=useQuery({queryKey:["admin_campaigns"],queryFn:()=>base44.entities.MarketingCampaign.filter({},"-created_date",200)});
  const {data:leads=[]}=useQuery({queryKey:["admin_leads"],queryFn:()=>base44.entities.LeadCapture.filter({},"-captured_at",500)});
  const {data:contacts=[]}=useQuery({queryKey:["admin_contacts"],queryFn:()=>base44.entities.MarketingContact.filter({},"-created_date",500)});
  const {data:assets=[]}=useQuery({queryKey:["admin_assets"],queryFn:()=>base44.entities.ContentAsset.filter({},"-created_date",200)});

  if(user?.role!=="admin") return(
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3"/><p className="text-lg font-semibold text-foreground">Admin Access Required</p></div>
    </div>
  );

  const PRICES={Starter:49,Growth:149,Agency:399};
  const activeSubs=subs.filter(s=>s.status==="active");
  const mrr=activeSubs.reduce((s,sub)=>s+(PRICES[sub.plan_name]||0),0);
  const totalSent=campaigns.reduce((s,c)=>s+(c.sent_count||0),0);
  const aiCount=assets.filter(a=>a.ai_generated).length;

  const filteredSubs=subs.filter(s=>!search||(s.owner_email||"").toLowerCase().includes(search.toLowerCase()));

  const APP_URL = "https://media.aevoice.ai";
  const betaInviteLink = `${APP_URL}/beta`;

  const copyLink = () => {
    navigator.clipboard.writeText(betaInviteLink);
    setLinkCopied(true);
    setTimeout(()=>setLinkCopied(false),2000);
  };

  // Generate a cryptographically random invite token
  const generateToken = () => {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const buildInviteHtml = (inviteUrl, note) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:24px;border:1px solid #1f1f2e;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;">MARKETER</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">by AEVOICE</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <div style="background:#7c3aed22;border:1px solid #7c3aed44;border-radius:12px;padding:12px 16px;margin-bottom:28px;text-align:center;">
            <span style="color:#a855f7;font-size:13px;font-weight:600;">🎉 You have a personal beta invitation</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 12px;line-height:1.3;">You're invited to join<br/><span style="background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">MARKETER Beta</span></h1>
          <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px;">Our team has personally selected you for exclusive early access to MARKETER — the AI-powered marketing platform built for modern brands and agencies.</p>
          ${note ? `<div style="background:#1a1a2e;border-left:3px solid #a855f7;border-radius:8px;padding:14px 16px;margin-bottom:24px;"><p style="color:#ccc;font-size:14px;margin:0;font-style:italic;">"${note}"</p><p style="color:#666;font-size:12px;margin:6px 0 0;">— The MARKETER Team</p></div>` : ''}
          <!-- What's included -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; Full <strong>Agency-tier</strong> access — free for 1 year</td></tr>
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; AI Media Studio, Campaigns & Social Scheduling</td></tr>
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; Multi-channel: Email · SMS · WhatsApp · Social</td></tr>
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; Priority support &amp; direct feedback channel</td></tr>
          </table>
          <!-- CTA Button -->
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:14px;letter-spacing:0.3px;">
              🚀 Claim My Free Access
            </a>
          </div>
          <!-- Invite link -->
          <div style="background:#0a0a0a;border:1px solid #1f1f2e;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
            <p style="color:#666;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;">Your personal invite link</p>
            <p style="color:#a855f7;font-size:13px;margin:0;word-break:break-all;">${inviteUrl}</p>
          </div>
          <p style="color:#555;font-size:13px;margin:0;line-height:1.5;">This link is exclusive to you and expires in <strong style="color:#888;">30 days</strong>. If you have questions, reply to this email or reach us at <a href="mailto:hello@aevoice.ai" style="color:#a855f7;">hello@aevoice.ai</a></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0d0d14;padding:20px 40px;border-top:1px solid #1f1f2e;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">© 2026 AEVOICE · <a href="https://media.aevoice.ai" style="color:#666;">media.aevoice.ai</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const sendBetaInvites = async () => {
    const emails = inviteEmails.split(/[\n,;]+/).map(e=>e.trim()).filter(Boolean);
    if(!emails.length) return;
    setInviting(true);
    setInviteResults([]);
    const results=[];
    for(const email of emails){
      try{
        // Generate unique invite token (30-day expiry)
        const invToken = generateToken();
        const expiresAt = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        await base44.entities.BetaInvite.create({
          email,
          token: invToken,
          invited_by: user?.email || "admin",
          note: inviteNote || "",
          status: "pending",
          expires_at: expiresAt,
          source: "manual_invite",
        });
        const inviteUrl = `${APP_URL}/invite/${invToken}`;
        const htmlBody = buildInviteHtml(inviteUrl, inviteNote);
        await base44.functions.invoke("sendEmailFallback", {
          to: email,
          subject: "🎉 You're personally invited — Free Beta Access to MARKETER",
          body: `Hi there!\n\nYou've been personally invited to MARKETER Beta — full Agency-tier access, completely free.\n\n${inviteNote ? `Personal note: "${inviteNote}"\n\n` : ""}👉 Claim your access here:\n${inviteUrl}\n\nThis link is exclusive to you and expires in 30 days.\n\n— The MARKETER Team\nhello@aevoice.ai`,
          html: htmlBody,
          from_name: "MARKETER by AEVOICE",
        });
        results.push({email,status:"success"});
      } catch(err){
        results.push({email,status:"error",msg:err.message});
      }
    }
    setInviteResults(results);
    setInviting(false);
    qc.invalidateQueries(["admin_subs"]);
  };

  const approveBetaRequest = async (req) => {
    try {
      // Create subscription
      await base44.entities.Subscription.create({
        owner_email: req.email,
        plan_name: "Beta Pro",
        plan_tier: "agency",
        status: "active",
        current_period_end: new Date(Date.now()+365*24*60*60*1000).toISOString(),
      });
      // Generate unique invite token for approved beta request
      const approveToken = generateToken();
      const approveExpiry = new Date(Date.now() + 30*24*60*60*1000).toISOString();
      await base44.entities.BetaInvite.create({
        email: req.email,
        token: approveToken,
        invited_by: user?.email || "admin",
        note: "",
        status: "pending",
        expires_at: approveExpiry,
        source: "beta_request_approved",
      });
      const approveUrl = `${APP_URL}/invite/${approveToken}`;
      const approveHtml = buildInviteHtml(approveUrl, "");
      await base44.functions.invoke("sendEmailFallback", {
        to: req.email,
        subject: "🎉 Your Beta Access is Approved — Welcome to MARKETER!",
        body: `Hi ${req.full_name}!\n\nGreat news — your beta access request has been approved! 🚀\n\nYou now have full Agency-tier access to MARKETER, completely free.\n\n👉 Claim your access here:\n${approveUrl}\n\nThis link is exclusive to you and expires in 30 days.\n\nWelcome aboard!\n— The MARKETER Team`,
        html: approveHtml,
        from_name: "MARKETER by AEVOICE",
      });
      // Mark as approved
      await base44.entities.BetaRequest.update(req.id, { status: "approved", invite_sent: true });
      refetchBeta();
      qc.invalidateQueries(["admin_subs"]);
    } catch(err) { alert("Error: "+err.message); }
  };

  const rejectBetaRequest = async (req) => {
    await base44.entities.BetaRequest.update(req.id, { status: "rejected" });
    refetchBeta();
  };

  const Stat=({Icon,label,value,color="text-fuchsia-400 bg-fuchsia-500/10"})=>(
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}><Icon className={`w-4 h-4 ${color.split(" ")[0]}`}/></div>
      <div className="text-2xl font-black text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );

  return(
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-fuchsia-400"/>
        <div><h1 className="text-2xl font-black text-foreground">Admin Dashboard</h1><p className="text-muted-foreground text-sm">MARKETER platform overview</p></div>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {[{v:"overview",l:"Overview"},{v:"subscribers",l:"Subscribers"},{v:"activity",l:"Activity"},{v:"beta",l:"🎁 Beta Invites"}].map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v)} className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${tab===t.v?"text-fuchsia-400 border-b-2 border-fuchsia-500":"text-muted-foreground hover:text-foreground"}`}>{t.l}</button>
        ))}
      </div>

      {tab==="overview"&&(
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat Icon={Users} label="Active Subscribers" value={activeSubs.length}/>
            <Stat Icon={DollarSign} label="Platform MRR" value={`$${mrr.toLocaleString()}`} color="text-emerald-400 bg-emerald-500/10"/>
            <Stat Icon={Megaphone} label="Messages Sent" value={totalSent.toLocaleString()} color="text-purple-400 bg-purple-500/10"/>
            <Stat Icon={BarChart3} label="AI Generations" value={aiCount} color="text-amber-400 bg-amber-500/10"/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat Icon={Users} label="Total Contacts" value={contacts.length} color="text-blue-400 bg-blue-500/10"/>
            <Stat Icon={Users} label="Total Leads" value={leads.length} color="text-pink-400 bg-pink-500/10"/>
            <Stat Icon={Megaphone} label="Total Campaigns" value={campaigns.length} color="text-orange-400 bg-orange-500/10"/>
            <Stat Icon={DollarSign} label="All Subscriptions" value={subs.length} color="text-cyan-400 bg-cyan-500/10"/>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Plan Breakdown</h3>
            <div className="grid grid-cols-3 gap-3">
              {["Starter","Growth","Agency"].map(plan=>{
                const cnt=activeSubs.filter(s=>s.plan_name===plan).length;
                return(<div key={plan} className="text-center p-4 border border-border rounded-xl">
                  <div className="text-2xl font-black text-foreground">{cnt}</div>
                  <div className="text-xs text-muted-foreground">{plan}</div>
                  <div className="text-xs text-emerald-400 mt-0.5">${(cnt*(PRICES[plan]||0)).toLocaleString()}/mo</div>
                </div>);
              })}
            </div>
          </div>
        </div>
      )}

      {tab==="subscribers"&&(
        <div className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subscribers…" className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none"/></div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/20 border-b border-border">{["Email","Plan","Status","Joined"].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {filteredSubs.slice(0,50).map(s=>(
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm text-foreground">{s.owner_email}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded-full font-medium">{s.plan_name||"Free"}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${s.status==="active"?"bg-emerald-500/10 text-emerald-400":"bg-muted text-muted-foreground"}`}>{s.status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.created_date?new Date(s.created_date).toLocaleDateString():""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSubs.length===0&&<div className="text-center py-8 text-muted-foreground text-sm">No subscribers found</div>}
          </div>
        </div>
      )}

      {tab==="beta"&&(
        <div className="space-y-5 max-w-2xl">
          <div className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20 rounded-2xl p-5 flex gap-3 items-start">
            <Gift className="w-5 h-5 text-fuchsia-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-sm font-bold text-foreground">Free Beta Invites — Full Agency Access</p>
              <p className="text-xs text-muted-foreground mt-1">Share the invite link or manually email users. Approved users get a welcome email with a sign-up link and Agency-tier access waiting for them.</p>
            </div>
          </div>

          {/* Shareable invite link */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Link className="w-3.5 h-3.5"/>Shareable Beta Signup Link</p>
            <p className="text-[11px] text-muted-foreground">Share this link on social media, WhatsApp, email, etc. Interested users fill a form and you approve them from the Pending Requests section below.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground flex items-center truncate font-mono text-xs">
                {betaInviteLink}
              </div>
              <button onClick={copyLink} className={`flex items-center gap-1.5 px-3 h-9 rounded-md text-xs font-semibold transition-all border ${linkCopied?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-500/20"}`}>
                {linkCopied?<><CheckCircle2 className="w-3.5 h-3.5"/>Copied!</>:<><Copy className="w-3.5 h-3.5"/>Copy Link</>}
              </button>
            </div>
          </div>

          {/* Pending beta requests */}
          {betaRequests.length>0&&(
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400"/>Beta Requests</p>
                <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{betaRequests.filter(r=>r.status==="pending").length} pending</span>
              </div>
              {betaRequests.map(r=>(
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.email}{r.company?` · ${r.company}`:""}</p>
                    {r.use_case&&<p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{r.use_case}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${r.status==="approved"?"bg-emerald-500/10 text-emerald-400":r.status==="rejected"?"bg-red-500/10 text-red-400":"bg-amber-500/10 text-amber-400"}`}>{r.status}</span>
                  {r.status==="pending"&&(
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={()=>approveBetaRequest(r)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                        <UserCheck className="w-3.5 h-3.5"/>Approve
                      </button>
                      <button onClick={()=>rejectBetaRequest(r)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
                        <UserX className="w-3.5 h-3.5"/>Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Plus className="w-3.5 h-3.5"/>Email Addresses</label>
              <textarea
                value={inviteEmails}
                onChange={e=>setInviteEmails(e.target.value)}
                rows={5}
                placeholder={"user1@example.com\nuser2@example.com\nor comma-separated: a@b.com, c@d.com"}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Enter one email per line, or comma/semicolon separated.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Personal Note (optional)</label>
              <textarea
                value={inviteNote}
                onChange={e=>setInviteNote(e.target.value)}
                rows={2}
                placeholder="e.g. We'd love your feedback as an early tester…"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-[11px] text-muted-foreground">This note is included in the welcome email sent to each invitee.</p>
            </div>

            <button
              onClick={sendBetaInvites}
              disabled={inviting||!inviteEmails.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-all shadow-lg shadow-fuchsia-500/20">
              {inviting?<><Loader2 className="w-4 h-4 animate-spin"/>Sending Invites…</>:<><Send className="w-4 h-4"/>Send Beta Invites</>}
            </button>
          </div>

          {inviteResults.length>0&&(
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">Invite Results</div>
              {inviteResults.map((r,i)=>(
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  {r.status==="success"
                    ?<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
                    :<X className="w-4 h-4 text-red-400 shrink-0"/>}
                  <span className="text-sm text-foreground flex-1">{r.email}</span>
                  {r.status==="success"
                    ?<span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Invited ✓</span>
                    :<span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full truncate max-w-[200px]">{r.msg}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==="activity"&&(
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {campaigns.slice(0,20).map(c=>(
            <div key={c.id} className="flex items-center gap-3 px-5 py-3">
              <Megaphone className="w-4 h-4 text-fuchsia-400 flex-shrink-0"/>
              <div className="flex-1"><p className="text-sm font-medium text-foreground">{c.name}</p><p className="text-xs text-muted-foreground">{c.type} · {c.sent_count||0} sent</p></div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.status==="running"?"bg-emerald-500/10 text-emerald-400":"bg-muted text-muted-foreground"}`}>{c.status}</span>
            </div>
          ))}
          {campaigns.length===0&&<div className="text-center py-8 text-muted-foreground text-sm">No activity yet</div>}
        </div>
      )}
    </div>
  );
}
