import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, Megaphone, Share2, GitBranch, UserPlus, Globe,
  BarChart3, Zap, ArrowRight, Check, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Sparkles, title: "AI Media Creation", desc: "Generate images, videos, scripts, ad creatives with AI" },
  { icon: Megaphone, title: "Bulk Messaging", desc: "SMS, WhatsApp & Email campaigns at scale" },
  { icon: Share2, title: "Social Scheduling", desc: "Auto-schedule posts across all platforms" },
  { icon: GitBranch, title: "Funnel Builder", desc: "Visual funnels with automated follow-ups" },
  { icon: UserPlus, title: "Lead Capture", desc: "Capture, score and nurture leads automatically" },
  { icon: Globe, title: "Web & App Projects", desc: "Manage website and app builds end-to-end" },
  { icon: BarChart3, title: "Analytics", desc: "Campaign performance, ROI tracking, insights" },
  { icon: Zap, title: "Automation", desc: "Trigger-based follow-ups and workflows" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-magenta flex items-center justify-center shadow-lg shadow-magenta/20">
              <span className="text-white font-black text-xs">M</span>
            </div>
            <span className="text-lg font-black tracking-wider gradient-text">Marketer</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors">Features</a>
            <Link to="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline" className="text-sm border-white/10 text-white/70 hover:text-white hover:bg-white/5 bg-transparent">
                Login
              </Button>
            </Link>
            <Link to="/pricing">
              <Button className="text-sm gradient-magenta hover:opacity-90 border-0 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-magenta/5 blur-[150px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-gold/3 blur-[120px]" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-white/60 mb-8">
              <Star className="w-3 h-3 text-gold" />
              <span>The AI Marketing OS for Agencies</span>
            </div>
          </motion.div>
          <motion.h1
            className="text-5xl md:text-7xl font-black leading-tight tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="text-white">Create. Reach. </span>
            <br />
            <span className="gradient-text">Engage. Amplify. Monetize.</span>
          </motion.h1>
          <motion.p
            className="text-lg text-white/40 max-w-2xl mx-auto mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            One platform to generate AI content, run bulk campaigns, schedule social posts,
            build funnels, capture leads, and manage web projects — all under one roof.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link to="/pricing">
              <Button size="lg" className="gradient-magenta hover:opacity-90 border-0 text-white px-8 h-12 text-sm font-semibold shadow-lg shadow-magenta/20">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 bg-transparent h-12 px-8 text-sm">
                View Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white">Everything You Need</h2>
            <p className="text-white/40 mt-3 max-w-lg mx-auto">A full-stack marketing operating system built for agencies and businesses.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass rounded-xl p-6 group hover:border-magenta/30 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-magenta/10 flex items-center justify-center mb-4 group-hover:bg-magenta/20 transition-colors">
                  <f.icon className="w-5 h-5 text-magenta" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-2xl p-12 md:p-16 neon-magenta">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to Scale?</h2>
            <p className="text-white/40 max-w-md mx-auto mb-8">
                          Join agencies using Marketer to create, reach, engage, amplify and monetize., reach, engage, amplify and monetize.
            </p>
            <Link to="/pricing">
              <Button size="lg" className="gradient-magenta hover:opacity-90 border-0 text-white px-10 h-12 font-semibold">
                Get Started Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-magenta flex items-center justify-center">
              <span className="text-white font-black text-[10px]">M</span>
            </div>
            <span className="text-xs font-bold gradient-text">Marketer</span>
          </div>
          <p className="text-xs text-white/30">© 2026 media.aevoice.ai — All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}