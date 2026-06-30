import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckSquare, 
  Square, 
  ArrowLeft, 
  Clock, 
  Brain, 
  Music, 
  BookOpen, 
  Activity, 
  Smile, 
  ChevronRight,
  User,
  AlertCircle,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { Mission, TeamMember } from "../types";

interface FocusModeViewProps {
  missions: Mission[];
  members: TeamMember[];
  updateMission: (missionId: string, updates: any) => Promise<void>;
  onExit: () => void;
  theme?: "midnight" | "light";
  setTheme?: React.Dispatch<React.SetStateAction<"midnight" | "light">>;
  isConnected?: boolean;
  isSyncing?: boolean;
  handleSyncNow?: () => Promise<void>;
  lastSyncedAt?: Date | null;
}

type TimerPreset = "pomodoro" | "deep" | "short" | "sprint";

export default function FocusModeView({ 
  missions, 
  members, 
  updateMission, 
  onExit, 
  theme, 
  setTheme,
  isConnected = true,
  isSyncing = false,
  handleSyncNow,
  lastSyncedAt
}: FocusModeViewProps) {
  // Find all active (uncompleted) missions
  const activeMissions = missions.filter(m => m.status !== "completed");
  
  // High-priority active missions (high or critical)
  const highPriorityMissions = activeMissions.filter(m => m.priority === "high" || m.priority === "critical");
  
  // Fall back to any active mission if no high-priority ones exist, sorted by riskScore descending
  const focusCandidates = activeMissions.sort((a, b) => b.riskScore - a.riskScore);
  
  // Currently focused mission ID state (default to first candidate or first high-priority)
  const initialFocusMission = highPriorityMissions.length > 0 ? highPriorityMissions[0] : (focusCandidates.length > 0 ? focusCandidates[0] : null);
  const [focusedMissionId, setFocusedMissionId] = useState<string>(initialFocusMission?.id || "");
  
  const currentMission = missions.find(m => m.id === focusedMissionId);
  const assignee = currentMission ? members.find(m => m.id === currentMission.assignedTo) : null;

  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActive, setIsActive] = useState(false);
  const [activePreset, setActivePreset] = useState<TimerPreset>("pomodoro");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Flow Journal / Notes State
  const [journalText, setJournalText] = useState("");
  const [savedLogs, setSavedLogs] = useState<string[]>([]);

  // Sound Synth States
  const [ambientSound, setAmbientSound] = useState<"none" | "alpha" | "rain" | "space">("none");
  const [volume, setVolume] = useState(0.4);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Audio Nodes References
  const nodesRef = useRef<{
    leftOsc?: OscillatorNode;
    rightOsc?: OscillatorNode;
    noiseNode?: ScriptProcessorNode;
    lfoOsc?: OscillatorNode;
    synthGain?: GainNode;
    masterGain?: GainNode;
  }>({});

  // Clean remaining calendar hours display
  const remainingHours = currentMission 
    ? (new Date(currentMission.deadline).getTime() - new Date("2026-06-30T06:23:57").getTime()) / (1000 * 3600)
    : 0;

  // Preset configuration
  const selectPreset = (preset: TimerPreset) => {
    setIsActive(false);
    setActivePreset(preset);
    if (preset === "pomodoro") setTimeLeft(25 * 60);
    else if (preset === "deep") setTimeLeft(50 * 60);
    else if (preset === "short") setTimeLeft(5 * 60);
    else if (preset === "sprint") setTimeLeft(15 * 60);
  };

  // Timer Tick Side-effect
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            playCompletionChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    selectPreset(activePreset);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Web Audio Synth Chime on Completion
  const playCompletionChime = () => {
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      // Arpeggio sound
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.45); // C6
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      
      osc.start(now);
      osc.stop(now + 1.0);
    } catch (e) {
      console.error("Failed to play focus chime:", e);
    }
  };

  // Soundscape audio engine
  const startSynth = (type: "alpha" | "rain" | "space") => {
    try {
      // Create or resume AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Stop any existing sound nodes
      stopSynth();

      // Create Master Gain node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      nodesRef.current.masterGain = masterGain;

      if (type === "alpha") {
        // Binaural beats (Alpha - 10Hz difference)
        // Left channel: 200Hz, Right channel: 210Hz
        const merger = ctx.createChannelMerger(2);
        
        const oscLeft = ctx.createOscillator();
        const gainLeft = ctx.createGain();
        oscLeft.type = "sine";
        oscLeft.frequency.value = 200;
        oscLeft.connect(gainLeft);
        gainLeft.connect(merger, 0, 0);

        const oscRight = ctx.createOscillator();
        const gainRight = ctx.createGain();
        oscRight.type = "sine";
        oscRight.frequency.value = 210;
        oscRight.connect(gainRight);
        gainRight.connect(merger, 0, 1);

        merger.connect(masterGain);

        oscLeft.start();
        oscRight.start();

        nodesRef.current.leftOsc = oscLeft;
        nodesRef.current.rightOsc = oscRight;

      } else if (type === "space") {
        // Space Drone: Heavy low-pass triangle wave with modulated frequency LFO
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(75, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(180, ctx.currentTime);
        filter.Q.value = 4;

        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.15; // super slow sweep

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 80;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        osc.connect(filter);
        filter.connect(masterGain);

        osc.start();
        lfo.start();

        nodesRef.current.leftOsc = osc;
        nodesRef.current.lfoOsc = lfo;

      } else if (type === "rain") {
        // Cyberpunk Rain Simulator using random script processor noise + filtered sine droplets
        const bufferSize = 4096;
        const noiseNode = ctx.createScriptProcessor(bufferSize, 1, 1);
        
        // Rain filtering
        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = "bandpass";
        rainFilter.frequency.value = 400;
        rainFilter.Q.value = 1.0;

        noiseNode.onaudioprocess = (e) => {
          const output = e.outputBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            // Pink/Brownish noise simulation
            output[i] = (Math.random() * 2 - 1) * 0.12;
          }
        };

        noiseNode.connect(rainFilter);
        rainFilter.connect(masterGain);

        // Add soft high-pass filter for droplet sparkles
        nodesRef.current.noiseNode = noiseNode;
      }

    } catch (err) {
      console.error("Web Audio Soundscape initialization error:", err);
    }
  };

  const stopSynth = () => {
    try {
      const nodes = nodesRef.current;
      if (nodes.leftOsc) {
        nodes.leftOsc.stop();
        nodes.leftOsc.disconnect();
      }
      if (nodes.rightOsc) {
        nodes.rightOsc.stop();
        nodes.rightOsc.disconnect();
      }
      if (nodes.lfoOsc) {
        nodes.lfoOsc.stop();
        nodes.lfoOsc.disconnect();
      }
      if (nodes.noiseNode) {
        nodes.noiseNode.disconnect();
      }
      if (nodes.masterGain) {
        nodes.masterGain.disconnect();
      }
      nodesRef.current = {};
    } catch (e) {}
  };

  const handleSoundChange = (soundType: "none" | "alpha" | "rain" | "space") => {
    setAmbientSound(soundType);
    if (soundType === "none") {
      stopSynth();
    } else {
      startSynth(soundType);
    }
  };

  // Handle master volume adjustments on live synth nodes
  useEffect(() => {
    if (nodesRef.current.masterGain && audioContextRef.current) {
      nodesRef.current.masterGain.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  // Clean audio context on unmount
  useEffect(() => {
    return () => {
      stopSynth();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!currentMission) return;
    
    const updatedSubtasks = currentMission.subtasks.map(sub => 
      sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
    );

    // Call real REST API endpoint via prop
    await updateMission(currentMission.id, { subtasks: updatedSubtasks });
  };

  const saveJournalLog = () => {
    if (!journalText.trim()) return;
    const timestamp = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setSavedLogs(prev => [`[${timestamp}] ${journalText}`, ...prev]);
    setJournalText("");
  };

  // Calculate Subtask progress bar
  const totalSubtasks = currentMission?.subtasks?.length || 0;
  const completedSubtasks = currentMission?.subtasks?.filter(s => s.completed)?.length || 0;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-y-auto">
      {/* Absolute top grid mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header Bar */}
      <header className="h-20 border-b border-slate-900 px-6 md:px-12 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-850 flex items-center gap-1.5 font-mono text-xs uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Focus</span>
          </button>
          
          <div className="h-6 w-[1px] bg-slate-800 hidden md:block" />
          
          <div className="hidden md:flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black">COGNITIVE FLOW MODE ACTIVE</span>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Connection Status and Manual Sync Indicator */}
          <div className="flex items-center gap-2">
            <div 
              className={`px-2 py-1 rounded-lg text-xs font-mono border flex items-center gap-1.5 select-none ${
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
              <span className="uppercase text-[9px] font-bold">
                <span className="inline sm:hidden">{isConnected ? "Live" : "Offline"}</span>
                <span className="hidden sm:inline">{isConnected ? "Connected" : "Disconnected"}</span>
              </span>
            </div>

            {handleSyncNow && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className={`px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold font-mono border transition-all flex items-center gap-1 uppercase cursor-pointer select-none ${
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
            )}
          </div>
        </div>

        {/* Mission Selector */}
        <div className="flex items-center space-x-3 max-w-xs md:max-w-md">
          {setTheme && theme && (
            <button
              onClick={() => setTheme(prev => prev === "midnight" ? "light" : "midnight")}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-850 flex items-center gap-1.5 font-mono text-xs uppercase cursor-pointer"
              title={`Switch to ${theme === "midnight" ? "High-Contrast Light" : "Midnight"} mode`}
            >
              {theme === "midnight" ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-sky-500" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          )}

          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider hidden lg:inline">Target Objective:</span>
          <select
            value={focusedMissionId}
            onChange={(e) => setFocusedMissionId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 px-4 py-2.5 focus:outline-none focus:border-red-500 max-w-full font-sans font-bold"
          >
            {activeMissions.length === 0 ? (
              <option value="">No Active Missions</option>
            ) : (
              activeMissions.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-950 text-slate-200 text-xs py-2">
                  [{m.priority.toUpperCase()}] {m.title.length > 36 ? m.title.substring(0, 36) + "..." : m.title}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      {/* Main Focus Panel Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left 7 Columns: Active Mission detail status */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          {currentMission ? (
            <div className="bg-slate-900/40 p-6 md:p-8 rounded-3xl border border-slate-900 space-y-6 backdrop-blur-sm flex-1 flex flex-col justify-between">
              
              <div className="space-y-6">
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest border font-mono ${
                    currentMission.priority === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    currentMission.priority === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-slate-800 text-slate-400 border-slate-750'
                  }`}>
                    {currentMission.priority} PRIORITY
                  </span>

                  {currentMission.etc !== undefined && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      ETC: {currentMission.etc}h
                    </span>
                  )}

                  <span className="bg-slate-950 text-slate-400 border border-slate-850 px-3 py-1 text-[10px] font-mono rounded-lg uppercase">
                    Risk: {currentMission.riskScore}%
                  </span>
                </div>

                {/* Big Title */}
                <div className="space-y-3">
                  <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white leading-tight">
                    {currentMission.title}
                  </h1>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    {currentMission.description}
                  </p>
                </div>

                {/* Subtasks checklist header */}
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-red-500" />
                      <span>Sprint Checkpoints ({completedSubtasks}/{totalSubtasks})</span>
                    </h3>
                    <span className="text-xs text-emerald-400 font-mono font-bold">{progressPercent}% DONE</span>
                  </div>

                  {/* Subtask progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Subtask items checklist */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {currentMission.subtasks && currentMission.subtasks.length > 0 ? (
                      currentMission.subtasks.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleToggleSubtask(sub.id)}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                            sub.completed 
                              ? "bg-slate-950/20 border-slate-900 text-slate-500 line-through" 
                              : "bg-slate-950/80 border-slate-850 hover:border-slate-700 text-slate-200"
                          }`}
                        >
                          <div className="shrink-0">
                            {sub.completed ? (
                              <CheckSquare className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                            )}
                          </div>
                          <span className="text-xs font-medium">{sub.title}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 bg-slate-950/30 border border-slate-900 rounded-xl text-center text-xs text-slate-500 italic">
                        No subtask checkpoints configured for this mission.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignee Footer card */}
              {assignee && (
                <div className="mt-8 p-4 bg-slate-950/40 rounded-2xl border border-slate-900 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center font-mono font-black text-slate-300 text-sm uppercase">
                      {assignee.name.substring(0, 2)}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Active Agent</span>
                      <span className="text-xs font-bold text-slate-200">{assignee.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Confidence Rating</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{assignee.onTimeRate}% On-Time</span>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-900/40 p-12 rounded-3xl border border-slate-900 text-center space-y-3 backdrop-blur-sm">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No Target Objective Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Please select an active team mission from the selector at the top right to focus execution.</p>
            </div>
          )}

          {/* Prompt reminder widget */}
          <div className="bg-gradient-to-r from-red-950/10 to-transparent border border-red-500/10 p-4 rounded-2xl flex items-center gap-3 text-xs text-slate-400">
            <Brain className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
            <span>Avoid digital clutter. Turn off desktop messaging applications and commit 25 minutes of deep focus to the active checkpoints.</span>
          </div>
        </div>

        {/* Right 5 Columns: POMODORO TIMER, BRAINWAVES & JOURNAL */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Pomodoro Timer Visual Board */}
          <div className="bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-slate-900 text-center space-y-6 backdrop-blur-sm relative overflow-hidden">
            {/* Glowing active glow halo */}
            {isActive && (
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">COGNITIVE ENGINE</span>
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">FLOW STATE DEEP TIMER</h2>
            </div>

            {/* Huge Timer Screen */}
            <div className="py-6 flex flex-col items-center">
              <div className={`text-6xl md:text-7xl font-black font-mono tracking-tight transition-all duration-300 select-none ${
                isActive ? 'text-red-500 scale-105' : 'text-slate-100'
              }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-2">
                {activePreset.toUpperCase()} SESSION ACTIVE
              </div>
            </div>

            {/* Timer Presets Selection Row */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
              {(["pomodoro", "deep", "sprint", "short"] as TimerPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => selectPreset(preset)}
                  className={`py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all ${
                    activePreset === preset 
                      ? "bg-slate-900 text-red-400 border border-red-500/20" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {preset === "deep" ? "Deep 50m" : preset === "short" ? "Break 5m" : preset}
                </button>
              ))}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={toggleTimer}
                className={`flex-1 max-w-xs py-3 rounded-xl text-xs font-bold tracking-wider uppercase font-mono transition-all flex items-center justify-center gap-2 ${
                  isActive 
                    ? "bg-amber-600 hover:bg-amber-500 text-slate-950" 
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
              >
                {isActive ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Flow</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Initiate Flow</span>
                  </>
                )}
              </button>

              <button
                onClick={resetTimer}
                className="p-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section 2: Brainwaves and Auditory Stimulators (Web Audio API Synthesizer) */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">Cognitive Audio Waves</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 lowercase animate-pulse bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                {ambientSound !== "none" ? "Synthesizing Live" : "Off"}
              </span>
            </div>

            <div className="space-y-3">
              {/* Preset buttons */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "none", label: "Silent Space", desc: "Absolute quiet" },
                  { id: "alpha", label: "Alpha Focus (10Hz)", desc: "Binaural Beats" },
                  { id: "space", label: "Space Drone", desc: "Cosmic resonance" },
                  { id: "rain", label: "Cyber Rain", desc: "Synthesized shower" }
                ].map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => handleSoundChange(sound.id as any)}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      ambientSound === sound.id 
                        ? "bg-slate-900 border-red-500/30 text-red-400" 
                        : "bg-slate-950/80 border-slate-850 text-slate-400 hover:border-slate-850 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-[11px] font-bold block">{sound.label}</span>
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wide block mt-0.5">{sound.desc}</span>
                  </button>
                ))}
              </div>

              {/* Volume Slider */}
              {ambientSound !== "none" && (
                <div className="pt-2 flex items-center gap-3">
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-red-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                  />
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                </div>
              )}

              {/* Pulsing Visual Wave representation */}
              {ambientSound !== "none" && (
                <div className="h-4 flex items-center justify-center gap-0.5 pt-2">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-[3px] bg-red-500 rounded-full animate-pulse" 
                      style={{ 
                        height: `${Math.floor(Math.random() * 100) + 10}%`,
                        animationDuration: `${0.4 + (i % 4) * 0.15}s`
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Flow Journal - Capture stray thoughts to stay in flow */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 space-y-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 border-b border-slate-900 pb-3">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">Cognitive Stray Capturer</h3>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 font-mono">
                Got a distraction or idea? Dump it here to empty your working memory so you can return to the task instantly.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Capture stray thought / note..."
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveJournalLog()}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 px-3.5 py-2 focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={saveJournalLog}
                  className="px-3 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono"
                >
                  Save
                </button>
              </div>

              {savedLogs.length > 0 && (
                <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto">
                  {savedLogs.map((log, index) => (
                    <div key={index} className="text-[10px] leading-relaxed text-slate-400 font-mono bg-slate-950/40 p-2 rounded-lg border border-slate-900 flex items-start gap-1">
                      <ChevronRight className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
