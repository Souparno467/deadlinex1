import React from "react";
import { 
  ShieldAlert, 
  User, 
  TrendingUp, 
  ListTodo, 
  Calendar, 
  Trophy, 
  ShoppingBag, 
  Sparkles,
  Zap,
  RefreshCw
} from "lucide-react";
import { TeamMember } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: TeamMember | null;
  toggleRole: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, toggleRole }: SidebarProps) {
  if (!currentUser) return null;

  const menuItems = [
    { id: "dashboard", name: "Executive Hub", icon: TrendingUp },
    { id: "missions", name: "Missions & Rescues", icon: ListTodo },
    { id: "calendar", name: "Smart Calendar", icon: Calendar },
    { id: "leaderboard", name: "Leaderboard & XP", icon: Trophy },
    { id: "rewards", name: "Rewards Store", icon: ShoppingBag }
  ];

  // Calculate percentage of XP to next level (300 XP per level)
  const xpInCurrentLevel = currentUser.xp % 300;
  const xpPercentage = Math.min(100, Math.floor((xpInCurrentLevel / 300) * 100));

  return (
    <aside id="sidebar-panel" className="w-68 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3.5">
        <div className="h-9 w-9 bg-red-500 flex items-center justify-center font-black text-slate-950 font-mono text-xl select-none">
          DX
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-red-500 select-none uppercase font-display leading-none">
            DEADLINEX
          </h1>
          <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-1">EXECUTION ENGINE</p>
        </div>
      </div>

      {/* Active User Stats Card */}
      <div className="p-4 mx-4 my-6 bg-slate-950/60 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-3 mb-3">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-10 h-10 rounded-full border-2 border-red-500/50 object-cover"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-100 truncate">{currentUser.name}</h3>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                LVL {currentUser.level}
              </span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center text-amber-400">
                <Zap className="w-3 h-3 mr-0.5 fill-amber-400/20" />
                {currentUser.coins} coins
              </span>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>XP: {currentUser.xp % 300}/300</span>
            <span>{xpPercentage}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${xpPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Role Switcher — toggles manager/employee to show or hide executive AI tools */}
      <div className="px-4 pb-2">
        <button
          onClick={toggleRole}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 transition-all group"
          title="Switch between Manager and Employee view"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 transition-colors" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Active Role</span>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            currentUser.role === "manager"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          }`}>
            {currentUser.role}
          </span>
        </button>
      </div>



      {/* Menu Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-none text-xs font-mono tracking-wider uppercase transition-all duration-150 group border-b border-slate-800/40 ${
                isActive 
                  ? "bg-red-500/10 text-white border-l-2 border-red-500 font-bold" 
                  : "text-slate-500 hover:bg-slate-800/10 hover:text-slate-300"
              }`}
            >
              <Icon className={`h-4 w-4 transition-colors ${
                isActive ? "text-red-500" : "text-slate-500 group-hover:text-slate-400"
              }`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-800 text-center">
        <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-red-500/80 animate-pulse" />
          <span>Active Operations</span>
        </div>
      </div>
    </aside>
  );
}
