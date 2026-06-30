import React, { useEffect, useState } from "react";
import { 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Trophy,
  Zap
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from "recharts";
import { Mission, TeamMember, DailyBrief } from "../types";

interface DashboardProps {
  missions: Mission[];
  members: TeamMember[];
  brief: DailyBrief | null;
  loadingBrief: boolean;
  refreshState: () => void;
  triggerAIRescue: (missionId: string, rescueActionId: string) => void;
}

export default function Dashboard({ 
  missions, 
  members, 
  brief, 
  loadingBrief, 
  refreshState,
  triggerAIRescue
}: DashboardProps) {
  // Stats
  const activeMissions = missions.filter(m => m.status !== "completed");
  const completedCount = missions.filter(m => m.status === "completed").length;
  
  // Predict Risk count
  const criticalMissions = activeMissions.filter(m => m.riskScore >= 75);
  const mediumRiskMissions = activeMissions.filter(m => m.riskScore >= 40 && m.riskScore < 75);
  
  // Overloaded employees
  const overloadedMembers = members.filter(m => m.status === "overloaded" || m.status === "crunching");

  // Chart data: Timeline representation of workload and predicted completions
  const chartData = [
    { day: "Mon", workload: 65, completed: 40, risk: 20 },
    { day: "Tue", workload: 80, completed: 50, risk: 35 },
    { day: "Wed", workload: 95, completed: 60, risk: 48 }, // Peak risk (represented by today, Jun 30, 2026)
    { day: "Thu (Forecast)", workload: 60, completed: 78, risk: 25 },
    { day: "Fri (Forecast)", workload: 40, completed: 92, risk: 15 },
    { day: "Sat (Forecast)", workload: 25, completed: 98, risk: 8 }
  ];

  // Team capacity chart data
  const capacityData = members.map(m => {
    const assignedTasksCount = missions.filter(mis => mis.assignedTo === m.id && mis.status !== "completed").length;
    return {
      name: m.name.split(" ")[0],
      tasks: assignedTasksCount,
      rate: m.onTimeRate
    };
  });

  // Calculate 30-day velocity trend data dynamically merging baseline with active state
  const velocityData = React.useMemo(() => {
    const data = [];
    const today = new Date("2026-06-30"); // Align with current app context date
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Seeded baseline completions and velocity
      let baseCompletions = 0;
      let baseVelocity = 0;
      
      if (!isWeekend) {
        const dayNum = date.getDate();
        baseCompletions = Math.floor(((dayNum * 3) % 3) + 1); // 1 to 3 completions
        baseVelocity = parseFloat((((dayNum * 7) % 3) * 0.8 + 2.0).toFixed(1)); // 2.0 to 3.6 days cycle time
      } else {
        const dayNum = date.getDate();
        baseCompletions = (dayNum % 5 === 0) ? 1 : 0;
        baseVelocity = baseCompletions > 0 ? 3.8 : 0;
      }
      
      // Scan active state for real completions matching this historical date
      let realCompletions = 0;
      missions.forEach(m => {
        if (m.status === "completed") {
          const mDate = new Date(m.deadline);
          const isSameDay = mDate.getDate() === date.getDate() && mDate.getMonth() === date.getMonth();
          
          // Fallback future-deadline items to completed today
          const isToday = i === 0;
          const isFutureDeadline = mDate > today;
          
          if (isSameDay || (isToday && isFutureDeadline)) {
            realCompletions++;
          }
        }
      });

      const totalCompletions = baseCompletions + realCompletions;
      const finalVelocity = totalCompletions > 0 
        ? parseFloat(((baseVelocity * baseCompletions + (1.2 * realCompletions)) / totalCompletions).toFixed(1))
        : 1.5;

      data.push({
        date: dateStr,
        completions: totalCompletions,
        velocity: finalVelocity
      });
    }
    return data;
  }, [missions]);

  // Handle CTA trigger from briefing (e.g. resolve highest-risk mission with its first available rescue action)
  const [resolvingBrief, setResolvingBrief] = useState(false);
  const handleDeployBriefRescue = () => {
    const highestRisk = [...activeMissions].sort((a, b) => b.riskScore - a.riskScore)[0];
    if (highestRisk && highestRisk.rescueActions.length > 0) {
      const firstRescue = highestRisk.rescueActions.find(ra => !ra.applied);
      if (firstRescue) {
        setResolvingBrief(true);
        triggerAIRescue(highestRisk.id, firstRescue.id);
        setTimeout(() => {
          setResolvingBrief(false);
        }, 1500);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-radial from-slate-900/90 to-slate-950 p-8 rounded-none border border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden">
        {/* Decorative corner light effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-4 z-10">
          <div className="flex items-center space-x-2">
            <span className="bg-red-500/15 text-red-500 border border-red-500/30 text-[10px] px-2.5 py-1 rounded-none font-mono font-bold tracking-widest flex items-center gap-1.5 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              AI CHIEF OF STAFF // ACTIVE
            </span>
          </div>
          <div>
            <h1 className="text-5xl md:text-7xl xl:text-8xl font-black leading-[0.85] tracking-tighter text-white uppercase font-display select-none">
              CRITICAL<br />EXECUTION<br />WINDOW
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-wide uppercase max-w-xl">
            Welcome back, Chief. Execution OS has mapped all active sprint logs and calculated deadline probability indices for June 30, 2026.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0 z-10">
          <button 
            onClick={refreshState}
            className="px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider bg-red-500 text-slate-950 hover:bg-red-400 rounded-none transition-all duration-150 flex items-center gap-1.5 shadow-lg shadow-red-500/10"
          >
            <span>Recalculate Matrices</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Missions */}
        <div className="bg-slate-900/60 p-5 rounded-none border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Active Missions</span>
            <div className="text-4xl font-black text-white font-mono leading-none">{activeMissions.length}</div>
            <span className="text-[10px] text-slate-500 font-mono uppercase">Sprint Scope</span>
          </div>
          <div className="h-10 w-10 bg-slate-800 text-red-500 rounded-none flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Predicted Missed Deadlines */}
        <div className={`bg-slate-900/60 p-5 rounded-none border flex items-center justify-between transition-all ${
          criticalMissions.length > 0 ? "border-red-500/40 bg-gradient-to-br from-red-950/20 to-transparent" : "border-slate-800"
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Critical Risks</span>
            <div className="text-4xl font-black text-red-500 font-mono leading-none">{criticalMissions.length}</div>
            <span className="text-[10px] text-red-500 font-mono uppercase">Immediate Rescues</span>
          </div>
          <div className={`h-10 w-10 rounded-none flex items-center justify-center ${
            criticalMissions.length > 0 ? "bg-red-500/10 text-red-500" : "bg-slate-800 text-slate-400"
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Team Overloads */}
        <div className="bg-slate-900/60 p-5 rounded-none border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Team Overloads</span>
            <div className="text-4xl font-black text-amber-500 font-mono leading-none">{overloadedMembers.length}</div>
            <span className="text-[10px] text-slate-500 font-mono uppercase">Delegation Safety</span>
          </div>
          <div className="h-10 w-10 bg-slate-800 text-amber-500 rounded-none flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Accomplished Missions */}
        <div className="bg-slate-900/60 p-5 rounded-none border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">XP Claims</span>
            <div className="text-3xl font-black text-emerald-400 font-mono leading-none">+{completedCount * 300}</div>
            <span className="text-[10px] text-slate-500 font-mono uppercase">{completedCount} Archived</span>
          </div>
          <div className="h-10 w-10 bg-slate-800 text-emerald-400 rounded-none flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Daily CoS AI Briefing & Intervention Section */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 to-slate-950 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-bold font-display text-white">Daily CoS AI Briefing</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">June 30, 2026</span>
        </div>

        {loadingBrief ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Evaluating sprint vectors and loading team diaries...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                {brief?.summary}
              </p>
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest font-mono block mb-1">Recommended Execution Rescue</span>
                <p className="text-xs text-slate-300">{brief?.recommendedAction}</p>
              </div>
            </div>
            
            <div className="lg:col-span-1 border-l-0 lg:border-l border-slate-800 pl-0 lg:pl-6 flex flex-col justify-center h-full">
              {criticalMissions.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block font-mono">Immediate Danger Index</span>
                    <span className="text-2xl font-extrabold text-red-500 font-display">88% Risk</span>
                  </div>
                  <button 
                    id="deploy-briefing-intervention"
                    disabled={resolvingBrief}
                    onClick={handleDeployBriefRescue}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-red-500/10 flex items-center justify-center space-x-1.5 transition-all duration-200"
                  >
                    {resolvingBrief ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        <span>Deploying Rescue Matrices...</span>
                      </>
                    ) : (
                      <>
                        <span>Deploy CoS Intervention</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-semibold">No critical overloads detected!</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Missions operating in normal limits.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Middle Bento Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Timeline and Workload */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-display">Workload & Completion Forecasting</h4>
              <p className="text-[11px] text-slate-400">Predicted velocity changes over active project sprints.</p>
            </div>
            <div className="flex items-center space-x-4 text-[10px] font-mono">
              <span className="flex items-center text-red-400">
                <span className="w-2.5 h-2.5 rounded bg-red-500/80 mr-1 block" /> Workload Index
              </span>
              <span className="flex items-center text-emerald-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/80 mr-1 block" /> Completed Sprints
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWorkload" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: "monospace" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 10, color: "#f1f5f9" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="workload" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorWorkload)" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capacity Overloads and On-Time Rates */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 lg:col-span-1 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-100 font-display">On-Time Accuracy Rate %</h4>
            <p className="text-[11px] text-slate-400">Team execution historical accuracy ratings.</p>
          </div>

          <div className="h-64 flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={capacityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 10, color: "#f1f5f9" }}
                />
                <Bar dataKey="rate" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>

            {/* Quick capacity list */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-mono text-[10px] text-slate-500 uppercase tracking-wider pb-1">
                <span>Member</span>
                <span>Active load</span>
                <span>Accuracy</span>
              </div>
              {members.slice(1, 4).map(m => (
                <div key={m.id} className="flex justify-between items-center py-0.5 border-t border-slate-800/50">
                  <span className="text-slate-300 font-semibold">{m.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                    m.status === 'overloaded' ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {m.status}
                  </span>
                  <span className="font-mono text-slate-400">{m.onTimeRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Full-width Row: Mission Velocity Chart */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-100 font-display flex items-center gap-1.5">
              <Zap className="font-bold w-4 h-4 text-amber-400" />
              <span>Mission Velocity & Burn-Up Trend (30 Days)</span>
            </h4>
            <p className="text-[11px] text-slate-400">Team execution metrics and average cycle time to complete assigned objectives.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-widest">Avg Speed</span>
              <span className="text-xs font-black text-white font-mono">
                {(velocityData.reduce((acc, d) => acc + d.velocity, 0) / 30).toFixed(1)} days/mission
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-widest">Completions</span>
              <span className="text-xs font-black text-emerald-400 font-mono">
                {velocityData.reduce((acc, d) => acc + d.completions, 0)} units
              </span>
            </div>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompletions30" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
              <YAxis yAxisId="left" stroke="#10b981" style={{ fontSize: 9, fontFamily: "monospace" }} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" style={{ fontSize: 9, fontFamily: "monospace" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 10, color: "#f1f5f9" }}
                labelStyle={{ fontWeight: "bold", fontFamily: "monospace", fontSize: 11 }}
              />
              <Area yAxisId="left" type="monotone" name="Missions Completed" dataKey="completions" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompletions30)" />
              <Area yAxisId="right" type="monotone" name="Velocity (Days)" dataKey="velocity" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVelocity)" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
