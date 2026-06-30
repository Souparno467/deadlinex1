import React, { useState } from "react";
import { 
  Trophy, 
  Crown, 
  User, 
  Star, 
  Zap, 
  CheckCircle, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  UserPlus,
  Mail,
  Loader2,
  X,
  Check
} from "lucide-react";
import { TeamMember } from "../types";

interface LeaderboardProps {
  members: TeamMember[];
  currentUser: TeamMember;
  onAddEmployee: (employeeData: { name: string; email: string; role: string; avatar?: string; status?: string }) => Promise<{ success: boolean; error?: string }>;
}

export default function Leaderboard({ members, currentUser, onAddEmployee }: LeaderboardProps) {
  // Sort members by total XP
  const sortedMembers = [...members].sort((a, b) => b.xp - a.xp);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [avatar, setAvatar] = useState("");
  const [status, setStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please fill in both Name and Workstation Email.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    const result = await onAddEmployee({
      name: name.trim(),
      email: email.trim(),
      role,
      avatar: avatar.trim() || undefined,
      status
    });

    setSubmitting(false);
    if (result.success) {
      setSuccess(true);
      setName("");
      setEmail("");
      setAvatar("");
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || "Failed to onboard employee.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "overloaded": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "crunching": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "offline": return "bg-slate-800 text-slate-500 border-slate-800/50";
      default: return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Stat Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium">Top Performer</span>
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-amber-400 fill-amber-400/20" />
            <span className="text-base font-bold text-white font-display">{sortedMembers[0]?.name}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Ranked by total XP earned</p>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 pl-0 md:pl-6">
          <span className="text-xs text-slate-400 font-medium">Team Level Average</span>
          <div className="text-xl font-bold text-slate-100 font-display">Level {(members.reduce((acc, m) => acc + m.level, 0) / members.length).toFixed(1)}</div>
          <p className="text-[10px] text-slate-500 font-mono">Reflects active skill maturity</p>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 pl-0 md:pl-6">
          <span className="text-xs text-slate-400 font-medium">Average On-Time delivery</span>
          <div className="text-xl font-bold text-emerald-400 font-display">{(members.reduce((acc, m) => acc + m.onTimeRate, 0) / members.length).toFixed(1)}% Accuracy</div>
          <p className="text-[10px] text-slate-500 font-mono">Calculated from last 100 sprints</p>
        </div>
      </div>

      {/* Onboard Employee Section (Manager only) */}
      {currentUser?.role === "manager" && (
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-500" />
                Employee Onboarding Console
              </h3>
              <p className="text-[11px] text-slate-400">Onboard a new employee workstation. They can then log in with their Google SSO account using this email.</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              {showAddForm ? (
                <>
                  <X className="w-3.5 h-3.5 text-red-400" />
                  <span>Close Panel</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Onboard New Workstation</span>
                </>
              )}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleOnboardSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-800/60">
              <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Sterling"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">SSO Match Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. liam@deadlinex.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs pl-9 pr-3.5 py-2.5 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Workspace Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-red-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-red-500"
                >
                  <option value="active">Active</option>
                  <option value="overloaded">Overloaded</option>
                  <option value="crunching">Crunching</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:bg-slate-800 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Deploy</span>
                </button>
              </div>

              {error && (
                <div className="col-span-12 px-3 py-2 bg-red-950/20 text-red-400 border border-red-900/50 rounded-lg text-xs font-mono">
                  {error}
                </div>
              )}

              {success && (
                <div className="col-span-12 px-3 py-2 bg-emerald-950/20 text-emerald-400 border border-emerald-900/50 rounded-lg text-xs font-mono flex items-center gap-1.5 animate-pulse">
                  <Check className="w-4 h-4" />
                  <span>Workstation profile successfully provisioned and live!</span>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* Leaderboard Table Grid */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40 grid grid-cols-12 gap-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Workstation Name</div>
          <div className="col-span-2 text-center">Level / XP</div>
          <div className="col-span-2 text-center">Execution Coins</div>
          <div className="col-span-2 text-center">Completed</div>
          <div className="col-span-1 text-right">Accuracy</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-800/50">
          {sortedMembers.map((member, index) => {
            const isTop3 = index < 3;
            const isCurrentUser = member.id === currentUser?.id;

            return (
              <div 
                key={member.id} 
                className={`px-6 py-4 grid grid-cols-12 gap-4 items-center text-sm transition-colors ${
                  isCurrentUser 
                    ? "bg-red-500/5 border-l-2 border-red-500" 
                    : "hover:bg-slate-900/20"
                }`}
              >
                {/* Rank Indicator */}
                <div className="col-span-1 flex justify-center font-display">
                  {index === 0 ? (
                    <Crown className="w-5 h-5 text-amber-400 fill-amber-400/10" />
                  ) : index === 1 ? (
                    <Star className="w-4.5 h-4.5 text-slate-300 fill-slate-300/10" />
                  ) : index === 2 ? (
                    <Star className="w-4.5 h-4.5 text-amber-600 fill-amber-600/10" />
                  ) : (
                    <span className="font-mono text-slate-500 font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Profile detail */}
                <div className="col-span-4 flex items-center space-x-3 min-w-0">
                  <div className="relative">
                    <img 
                      src={member.avatar} 
                      alt={member.name} 
                      className="w-9 h-9 rounded-full object-cover border border-slate-700"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      member.status === 'offline' ? "bg-slate-500" : member.status === 'overloaded' ? "bg-red-500" : "bg-emerald-500"
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-200 truncate">{member.name}</span>
                      {isCurrentUser && (
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded uppercase font-bold font-mono">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`inline-block border px-1.5 py-0.2 rounded text-[9px] uppercase font-bold font-mono ${getStatusBadge(member.status)}`}>
                        {member.status}
                      </span>
                      <span className={`inline-block border px-1.5 py-0.2 rounded text-[9px] uppercase font-bold font-mono ${
                        member.role === "manager" 
                          ? "bg-red-500/10 text-red-400 border-red-500/20" 
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Level / XP */}
                <div className="col-span-2 text-center">
                  <div className="font-bold text-slate-200">LVL {member.level}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{member.xp} total XP</div>
                </div>

                {/* Coins */}
                <div className="col-span-2 text-center font-mono font-semibold text-amber-400 flex items-center justify-center space-x-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400/10" />
                  <span>{member.coins} coins</span>
                </div>

                {/* Completed Missions */}
                <div className="col-span-2 text-center text-slate-300 font-mono">
                  {member.completedMissions} missions
                </div>

                {/* Accuracy On-time rate */}
                <div className="col-span-1 text-right font-mono font-bold text-emerald-400">
                  {member.onTimeRate}%
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
