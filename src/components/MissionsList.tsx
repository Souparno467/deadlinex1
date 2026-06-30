import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Calendar, 
  User, 
  Tag, 
  CheckSquare, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Loader2, 
  ChevronRight,
  ChevronDown,
  X,
  Target,
  Save,
  FileText,
  Trash2,
  Download
} from "lucide-react";
import { Mission, TeamMember, RescueAction, MissionTemplate, PriorityLevel, ActivityLog } from "../types";

interface MissionsListProps {
  missions: Mission[];
  members: TeamMember[];
  currentUser: TeamMember;
  createMission: (formData: any) => Promise<void>;
  updateMission: (missionId: string, updates: any) => Promise<void>;
  triggerAIRescue: (missionId: string, rescueActionId: string) => Promise<void>;
  selectedMissionId?: string | null;
  setSelectedMissionId?: React.Dispatch<React.SetStateAction<string | null>>;
  activities?: ActivityLog[];
}

const PRESET_TEMPLATES: MissionTemplate[] = [
  {
    id: "tpl-deployment",
    name: "🚀 Beta Launch",
    title: "Launch Beta Version to Production",
    description: "Prepare and execute deployment of the product beta. Ensure CI/CD tests pass and primary CDN routes are verified.",
    priority: "critical",
    etc: "6",
    tags: ["DevOps", "Launch", "Beta"],
    subtasks: [
      "Build script verification",
      "CDN routing check",
      "Post-deploy database migrations"
    ]
  },
  {
    id: "tpl-audit",
    name: "📊 Financial Audit",
    title: "Finalize Financial Q2 Audit Reports",
    description: "Compile Q2 spreadsheets, expense summaries, and compliance filings for the executive review.",
    priority: "high",
    etc: "12",
    tags: ["Finance", "Audit", "Compliance"],
    subtasks: [
      "Verify transaction ledger totals",
      "Format compliance templates",
      "Compile final signatory packages"
    ]
  },
  {
    id: "tpl-oauth",
    name: "🔑 OAuth API",
    title: "Implement OAuth Calendar Sync",
    description: "Integrate Outlook and Google calendar endpoints. Sync missions directly to target schedules.",
    priority: "medium",
    etc: "16",
    tags: ["Integrations", "API", "Auth"],
    subtasks: [
      "Setup Developer console keys",
      "Implement token refresh flow",
      "Map event schema mapping"
    ]
  }
];

export default function MissionsList({ 
  missions, 
  members, 
  currentUser, 
  createMission, 
  updateMission, 
  triggerAIRescue,
  selectedMissionId,
  setSelectedMissionId,
  activities = []
}: MissionsListProps) {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showOnlyMyMissions, setShowOnlyMyMissions] = useState<boolean>(currentUser.role === "employee");
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>("mis-1"); // Default expand first item

  // Keep filter in sync if user role switches
  useEffect(() => {
    setShowOnlyMyMissions(currentUser.role === "employee");
  }, [currentUser.role]);

  // Synchronize external selection with internal expanded state
  useEffect(() => {
    if (selectedMissionId) {
      setExpandedMissionId(selectedMissionId);
    }
  }, [selectedMissionId]);
  
  // Create Mission Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingMission, setSubmittingMission] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("2026-07-02T17:00");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newTags, setNewTags] = useState("");
  const [newSubtasks, setNewSubtasks] = useState("");
  const [newEtc, setNewEtc] = useState("");
  const [aiPlanning, setAiPlanning] = useState(true); // AI helper toggle

  // Set default assignee to first available employee
  useEffect(() => {
    const firstEmployee = members.find(m => m.role === "employee");
    if (firstEmployee) {
      setNewAssignee(firstEmployee.id);
    }
  }, [members]);

  // Templates Management States
  const [templates, setTemplates] = useState<MissionTemplate[]>(() => {
    const saved = localStorage.getItem("mission-templates");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved templates:", e);
      }
    }
    return PRESET_TEMPLATES;
  });
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLoadTemplate = (tpl: MissionTemplate) => {
    setNewTitle(tpl.title);
    setNewDescription(tpl.description);
    setNewPriority(tpl.priority);
    setNewEtc(tpl.etc);
    setNewTags(tpl.tags.join(", "));
    setNewSubtasks(tpl.subtasks.join("\n"));
    
    setToastMessage(`Loaded: "${tpl.name}"`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering loading the template
    const updated = templates.filter(tpl => tpl.id !== id);
    setTemplates(updated);
    localStorage.setItem("mission-templates", JSON.stringify(updated));
    setToastMessage("Template deleted");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadReport = (format: "txt" | "json", mission: Mission) => {
    let content = "";
    let filename = `mission_report_${mission.id}`;
    let mimeType = "";

    const assignee = members.find(mem => mem.id === mission.assignedTo);
    const missionActivities = activities ? activities.filter(log => {
      return log.action.toLowerCase().includes(mission.title.toLowerCase());
    }) : [];

    if (format === "txt") {
      mimeType = "text/plain;charset=utf-8";
      filename += ".txt";
      
      const completedCount = mission.subtasks.filter(s => s.completed).length;
      const progressPct = mission.subtasks.length > 0 
        ? Math.round((completedCount / mission.subtasks.length) * 100) 
        : mission.status === 'completed' ? 100 : 0;

      content = `============================================================
MISSION OPERATIONS REPORT: ${mission.title.toUpperCase()}
============================================================
Generated: ${new Date().toLocaleString()}
Mission ID: ${mission.id}

1. CORE METRICS
------------------------------------------------------------
Title: ${mission.title}
Description: ${mission.description}
Operational Status: ${mission.status.toUpperCase()}
Priority Level: ${mission.priority.toUpperCase()}
Timeline / Deadline: ${new Date(mission.deadline).toLocaleString()}
Estimated Time to Complete (ETC): ${mission.etc !== undefined ? mission.etc + ' hours' : 'Not specified'}
Assigned To: ${assignee ? assignee.name : 'Unassigned'}
Assigned By: ${mission.assignedByName}
Rewards: ${mission.xpReward} XP, ${mission.coinReward} Coins
Progress: ${completedCount}/${mission.subtasks.length} (${progressPct}%)

2. COGNITIVE RISK ANALYSIS
------------------------------------------------------------
Risk Score: ${mission.riskScore}%
Risk Level: ${mission.riskLevel.toUpperCase()}
AI Risk Assessment: ${mission.riskExplanation}

3. MISSION CHECKLIST & PROGRESS
------------------------------------------------------------
Subtask Checklist:
${mission.subtasks.length === 0 
  ? "No subtasks established." 
  : mission.subtasks.map((st, idx) => `  [${st.completed ? 'X' : ' '}] ${idx + 1}. ${st.title} (${st.completed ? 'Completed' : 'Pending'})`).join("\n")
}

4. DEPLOYED RESCUE ACTIONS
------------------------------------------------------------
${mission.rescueActions.length === 0 
  ? "No rescue actions available or deployed." 
  : mission.rescueActions.map(ra => `  - ${ra.title}: ${ra.description} [${ra.applied ? 'DEPLOYED' : 'RECOMMENDED'}] (Cost: ${ra.coinCost} Coins, Penalty: ${ra.xpPenalty} XP)`).join("\n")
}

5. SYSTEM ACTIVITY LOGS
------------------------------------------------------------
${missionActivities.length === 0 
  ? "No logged activity for this mission." 
  : missionActivities.map(log => `  [${new Date(log.timestamp).toLocaleString()}] ${log.memberName}: ${log.action}`).join("\n")
}
`;
    } else {
      mimeType = "application/json;charset=utf-8";
      filename += ".json";
      
      const reportData = {
        reportType: "Mission Operations Report",
        generatedAt: new Date().toISOString(),
        mission: {
          id: mission.id,
          title: mission.title,
          description: mission.description,
          status: mission.status,
          priority: mission.priority,
          deadline: mission.deadline,
          assignedTo: assignee ? assignee.name : 'Unassigned',
          assignedByName: mission.assignedByName,
          xpReward: mission.xpReward,
          coinReward: mission.coinReward,
          riskScore: mission.riskScore,
          riskLevel: mission.riskLevel,
          riskExplanation: mission.riskExplanation,
          etc: mission.etc,
          subtasks: mission.subtasks,
          rescueActions: mission.rescueActions
        },
        activityLogs: missionActivities
      };
      content = JSON.stringify(reportData, null, 2);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logic
  const filteredMissions = missions.filter(m => {
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || m.priority === priorityFilter;
    const matchesMyMissions = !showOnlyMyMissions || m.assignedTo === currentUser.id;
    return matchesStatus && matchesPriority && matchesMyMissions;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-500/15 text-red-400 border-red-500/25";
      case "high": return "bg-orange-500/15 text-orange-400 border-orange-500/25";
      case "medium": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/25";
      default: return "bg-blue-500/15 text-blue-400 border-blue-500/25";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return "text-red-500 bg-red-500/10 border-red-500/20";
    if (score >= 40) return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  };

  const handleCreateMissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmittingMission(true);
    
    // Parse tags and subtasks
    const tagsArr = newTags.split(",").map(t => t.trim()).filter(Boolean);
    const subtasksArr = newSubtasks.split("\n").map(s => s.trim()).filter(Boolean);

    await createMission({
      title: newTitle,
      description: newDescription,
      deadline: new Date(newDeadline).toISOString(),
      assignedTo: newAssignee,
      priority: newPriority,
      tags: tagsArr,
      subtasks: subtasksArr,
      etc: newEtc ? Number(newEtc) : undefined,
      useAiPlanning: aiPlanning
    });

    // Save as Template if checked
    if (saveAsTemplate) {
      const finalTemplateName = templateName.trim() || `${newTitle.trim()} Template`;
      const newTpl: MissionTemplate = {
        id: `tpl-${Date.now()}`,
        name: finalTemplateName,
        title: newTitle,
        description: newDescription,
        priority: newPriority as PriorityLevel,
        etc: newEtc,
        tags: tagsArr,
        subtasks: subtasksArr
      };
      
      const updatedTemplates = [...templates, newTpl];
      setTemplates(updatedTemplates);
      localStorage.setItem("mission-templates", JSON.stringify(updatedTemplates));
    }

    // Reset Form
    setNewTitle("");
    setNewDescription("");
    setNewDeadline("2026-07-02T17:00");
    setNewPriority("medium");
    setNewTags("");
    setNewSubtasks("");
    setNewEtc("");
    setSaveAsTemplate(false);
    setTemplateName("");
    setIsModalOpen(false);
    setSubmittingMission(false);
  };

  const handleSubtaskToggle = async (mission: Mission, subtaskId: string, currentCompleted: boolean) => {
    const updatedSubtasks = mission.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !currentCompleted } : st
    );

    // If all subtasks are completed, change overall mission status to 'completed'
    const allDone = updatedSubtasks.every(st => st.completed);
    const updatedStatus = allDone ? "completed" : mission.status === "completed" ? "in_progress" : mission.status;

    await updateMission(mission.id, {
      subtasks: updatedSubtasks,
      status: updatedStatus
    });
  };

  const handleStatusChange = async (missionId: string, status: string) => {
    await updateMission(missionId, { status });
  };

  // Helper to calculate relative time difference from June 30, 2026
  const getRelativeTime = (isoString: string) => {
    const now = new Date("2026-06-30T06:23:57").getTime();
    const target = new Date(isoString).getTime();
    const diff = target - now;

    const absoluteHours = Math.abs(diff) / (1000 * 3600);
    if (diff < 0) {
      if (absoluteHours < 24) {
        return `Lapsed by ${Math.round(absoluteHours)} hours ago`;
      }
      return `Lapsed by ${Math.round(absoluteHours / 24)} days ago`;
    } else {
      if (absoluteHours < 24) {
        return `Due in ${Math.round(absoluteHours)} hours`;
      }
      return `Due in ${Math.round(absoluteHours / 24)} days`;
    }
  };

  const [applyingRescueId, setApplyingRescueId] = useState<string | null>(null);
  const handleDeployRescueAction = async (missionId: string, action: RescueAction) => {
    setApplyingRescueId(action.id);
    try {
      await triggerAIRescue(missionId, action.id);
    } catch (err: any) {
      alert(err.message || "Failed to deploy rescue action.");
    } finally {
      setApplyingRescueId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Create Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Status Filters */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            {["all", "pending", "in_progress", "completed"].map(status => (
              <button
                key={status}
                id={`filter-status-${status}`}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all uppercase tracking-wide ${
                  statusFilter === status 
                    ? "bg-red-500 text-white" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Priority Filters */}
          <select
            id="filter-priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-red-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Show Only My Missions Toggle */}
          <button
            id="toggle-my-missions"
            onClick={() => setShowOnlyMyMissions(!showOnlyMyMissions)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              showOnlyMyMissions 
                ? "bg-red-950/20 text-red-400 border-red-500/30" 
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Only My Missions</span>
          </button>
        </div>

        {currentUser.role === "manager" && (
          <button
            id="open-create-mission-btn"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Assign New Mission</span>
          </button>
        )}
      </div>

      {/* Missions Grid/List */}
      <div className="space-y-4">
        {filteredMissions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-850">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-slate-400 font-display">No missions found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting the status or priority filters.</p>
          </div>
        ) : (
          filteredMissions.map(m => {
            const assignee = members.find(mem => mem.id === m.assignedTo);
            const isExpanded = expandedMissionId === m.id;
            const completedSubtasks = m.subtasks.filter(s => s.completed).length;
            const progressPct = m.subtasks.length > 0 
              ? Math.round((completedSubtasks / m.subtasks.length) * 100) 
              : m.status === 'completed' ? 100 : 0;

            return (
              <motion.div 
                key={m.id} 
                layout="position"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className={`bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-slate-700/80 overflow-hidden shadow-md transition-all duration-300 relative ${
                  m.priority === 'critical' && m.status !== 'completed' ? "shadow-md shadow-red-500/5 border-red-950/40" : ""
                }`}
              >
                {/* Visual sliding completion banner overlay */}
                <AnimatePresence>
                  {m.status === 'completed' && (
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "0%" }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", stiffness: 100, damping: 15 }}
                      className="absolute inset-y-0 left-0 right-0 bg-emerald-950/15 border-l-4 border-emerald-500 pointer-events-none flex items-center justify-end pr-6 z-10"
                    >
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="bg-emerald-500 text-slate-950 text-[10px] font-black tracking-widest font-mono uppercase py-1 px-2.5 rounded shadow-lg shadow-emerald-500/20"
                      >
                        MISSION ACCOMPLISHED
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mission Header Card */}
                <div 
                  className="p-5 flex items-start justify-between gap-4 cursor-pointer relative z-2"
                  onClick={() => {
                    const nextId = isExpanded ? null : m.id;
                    setExpandedMissionId(nextId);
                    if (setSelectedMissionId) {
                      setSelectedMissionId(nextId);
                    }
                  }}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-widest border font-mono ${getPriorityBadge(m.priority)}`}>
                        {m.priority}
                      </span>
                      {m.etc !== undefined && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-widest font-mono flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          ETC: {m.etc}h
                        </span>
                      )}
                      {m.activeCrunchMode && (
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-widest font-mono flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 fill-purple-400" />
                          Crunching
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {getRelativeTime(m.deadline)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold font-display text-white truncate">{m.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{m.description}</p>

                    {/* Progress details & mini bar */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5">
                          <img 
                            src={assignee?.avatar} 
                            alt={assignee?.name} 
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="text-xs text-slate-300 font-semibold">{assignee?.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-mono text-slate-400">
                            Progress: {completedSubtasks}/{m.subtasks.length} ({progressPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Animated sliding progress bar */}
                      {m.subtasks.length > 0 && (
                        <div className="w-full bg-slate-950/80 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            className={`h-full rounded-full ${m.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ type: "spring", stiffness: 80, damping: 15 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side Info: Risk Gauge & Toggle Icon */}
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-center ${getRiskColor(m.riskScore)}`}>
                      <span className="text-[9px] font-mono font-bold tracking-wider uppercase opacity-80">Risk Score</span>
                      <span className="text-lg font-extrabold font-display leading-none mt-0.5">{m.riskScore}%</span>
                    </div>
                    <div>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Section Details Accordion Animation */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-slate-800 bg-slate-950/30 grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5 relative z-2">
                        
                        {/* Column 1: Task Checklist & State Management */}
                        <div className="lg:col-span-1 space-y-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Mission Checklist</span>
                            {m.subtasks.length === 0 ? (
                              <p className="text-xs text-slate-500 italic mt-1">No checklist subtasks established for this mission.</p>
                            ) : (
                              <div className="space-y-2 mt-2">
                                {m.subtasks.map(st => (
                                  <label 
                                    key={st.id} 
                                    className="flex items-center space-x-2.5 p-2 bg-slate-900/40 hover:bg-slate-900/80 rounded-lg border border-slate-850 cursor-pointer"
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() => handleSubtaskToggle(m, st.id, st.completed)}
                                      className="rounded border-slate-700 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 w-4 h-4"
                                    />
                                    <span className="relative text-xs flex-1 block">
                                      <span className={`transition-all duration-150 ${st.completed ? "text-slate-500" : "text-slate-300"}`}>
                                        {st.title}
                                      </span>
                                      {st.completed && (
                                        <motion.span 
                                          className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-slate-500/60"
                                          initial={{ scaleX: 0, originX: 0 }}
                                          animate={{ scaleX: 1 }}
                                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                        />
                                      )}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status Manual Toggle (Manager view or general) */}
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono block mb-2">Operation Status</span>
                            <select
                              value={m.status}
                              onChange={(e) => handleStatusChange(m.id, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="abandoned">Abandoned</option>
                            </select>
                          </div>
                        </div>

                        {/* Column 2: AI CoS Analysis */}
                        <div className="lg:col-span-1 space-y-4">
                          <div>
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <Sparkles className="w-4 h-4 text-red-400" />
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">CoS AI Risk Assessment</span>
                            </div>
                            {(() => {
                              const remainingHours = (new Date(m.deadline).getTime() - new Date("2026-06-30T06:23:57").getTime()) / (1000 * 3600);
                              return (
                                <div className="space-y-3">
                                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-850 text-xs text-slate-300 leading-relaxed space-y-2">
                                    <p>{m.riskExplanation}</p>
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {m.tags.map((tag, i) => (
                                        <span key={i} className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {m.etc !== undefined && (
                                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 text-xs text-slate-300 space-y-2 font-mono">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                                        <span>Time Analysis Matrix</span>
                                        <span className="text-[9px] text-slate-500 lowercase">(etc vs availability)</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Estimated Work (ETC):</span>
                                        <span className="text-amber-400 font-bold">{m.etc} hours</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Calendar Window:</span>
                                        <span className={`font-bold ${remainingHours < m.etc ? 'text-red-400' : 'text-emerald-400'}`}>
                                          {remainingHours.toFixed(1)} hours
                                        </span>
                                      </div>
                                      <div className="border-t border-slate-800/80 pt-1.5 flex justify-between items-center text-xs">
                                        <span className="text-slate-400">Workstation Buffer:</span>
                                        <span className={`font-black ${(remainingHours - m.etc) < 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                                          {(remainingHours - m.etc).toFixed(1)} hours
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Column 3: Deployed Last-Minute Rescues */}
                        <div className="lg:col-span-1 space-y-3">
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono block">Deploy Last-Minute Rescue Actions</span>
                          
                          {m.rescueActions.length === 0 ? (
                            <div className="p-4 bg-slate-900/20 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 italic">
                              No optimal rescues formulated. Ensure deadline parameters are current.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {m.rescueActions.map(ra => {
                                const isAffordable = currentUser.coins >= ra.coinCost;
                                const isApplied = ra.applied;

                                return (
                                  <div 
                                    key={ra.id} 
                                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                                      isApplied 
                                        ? "bg-emerald-950/10 border-emerald-900/30 opacity-70" 
                                        : "bg-slate-900/50 border-slate-800 hover:border-slate-750"
                                    }`}
                                  >
                                    <div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-200">{ra.title}</span>
                                        {isApplied && (
                                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-bold font-mono">
                                            DEPLOYED
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-0.5">{ra.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-800/40 pt-2 mt-1">
                                      <div className="flex items-center space-x-2 text-[10px] font-mono">
                                        {ra.coinCost > 0 && (
                                          <span className="text-amber-400 flex items-center gap-0.5">
                                            <Zap className="w-3.5 h-3.5 fill-amber-400/10" />
                                            {ra.coinCost} coins
                                          </span>
                                        )}
                                        {ra.xpPenalty > 0 && (
                                          <span className="text-red-400 font-semibold">
                                            -{ra.xpPenalty} XP
                                          </span>
                                        )}
                                      </div>

                                      {!isApplied && (
                                        <button
                                          disabled={!isAffordable || applyingRescueId !== null}
                                          onClick={() => handleDeployRescueAction(m.id, ra)}
                                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center space-x-1 transition-all ${
                                            isAffordable 
                                              ? "bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent" 
                                              : "bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed"
                                          }`}
                                        >
                                          {applyingRescueId === ra.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <span>Deploy</span>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Export & Utility Actions Bar */}
                        <div className="col-span-1 lg:col-span-3 border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/20 p-3.5 rounded-xl border border-slate-900">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <Download className="w-3.5 h-3.5 text-red-500" />
                              Mission Report Exporter
                            </span>
                            <p className="text-[11px] text-slate-500 font-medium">Download high-fidelity status audits, risk analysis spreadsheets, and activity log reports.</p>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleDownloadReport("txt", m)}
                              className="flex-1 sm:flex-none px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-750 text-[10px] font-bold font-mono uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                            >
                              <Download className="w-3.5 h-3.5 text-red-500" />
                              TXT Format
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadReport("json", m)}
                              className="flex-1 sm:flex-none px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-750 text-[10px] font-bold font-mono uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                            >
                              <Download className="w-3.5 h-3.5 text-red-500" />
                              JSON Format
                            </button>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* CREATE MISSION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-red-950/15 to-transparent">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold font-display text-white">Create Mission Order</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateMissionSubmit} className="p-5 space-y-4">
              
              {/* Recurring Templates Quick Selector */}
              <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    Load Recurring Structure
                  </span>
                  {toastMessage && (
                    <span className="text-[10px] font-mono font-bold text-amber-400 animate-pulse">
                      {toastMessage}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {templates.map(tpl => {
                    const isCustom = !["tpl-deployment", "tpl-audit", "tpl-oauth"].includes(tpl.id);
                    return (
                      <div 
                        key={tpl.id}
                        onClick={() => handleLoadTemplate(tpl)}
                        className="group flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-all select-none"
                      >
                        <span>{tpl.name}</span>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                            className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-all ml-0.5 opacity-0 group-hover:opacity-100"
                            title="Delete custom template"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Mission Title</label>
                  <input 
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="E.g., Launch Beta Version to Production"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Strategic Goals & Description</label>
                  <textarea 
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Outline specific objectives for delivery context..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Target Deadline</label>
                  <input 
                    type="datetime-local"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Assigned Workstation</label>
                  <select 
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-red-500"
                  >
                    {members.filter(m => m.role === "employee").map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.onTimeRate}% accuracy)</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Strategic Priority</label>
                  <select 
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-red-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Estimated Duration (ETC in Hours)</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="E.g. 12"
                    value={newEtc}
                    onChange={(e) => setNewEtc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Tags (Comma separated)</label>
                  <input 
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="DevOps, Launch, Beta"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Subtasks (One per line)</label>
                  <textarea 
                    value={newSubtasks}
                    onChange={(e) => setNewSubtasks(e.target.value)}
                    placeholder="Check point 1&#10;Check point 2"
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* AI helper checkbox */}
              <div className="flex items-center justify-between p-3 bg-red-950/10 border border-red-900/20 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-red-400 animate-pulse" />
                  <div>
                    <span className="text-xs font-bold text-slate-200">Inject CoS AI Planning</span>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">Calculates risk metrics and prescribes optimal rescues instantly.</p>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={aiPlanning}
                  onChange={() => setAiPlanning(!aiPlanning)}
                  className="rounded border-slate-700 bg-slate-950 text-red-500 focus:ring-red-500 w-4.5 h-4.5"
                />
              </div>

              {/* Save as Template checkbox */}
              <div className="p-3 bg-slate-950/30 border border-slate-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-200">Save as Recurring Template</span>
                      <p className="text-[10px] text-slate-400 leading-none mt-0.5">Saves this configuration to launch instantly in future runs.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={() => setSaveAsTemplate(!saveAsTemplate)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 w-4.5 h-4.5 cursor-pointer"
                  />
                </div>

                <AnimatePresence>
                  {saveAsTemplate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2.5 border-t border-slate-800/50">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Custom Template Identifier / Name</label>
                        <input 
                          type="text"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="E.g., Production Deploy Runbook"
                          className="w-full bg-slate-950 border border-slate-850 text-slate-100 text-[11px] px-3 py-1.5 rounded-md focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700/60 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMission}
                  className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-lg flex items-center gap-1 shadow-lg shadow-red-500/10"
                >
                  {submittingMission ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Planning Matrix...</span>
                    </>
                  ) : (
                    <>
                      <span>Assign Mission</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
