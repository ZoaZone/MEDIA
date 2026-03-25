import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, ArrowRight, CheckCircle2, Loader2, ExternalLink, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const PLANS=[
  {name:"Starter",price:49,tier:1,features:["1 client","500 AI gen/mo","1K messages","3 socials"]},
  {name:"Growth",price:149,tier:2,popular:true,features:["5 clients","2.5K AI gen/mo","10K messages","15 socials"]},
  {name:"Agency",price:399,tier:3,features:["Unlimited clients","10K AI gen/mo","50K messages","Unlimited socials","Affiliate & Agency portals"]},
];

export default function Billing() {
  const {user}=useOutletContext()||{};
  const [loadingPortal,setLoadingPortal]=useState(false);

  const {data:sub}=useQuery({
    queryKey:["subscription",user?.email],
    queryFn:()=>base44.entities.Subscription.filter({owner_email:user?.email},null,1).then(r=>r[0]||null),
    enabled:!!user?.email,
  });
  const {data:campaigns=[]}=useQuery({queryKey:["campaigns_b"],queryFn:()=>base44.entities.MarketingCampaign.list(null,200)});
  const {data:assets=[]}=useQuery({queryKey:["assets_b"],queryFn:()=>base44.entities.ContentAsset.list(null,200)});
  const {data:posts=[]}=useQuery({queryKey:["posts_b"],queryFn:()=>base44.entities.ScheduledPost.list(null,200)});

  const totalSent=campaigns.reduce((s,c)=>s+(c.sent_count||0),0);
  const aiGenCount=assets.filter(a=>a.ai_generated).length;
  const postsCount=posts.length;

  const openPortal=async()=>{
    setLoadingPortal(true);
    try{
      const res=await base44.functions.invoke("stripePortalMarketer",{email:user?.email,return_url:window.location.href});
      if(res?.url) window.location.href=res.url;
      else alert("Could not open billing portal. Contact care@aevoice.ai");
    }catch(e){alert("Portal error: "+e.message);}
    setLoadingPortal(false);
  };

  const currentPlan=PLANS.find(p=>p.name===sub?.plan_name)||null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2"><CreditCard className="w-6 h-6 text-fuchsia-400"/>Billing</h1>
        <p className="text-muted-foreground text-sm">Plan, usage and payment management</p>
      </div>

      <div className={`bg-card border rounded-2xl p-6 ${currentPlan?.popular?"border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/10":"border-border"}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
            {sub?(
              <>
                <h2 className="text-2xl font-black text-foreground">{sub.plan_name} <span className="text-fuchsia-400">${currentPlan?.price||""}/mo</span></h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sub.status==="active"?"bg-emerald-500/10 text-emerald-400":"bg-muted text-muted-foreground"}`}>{sub.status}</span>
                  {sub.current_period_end&&<span className="text-xs text-muted-foreground">Renews {new Date(sub.current_period_end).toLocaleDateString()}</span>}
                </div>
              </>
            ):(
              <><h2 className="text-2xl font-black text-foreground">Free Trial</h2><p className="text-sm text-muted-foreground mt-1">Upgrade to unlock all features</p></>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {sub&&<button onClick={openPortal} disabled={loadingPortal} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/20 disabled:opacity-60">
              {loadingPortal?<Loader2 className="w-4 h-4 animate-spin"/>:<><ExternalLink className="w-4 h-4"/>Manage Subscription</>}
            </button>}
            <Link to="/pricing" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 shadow-lg shadow-fuchsia-500/20">
              {sub?"Upgrade Plan":"Choose Plan"}<ArrowRight className="w-4 h-4"/>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-fuchsia-400"/>Usage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{l:"Messages Sent",v:totalSent.toLocaleString()},{l:"AI Generations",v:aiGenCount},{l:"Posts",v:postsCount},{l:"Campaigns",v:campaigns.length}].map(u=>(
            <div key={u.l} className="p-3 bg-muted/20 rounded-xl">
              <div className="text-xl font-black text-foreground">{u.v}</div>
              <div className="text-xs text-muted-foreground">{u.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">All Plans</h3>
        {PLANS.map(plan=>(
          <div key={plan.name} className={`bg-card border rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 ${currentPlan?.name===plan.name?"border-fuchsia-500/30 opacity-100":"border-border opacity-70 hover:opacity-90"}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{plan.name}</span>
                {plan.popular&&<span className="text-[10px] px-2 py-0.5 bg-fuchsia-500/20 text-fuchsia-400 rounded-full font-medium">Popular</span>}
                {currentPlan?.name===plan.name&&<CheckCircle2 className="w-4 h-4 text-emerald-400"/>}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">{plan.features.map(f=><span key={f} className="text-[10px] text-muted-foreground">{f}</span>)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-foreground">${plan.price}<span className="text-xs text-muted-foreground">/mo</span></span>
              {currentPlan?.name!==plan.name&&<Link to="/pricing" className="px-3 py-1.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 text-xs font-semibold hover:bg-fuchsia-500/20">Select</Link>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">Billing questions: <a href="mailto:care@aevoice.ai" className="text-fuchsia-400 hover:underline">care@aevoice.ai</a></p>
    </div>
  );
}
