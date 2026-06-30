import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import MissionsList from "./components/MissionsList";
import CalendarView from "./components/CalendarView";
import Leaderboard from "./components/Leaderboard";
import RewardsStore from "./components/RewardsStore";
import ChiefOfStaffChat from "./components/ChiefOfStaffChat";
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  syncGoogleCalendarWithBackend,
  handleAuthRedirect,
  getFriendlyAuthError,
  consumeSsoRole,
} from "./lib/googleCalendar";

import { 
  Mission, 
  TeamMember, 
  Reward, 
  ActivityLog, 
  CalendarEvent, 
  DailyBrief 
} from "./types";
import { 
  Bell, 
  Sparkles, 
  Zap, 
  Bot, 
  History, 
  Compass,
  Mic,
  MessageSquare,
  AlertCircle,
  Brain,
  Sun,
  Moon,
  Search,
  X,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import FocusModeView from "./components/FocusModeView";

export default function App() {
  // Global States loaded from REST backend
  const [missions, setMissions] = useState<Mission[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null);

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingBrief, setLoadingBrief] = useState<boolean>(false);
  
  // Sidebar expand state for CoS chat companion
  const [isCoSOpen, setIsCoSOpen] = useState<boolean>(true);

  // Demo mode — bypass Google SSO and use built-in manager profile (mem-1)
  const [useDemoMode, setUseDemoMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("deadlinex-demo-mode") === "true";
    }
    return false;
  });

  // Groq AI connection status
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);

  // Focus Mode State
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Global search state
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  // Google Calendar Integration states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleSyncing, setGoogleSyncing] = useState<boolean>(false);
  const [googleLastSynced, setGoogleLastSynced] = useState<Date | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [authBootstrapping, setAuthBootstrapping] = useState<boolean>(true);
  const [ssoRole, setSsoRole] = useState<"manager" | "employee">("employee");
  const bootstrappedUidRef = React.useRef<string | null>(null);

  const runCalendarSync = async (token: string | null) => {
    if (!token) return;
    try {
      setGoogleSyncing(true);
      await syncGoogleCalendarWithBackend(token);
      setGoogleLastSynced(new Date());
      fetchState();
    } catch (e) {
      console.error("Google Calendar sync failed:", e);
    } finally {
      setGoogleSyncing(false);
    }
  };

  // Auto-onboard Google SSO accounts to team database
  const checkAndRegisterSsoUser = async (user: any, roleToRegister: string = "employee") => {
    if (!user || !user.email) return;
    try {
      const emailLower = user.email.toLowerCase();
      const sRes = await fetch("/api/state");
      if (!sRes.ok) return;
      const data = await sRes.json();
      if (data && data.members) {
        const exists = data.members.some((m: any) => m.email?.toLowerCase() === emailLower);
        if (!exists) {
          console.log("Auto-onboarding Google SSO account:", user.email);
          const postRes = await fetch("/api/members", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: user.displayName || user.email.split("@")[0],
              email: user.email,
              role: roleToRegister,
              avatar: user.photoURL || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`,
              status: "active"
            })
          });
          if (postRes.ok) {
            const created = await postRes.json();
            if (created.members) {
              setMembers(created.members);
              return;
            }
          }
        }
        setMembers(data.members);
      }
    } catch (e) {
      console.error("Failed to check/register SSO user:", e);
    }
  };

  const bootstrapAuthenticatedUser = (
    user: any,
    token: string | null,
    role: string = "employee"
  ) => {
    if (bootstrappedUidRef.current === user.uid) return;
    setSsoError(null);
    setSsoRole(role === "manager" ? "manager" : "employee");
    bootstrappedUidRef.current = user.uid;
    setGoogleUser(user);
    setGoogleToken(token);
    setAuthBootstrapping(false);

    void (async () => {
      await checkAndRegisterSsoUser(user, role);
      await fetchState();
      void runCalendarSync(token);
    })();
  };

  // Initialize Google Auth listener on mount — subscribe immediately; never block on redirect/API
  useEffect(() => {
    let cancelled = false;

    const finishAuthBootstrap = () => {
      if (!cancelled) setAuthBootstrapping(false);
    };

    const safetyTimeout = window.setTimeout(finishAuthBootstrap, 4000);

    const unsubscribe = initAuth(
      (user, token) => {
        window.clearTimeout(safetyTimeout);
        bootstrapAuthenticatedUser(user, token, consumeSsoRole());
      },
      () => {
        window.clearTimeout(safetyTimeout);
        setGoogleUser(null);
        setGoogleToken(null);
        finishAuthBootstrap();
      }
    );

    void (async () => {
      try {
        const redirectResult = await handleAuthRedirect();
        if (cancelled || !redirectResult) return;
        bootstrapAuthenticatedUser(
          redirectResult.user,
          redirectResult.accessToken,
          redirectResult.role
        );
      } catch (err) {
        if (!cancelled) {
          setSsoError(getFriendlyAuthError(err));
          finishAuthBootstrap();
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  // Background Sync Service: automatically fetches every 15 minutes
  useEffect(() => {
    if (!googleToken) return;

    const intervalId = setInterval(async () => {
      try {
        console.log("Running background Google Calendar sync (15 min interval)...");
        setGoogleSyncing(true);
        await syncGoogleCalendarWithBackend(googleToken);
        setGoogleLastSynced(new Date());
        fetchState();
      } catch (err) {
        console.error("Background Google Calendar sync failed:", err);
      } finally {
        setGoogleSyncing(false);
      }
    }, 15 * 60 * 1000); // 15 minutes in milliseconds

    return () => clearInterval(intervalId);
  }, [googleToken]);

  const handleGoogleLogin = async (role: string = "employee") => {
    try {
      setSsoError(null);
      const res = await googleSignIn(role);
      if (!res) return;
      localStorage.removeItem("deadlinex-demo-mode");
      setUseDemoMode(false);
      bootstrapAuthenticatedUser(res.user, res.accessToken, role);
    } catch (err) {
      console.error("Google login failed:", err);
      setSsoError(getFriendlyAuthError(err));
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setGoogleLastSynced(null);
      fetchState();
    } catch (err) {
      console.error("Google logout failed:", err);
    }
  };

  const handleGoogleSyncNow = async () => {
    if (!googleToken) return;
    try {
      setGoogleSyncing(true);
      await syncGoogleCalendarWithBackend(googleToken);
      setGoogleLastSynced(new Date());
      fetchState();
    } catch (err) {
      console.error("Google manual sync failed:", err);
    } finally {
      setGoogleSyncing(false);
    }
  };

  // Theme State
  const [theme, setTheme] = useState<"midnight" | "light">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("workspace-theme");
      if (stored === "light") return "light";
    }
    return "midnight";
  });

  // Sync theme with localStorage
  useEffect(() => {
    localStorage.setItem("workspace-theme", theme);
  }, [theme]);

  // Connection / Synchronization States
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const fetchWithTimeout = async (url: string, options?: RequestInit, timeout = 5000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(id);
          return response;
        } catch (error) {
          clearTimeout(id);
          throw error;
        }
      };

      const resState = await fetchWithTimeout("/api/state");
      if (!resState.ok) throw new Error("State server response error");
      const dataState = await resState.ok ? await resState.json() : null;
      if (dataState) {
        setMissions(dataState.missions);
        setMembers(dataState.members);
        setRewards(dataState.rewards);
        setActivities(dataState.activities);
        setCalendar(dataState.calendar);
      }

      setLoadingBrief(true);
      try {
        const resBrief = await fetchWithTimeout("/api/ai/brief", {}, 5000);
        if (resBrief.ok) {
          const dataBrief = await resBrief.json();
          if (dataBrief) setDailyBrief(dataBrief);
        }
      } catch (briefError) {
        console.warn("Brief API offline or timed out:", briefError);
      } finally {
        setLoadingBrief(false);
      }

      setIsConnected(true);
      setLastSyncedAt(new Date());
      
      setActiveToast({
        id: "sync-success",
        title: "🔄 DATA RE-SYNCHRONIZED",
        body: "Successfully retrieved up-to-date metrics from the Execution server."
      });
    } catch (err) {
      console.error("Sync failed:", err);
      setIsConnected(false);
      setActiveToast({
        id: "sync-fail",
        title: "⚠️ CONNECTION FAILURE",
        body: "Unable to establish communication with the Execution server. Offline fallback active."
      });
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  // Monitor network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      handleSyncNow();
    };
    const handleOffline = () => {
      setIsConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (typeof window !== "undefined" && navigator && !navigator.onLine) {
      setIsConnected(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Push Notification States
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; body: string } | null>(null);
  const notifiedMissionsRef = React.useRef<Set<string>>(new Set());

  // Initialize notification permission status
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser push notification permissions
  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("This browser environment does not support push notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        try {
          new Notification("🚨 SYSTEM ALERTS DEPLOYED", {
            body: "Push alerts activated. You will receive system notifications when mission risk exceeds 85%.",
            tag: "push-activation-alert"
          });
        } catch (e) {
          console.warn("Native Notification popup failed to open (possibly iframe constraints). Fallback to visual toast.", e);
        }
      }
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
  };

  // Trigger test system notification
  const triggerTestNotification = () => {
    const title = "🚨 CRITICAL RISK SYSTEM TEST";
    const body = "This is a verification test. A mission risk has exceeded 85%! Urgent Action Required.";
    
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, tag: "test-alert" });
      } catch (e) {
        console.warn("Native Notification popup failed to open (possibly iframe constraints). Fallback to visual toast.", e);
      }
    }
    
    setActiveToast({
      id: "test-id",
      title,
      body
    });
  };

  // Monitor missions for risk scores exceeding 85%
  useEffect(() => {
    if (missions.length === 0) return;

    missions.forEach(m => {
      // Exceeds 85% risk score, not completed, and not already notified in this session
      if (m.status !== "completed" && m.riskScore > 85 && !notifiedMissionsRef.current.has(m.id)) {
        notifiedMissionsRef.current.add(m.id);

        const title = `🚨 CRITICAL RISK: ${m.title}`;
        const body = `Risk score reached ${m.riskScore}%. Assigned: ${m.assignedTo}. Immediate CoS intervention recommended!`;

        // 1. Browser Native Push Notification
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            try {
              new Notification(title, {
                body,
                tag: `risk-${m.id}`,
                requireInteraction: true
              });
            } catch (err) {
              console.warn("Could not dispatch native browser Notification inside iframe sandbox:", err);
            }
          }
        }

        // 2. In-App Fallback Toast/Alert Feedback for instant visibility
        setActiveToast({
          id: m.id,
          title,
          body
        });
      }
    });
  }, [missions]);

  const demoManagerFallback: TeamMember = {
    id: "mem-1",
    name: "Souparno (You)",
    role: "manager",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    xp: 0,
    level: 1,
    coins: 0,
    completedMissions: 0,
    onTimeRate: 100,
    status: "active",
    email: "demo@deadlinex.local",
  };

  // Active User Profile Context — use a provisional profile so SSO never blocks on server sync
  const currentUser = useMemo((): TeamMember | null => {
    if (useDemoMode) {
      return members.find(m => m.id === "mem-1") || demoManagerFallback;
    }
    if (googleUser?.email) {
      const match = members.find(m => m.email?.toLowerCase() === googleUser.email.toLowerCase());
      if (match) return match;
      return {
        id: `sso-${googleUser.uid}`,
        name: googleUser.displayName || googleUser.email.split("@")[0],
        email: googleUser.email,
        role: ssoRole,
        avatar: googleUser.photoURL || demoManagerFallback.avatar,
        xp: 0,
        level: 1,
        coins: 0,
        completedMissions: 0,
        onTimeRate: 100,
        status: "active",
      };
    }
    return members.find(m => m.id === "mem-1") || null;
  }, [useDemoMode, members, googleUser, ssoRole]);

  // Load state from REST database
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Failed to load state");
      const data = await res.json();
      if (data) {
        setMissions(data.missions);
        setMembers(data.members);
        setRewards(data.rewards);
        setActivities(data.activities);
        setCalendar(data.calendar);
      }
      setIsConnected(true);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error("Failed to load application state:", err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyBrief = async () => {
    setLoadingBrief(true);
    try {
      const res = await fetch("/api/ai/brief");
      if (!res.ok) throw new Error("Failed to load daily brief");
      const data = await res.json();
      if (data) {
        setDailyBrief(data);
      }
      setIsConnected(true);
    } catch (err) {
      console.error("Failed to fetch daily brief:", err);
      setIsConnected(false);
    } finally {
      setLoadingBrief(false);
    }
  };

  useEffect(() => {
    fetchState();
    fetchDailyBrief();
    fetch("/api/ai/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setAiStatus(data); })
      .catch(() => setAiStatus({ configured: false, model: "unknown" }));
  }, []);

  const handleRefreshState = () => {
    fetchState();
    fetchDailyBrief();
  };

  // Toggle Role between Manager & Employee
  const handleToggleRole = async () => {
    if (!currentUser) return;
    const nextRole = currentUser.role === "manager" ? "employee" : "manager";
    
    // Optimistic Update
    const updatedMembers = members.map(m => 
      m.id === currentUser.id ? { ...m, role: nextRole } : m
    );
    setMembers(updatedMembers as TeamMember[]);

    try {
      await fetch(`/api/members/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });
      fetchState();
    } catch (err) {
      console.error("Failed to sync role state:", err);
    }
  };

  const handleLaunchDemo = () => {
    localStorage.setItem("deadlinex-demo-mode", "true");
    setUseDemoMode(true);
    fetchState();
    fetchDailyBrief();
  };

  const handleExitDemo = () => {
    localStorage.removeItem("deadlinex-demo-mode");
    setUseDemoMode(false);
  };

  // Create Mission action
  const handleCreateMission = async (formData: any) => {
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        fetchState();
        fetchDailyBrief();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || "Failed to assign mission.");
    }
  };

  // Add Employee/Member action
  const handleAddEmployee = async (employeeData: { name: string; email: string; role: string; avatar?: string }) => {
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData)
      });
      const data = await res.json();
      if (data.success) {
        fetchState();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      console.error("Failed to add employee:", err);
      return { success: false, error: err.message || "Network error" };
    }
  };

  // Update Mission (Status, checklists)
  const handleUpdateMission = async (missionId: string, updates: any) => {
    try {
      const res = await fetch(`/api/missions/${missionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        fetchState();
        fetchDailyBrief();
      }
    } catch (err) {
      console.error("Failed to update mission status:", err);
    }
  };

  // Deploy AI Rescue action (Delegate, split, extend)
  const handleDeployAIRescue = async (missionId: string, rescueActionId: string) => {
    try {
      const res = await fetch(`/api/missions/${missionId}/rescue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescueActionId })
      });
      const data = await res.json();
      if (data.success) {
        fetchState();
        fetchDailyBrief();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to apply CoS rescue.");
    }
  };

  // Redeem item in Rewards Store
  const handleRedeemReward = async (rewardId: string) => {
    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId })
      });
      const data = await res.json();
      if (data.success) {
        fetchState();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to redeem reward.");
    }
  };

  // Create calendar focus block event
  const handleCreateCalendarEvent = async (eventData: any) => {
    // Standard simulation helper to map client entries instantly
    setCalendar(prev => [...prev, {
      id: `cal-${Date.now()}`,
      ...eventData
    }]);
  };

  // Render current navigation screen
  const renderTabContent = () => {
    // Filter missions by global search query (title or assignee)
    const searchedMissions = missions.filter(m => {
      if (!globalSearch.trim()) return true;
      const query = globalSearch.toLowerCase();
      const matchesTitle = m.title.toLowerCase().includes(query);
      const assignee = members.find(mem => mem.id === m.assignedTo);
      const matchesAssignee = assignee ? assignee.name.toLowerCase().includes(query) : false;
      return matchesTitle || matchesAssignee;
    });

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            missions={searchedMissions}
            members={members}
            brief={dailyBrief}
            loadingBrief={loadingBrief}
            refreshState={handleRefreshState}
            triggerAIRescue={handleDeployAIRescue}
          />
        );
      case "missions":
        return (
          <MissionsList 
            missions={searchedMissions}
            members={members}
            currentUser={currentUser!}
            createMission={handleCreateMission}
            updateMission={handleUpdateMission}
            triggerAIRescue={handleDeployAIRescue}
            selectedMissionId={selectedMissionId}
            setSelectedMissionId={setSelectedMissionId}
            activities={activities}
          />
        );
      case "calendar":
        return (
          <CalendarView 
            calendar={calendar}
            missions={searchedMissions}
            createCalendarEvent={handleCreateCalendarEvent}
            refreshState={handleRefreshState}
            googleUser={googleUser}
            googleToken={googleToken}
            googleSyncing={googleSyncing}
            googleLastSynced={googleLastSynced}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onGoogleSync={handleGoogleSyncNow}
          />
        );
      case "leaderboard":
        return (
          <Leaderboard 
            members={members} 
            currentUser={currentUser!}
            onAddEmployee={handleAddEmployee}
          />
        );
      case "rewards":
        return (
          <RewardsStore 
            rewards={rewards}
            currentUser={currentUser!}
            redeemReward={handleRedeemReward}
          />
        );
      default:
        return <div>Tab not loaded.</div>;
    }
  };

  if (loading && !googleUser && !useDemoMode) {
    return (
      <div className={`min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 ${theme === "light" ? "light" : ""}`}>
        <Bot className="w-12 h-12 text-red-500 animate-bounce" />
        <p className="text-sm text-slate-400 font-mono font-bold uppercase tracking-wider">Loading Execution OS matrices...</p>
      </div>
    );
  }

  // Brief auth check — capped at 4s by safety timeout; never blocks signed-in users
  if (authBootstrapping && !googleUser && !useDemoMode) {
    return (
      <div className={`min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 ${theme === "light" ? "light" : ""}`}>
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 font-mono font-bold uppercase tracking-wider">Restoring session...</p>
      </div>
    );
  }

  if (!googleUser && !useDemoMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
        {ssoError && (
          <div className="bg-red-950/80 border-b border-red-900/50 px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-red-300">{ssoError}</p>
            <button
              onClick={() => setSsoError(null)}
              className="text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-wider shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex flex-1">
        {/* Manager Portal */}
        <div className="flex-1 flex flex-col items-center justify-center border-r border-slate-800 p-8 hover:bg-slate-900/50 transition-colors group relative">
          <div className="absolute top-8 left-8 text-slate-700 font-mono text-xs uppercase tracking-widest font-bold">Port 01</div>
          <Brain className="w-20 h-20 text-red-500 mb-6 group-hover:scale-110 group-hover:animate-pulse transition-transform" />
          <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-3">Manager Portal</h2>
          <p className="text-slate-400 text-center max-w-xs mb-10 text-sm leading-relaxed">
            Direct operations, assign missions, manage team health, and access the AI Chief of Staff.
          </p>
          <button 
            onClick={() => handleGoogleLogin("manager")}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase rounded flex items-center gap-3 transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/20"
          >
            <Zap className="w-4 h-4" /> Sign In as Manager
          </button>
        </div>

        {/* Employee Portal */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 hover:bg-slate-900/50 transition-colors group relative">
          <div className="absolute top-8 right-8 text-slate-700 font-mono text-xs uppercase tracking-widest font-bold">Port 02</div>
          <Compass className="w-20 h-20 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
          <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-3">Employee Portal</h2>
          <p className="text-slate-400 text-center max-w-xs mb-10 text-sm leading-relaxed">
            Execute assignments, track your performance, redeem rewards, and view calendar syncs.
          </p>
          <button 
            onClick={() => handleGoogleLogin("employee")}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest uppercase rounded flex items-center gap-3 transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <Compass className="w-4 h-4" /> Sign In as Employee
          </button>
        </div>
        </div>

        {/* Demo bypass — instant access to all AI features with Groq */}
        <div className="border-t border-slate-800 bg-slate-900/60 px-8 py-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <Bot className="w-8 h-8 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Skip sign-in — launch demo workspace</p>
              <p className="text-xs text-slate-400">Voice assistant, push alerts, chat prompts &amp; Groq AI — no Google account needed.</p>
            </div>
          </div>
          <button
            onClick={handleLaunchDemo}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30 hover:border-red-500/50 font-bold tracking-widest uppercase text-xs rounded-lg flex items-center gap-2 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Launch Demo Workspace
          </button>
        </div>
      </div>
    );
  }

  const hasCriticalMissions = missions.some(m => m.status !== "completed" && m.riskScore >= 75);

  return (
    <div className={`flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans ${theme === "light" ? "light" : ""}`}>
      {/* High-Visibility Rescue Alert Banner matching the Bold Typography Design theme */}
      <div className={`px-4 py-2 font-black text-xs text-center uppercase tracking-widest flex items-center justify-center gap-2 select-none shrink-0 transition-all duration-300 ${
        hasCriticalMissions 
          ? "bg-red-500 text-slate-950 font-extrabold shadow-lg shadow-red-500/20" 
          : "bg-slate-900 text-slate-400 border-b border-slate-800"
      }`}>
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${hasCriticalMissions ? 'bg-slate-950 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
        <span className="font-mono tracking-widest font-extrabold">
          {hasCriticalMissions 
            ? "CRITICAL RISK DETECTED: SPRINT SESSIONS OVERLOADED — IMMEDIATE AI RESCUE ADVISED" 
            : "DEADLINEX // ALL SYSTEM LOGISTICS NORMAL // 0 HIGH RISKS DETECTED"
          }
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* 1. Left Navigation Sidebar */}
        {!isFocusMode && (
          <Sidebar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            toggleRole={handleToggleRole}
          />
        )}

        {/* 2. Main content container */}
        <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        
        {isFocusMode ? (
          <FocusModeView
            missions={missions}
            members={members}
            updateMission={handleUpdateMission}
            onExit={() => setIsFocusMode(false)}
            theme={theme}
            setTheme={setTheme}
            isConnected={isConnected}
            isSyncing={isSyncing}
            handleSyncNow={handleSyncNow}
            lastSyncedAt={lastSyncedAt}
          />
        ) : (
          <>
            {/* Top bar control room */}
            <header className="h-16 border-b border-slate-900 px-6 flex items-center justify-between shrink-0 bg-slate-950/20 z-30 relative">
              <div className="flex items-center space-x-2.5 shrink-0">
                <span className="text-xs text-slate-500 font-mono tracking-wider uppercase">Active View:</span>
                <span className="text-xs font-bold font-mono text-white bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-md uppercase">
                  {activeTab.replace("_", " ")}
                </span>

                {/* Connection Status and Manual Sync Indicator */}
                <div className="h-4 w-[1px] bg-slate-850 mx-1.5 hidden xs:block" />

                <div 
                  className={`px-2 py-1 rounded-lg text-xs font-mono border flex items-center gap-1.5 sm:gap-2 select-none ${
                    isConnected 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`} 
                  title={isConnected ? "App is connected to the Execution server" : "Disconnected from the Execution server. Fallback offline mode active."}
                >
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isConnected ? "bg-emerald-400" : "bg-rose-400"
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      isConnected ? "bg-emerald-500" : "bg-rose-500"
                    }`}></span>
                  </span>
                  <span className="uppercase text-[9px] sm:text-[10px] font-bold">
                    <span className="inline sm:hidden">{isConnected ? "Live" : "Offline"}</span>
                    <span className="hidden sm:inline">{isConnected ? "Connected" : "Disconnected"}</span>
                  </span>
                </div>

                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className={`px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold font-mono border transition-all flex items-center gap-1 sm:gap-1.5 uppercase cursor-pointer select-none ${
                    isSyncing 
                      ? "bg-slate-900 text-slate-500 border-slate-850" 
                      : isConnected 
                        ? "bg-slate-900 text-slate-300 border-slate-850 hover:bg-slate-800 hover:text-white" 
                        : "bg-rose-500 hover:bg-rose-600 text-white border-rose-600"
                  }`}
                  title={lastSyncedAt ? `Last Synced: ${lastSyncedAt.toLocaleTimeString()}` : "Sync with server"}
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>
                    <span className="inline sm:hidden">{isSyncing ? "..." : "Sync"}</span>
                    <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync Now"}</span>
                  </span>
                </button>
              </div>

              {/* Middle Section: Global Search Bar */}
              <div className="flex-1 max-w-md mx-6 relative hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => {
                      setGlobalSearch(e.target.value);
                      setSelectedMissionId(null);
                    }}
                    placeholder="Search missions by title or assignee..."
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-red-500 rounded-xl text-xs pl-9 pr-8 py-2 text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                  />
                  {globalSearch && (
                    <button
                      onClick={() => {
                        setGlobalSearch("");
                        setSelectedMissionId(null);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Instant Search Results Dropdown Overlay */}
                {globalSearch.trim() !== "" && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-900">
                    <div className="p-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider bg-slate-900/30 flex justify-between items-center">
                      <span>Search Results ({
                        missions.filter(m => {
                          const query = globalSearch.toLowerCase();
                          const matchesTitle = m.title.toLowerCase().includes(query);
                          const assignee = members.find(mem => mem.id === m.assignedTo);
                          const matchesAssignee = assignee ? assignee.name.toLowerCase().includes(query) : false;
                          return matchesTitle || matchesAssignee;
                        }).length
                      })</span>
                      {globalSearch && (
                        <button 
                          onClick={() => setGlobalSearch("")} 
                          className="text-[9px] font-mono text-red-400 hover:text-red-300 uppercase"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {missions.filter(m => {
                      const query = globalSearch.toLowerCase();
                      const matchesTitle = m.title.toLowerCase().includes(query);
                      const assignee = members.find(mem => mem.id === m.assignedTo);
                      const matchesAssignee = assignee ? assignee.name.toLowerCase().includes(query) : false;
                      return matchesTitle || matchesAssignee;
                    }).length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        No missions matched your search
                      </div>
                    ) : (
                      missions.filter(m => {
                        const query = globalSearch.toLowerCase();
                        const matchesTitle = m.title.toLowerCase().includes(query);
                        const assignee = members.find(mem => mem.id === m.assignedTo);
                        const matchesAssignee = assignee ? assignee.name.toLowerCase().includes(query) : false;
                        return matchesTitle || matchesAssignee;
                      }).map(m => {
                        const assignee = members.find(mem => mem.id === m.assignedTo);
                        return (
                          <button 
                            key={m.id}
                            onClick={() => {
                              setSelectedMissionId(m.id);
                              setActiveTab("missions");
                              setGlobalSearch(""); // Clear query so we reveal full list with selected highlighted
                            }}
                            className="w-full p-3 hover:bg-slate-900/60 transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider border font-mono ${
                                  m.priority === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  m.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                  m.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {m.priority}
                                </span>
                                <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider font-mono ${
                                  m.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                  m.status === 'in_progress' ? 'bg-sky-500/10 text-sky-400' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {m.status.replace('_', ' ')}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white truncate">{m.title}</h4>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{m.description}</p>
                            </div>
                            
                            {assignee && (
                              <div className="flex items-center gap-2 shrink-0 border-l border-slate-900 pl-3">
                                <img src={assignee.avatar} alt={assignee.name} className="w-5 h-5 rounded-full border border-slate-850" />
                                <div className="text-right">
                                  <span className="text-[9px] font-mono text-slate-500 block uppercase">Assignee</span>
                                  <span className="text-[10px] font-bold text-slate-300 block leading-tight">{assignee.name}</span>
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 shrink-0">
                {/* Focus Mode Quick Launcher */}
                <button
                  onClick={() => setIsFocusMode(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center gap-1.5 font-mono uppercase cursor-pointer"
                  title="Activate deep focus state"
                >
                  <Brain className="w-4 h-4 animate-pulse text-red-400" />
                  <span>Focus Mode</span>
                </button>

                {/* Theme Switcher Button */}
                <button
                  onClick={() => setTheme(prev => prev === "midnight" ? "light" : "midnight")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-slate-100 transition-all flex items-center gap-1.5 font-mono uppercase cursor-pointer"
                  title={`Switch to ${theme === "midnight" ? "High-Contrast Light" : "Midnight"} mode`}
                >
                  {theme === "midnight" ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-sky-500" />
                      <span className="hidden sm:inline">Midnight</span>
                    </>
                  )}
                </button>

                {/* Groq AI Status Indicator */}
                {aiStatus && (
                  <div
                    className={`px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono border flex items-center gap-1.5 select-none ${
                      aiStatus.configured
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                    title={aiStatus.configured ? `Groq AI active (${aiStatus.model})` : "GROQ_API_KEY not configured — using fallback responses"}
                  >
                    <Sparkles className={`w-3 h-3 ${aiStatus.configured ? "animate-pulse" : ""}`} />
                    <span className="uppercase font-bold hidden sm:inline">
                      {aiStatus.configured ? "Groq AI Live" : "AI Fallback"}
                    </span>
                    <span className="uppercase font-bold sm:hidden">
                      {aiStatus.configured ? "AI" : "FB"}
                    </span>
                  </div>
                )}

                {/* Push Notification Center Controller */}
                <div className="flex items-center gap-2">
                  {notificationPermission === "default" && (
                    <button
                      onClick={requestNotificationPermission}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 transition-all flex items-center gap-1.5 animate-pulse"
                      title="Enable browser system push notifications"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Enable Push Alerts</span>
                    </button>
                  )}
                  {notificationPermission === "granted" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={triggerTestNotification}
                        className="px-2 py-1 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        title="Send a test notification"
                      >
                        Test Alert
                      </button>
                      <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Bell className="w-3.5 h-3.5 animate-pulse" />
                        <span className="hidden sm:inline">Push Active</span>
                      </div>
                    </div>
                  )}
                  {notificationPermission === "denied" && (
                    <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1.5 cursor-not-allowed" title="System push notifications are blocked. Check browser address bar settings to re-enable.">
                      <Bell className="w-3.5 h-3.5 opacity-50" />
                      <span>Push Blocked</span>
                    </div>
                  )}
                </div>

                {/* Collapsible AI CoS assistant toggler */}
                <button
                  onClick={() => setIsCoSOpen(!isCoSOpen)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isCoSOpen 
                      ? "bg-slate-900 text-red-400 border-red-500/25 shadow-lg shadow-red-500/2" 
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>CoS Co-pilot</span>
                </button>

                {useDemoMode && (
                  <button
                    onClick={handleExitDemo}
                    className="px-2 py-1.5 rounded-lg text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-all"
                    title="Exit demo and return to sign-in"
                  >
                    Exit Demo
                  </button>
                )}
              </div>
            </header>

            {/* Outer Split layout workspace */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Main workspace section */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {renderTabContent()}
              </div>

              {/* Collapsible Chief of Staff sidebar companion */}
              {isCoSOpen && (
                <div className="w-96 border-l border-slate-900 bg-slate-950/40 p-4 shrink-0 overflow-y-auto flex flex-col h-full space-y-4">
                  
                  {/* CoS Interface */}
                  <ChiefOfStaffChat 
                    currentUserRole={currentUser?.role || "manager"}
                    refreshState={handleRefreshState}
                  />

                  {/* Feed logs (Activity tracker) */}
                  <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/40">
                      <div className="flex items-center space-x-1.5">
                        <History className="w-4 h-4 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Operations Feed</span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {activities.slice(0, 5).map(log => {
                        return (
                          <div key={log.id} className="text-[11px] leading-relaxed text-slate-400 border-b border-slate-850 pb-1.5 last:border-0 last:pb-0">
                            <span className="font-bold text-slate-300 font-display">{log.memberName}</span>{" "}
                            <span className="text-slate-400">{log.action}</span>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </>
        )}

      </main>

      {/* Visual fallback Toast Notification overlay */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 border-2 border-red-500 rounded-2xl p-4 shadow-2xl shadow-red-500/20 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />
              <span className="font-bold text-xs font-mono uppercase tracking-widest">CRITICAL MISSION RISK</span>
            </div>
            <button 
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-white text-xs font-mono p-1 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
          <div>
            <h5 className="text-xs font-bold text-white font-display">{activeToast.title}</h5>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{activeToast.body}</p>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
            <span className="text-[9px] font-mono text-slate-500">System Notification Dispatched</span>
            <button
              onClick={() => {
                setActiveTab("missions");
                setActiveToast(null);
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold tracking-wider uppercase font-mono transition-all"
            >
              Inspect
            </button>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
