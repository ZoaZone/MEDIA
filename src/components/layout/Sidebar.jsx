import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Megaphone, Share2, Palette,
  PenTool, FileText, Globe, GitBranch, UserPlus,
  MailCheck, FolderOpen, MonitorSmartphone, BarChart3,
  Settings, CreditCard, Sparkles, Search, Menu, X,
  ChevronLeft, Image
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Contacts", icon: Users, path: "/contacts" },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { label: "Social Hub", icon: Share2, path: "/social-hub" },
  { label: "Media Studio", icon: Sparkles, path: "/media-studio" },
  { label: "Ad Creator", icon: PenTool, path: "/ad-creator" },
  { label: "Script Writer", icon: FileText, path: "/script-writer" },
  { label: "Website Scanner", icon: Search, path: "/website-scanner" },
  { label: "Funnel Builder", icon: GitBranch, path: "/funnel-builder" },
  { label: "Lead Capture", icon: UserPlus, path: "/lead-capture" },
  { label: "Follow Up", icon: MailCheck, path: "/follow-up" },
  { label: "Media Library", icon: Image, path: "/media-library" },
  { label: "Web Projects", icon: Globe, path: "/web-projects" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Billing", icon: CreditCard, path: "/billing" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-magenta flex items-center justify-center shadow-lg shadow-magenta/20">
            <span className="text-white font-black text-sm">M</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-black tracking-wider gradient-text">Marketer</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-magenta/15 text-magenta"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-magenta" : "text-white/40 group-hover:text-white/70"}`} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-magenta" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl glass flex items-center justify-center text-white/70"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-dark-navy border-r border-white/5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen bg-dark-navy border-r border-white/5 transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        <NavContent />
      </aside>
    </>
  );
}