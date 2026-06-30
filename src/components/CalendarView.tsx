import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  Plus,
  Compass,
  ArrowRight,
  LogIn,
  LogOut,
  UserCheck
} from "lucide-react";
import { CalendarEvent, Mission } from "../types";

interface CalendarViewProps {
  calendar: CalendarEvent[];
  missions: Mission[];
  createCalendarEvent: (eventData: any) => Promise<void>;
  refreshState: () => void;
  googleUser: any;
  googleToken: string | null;
  googleSyncing: boolean;
  googleLastSynced: Date | null;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onGoogleSync: () => Promise<void>;
}

export default function CalendarView({ 
  calendar, 
  missions, 
  createCalendarEvent,
  refreshState,
  googleUser,
  googleToken,
  googleSyncing,
  googleLastSynced,
  onGoogleLogin,
  onGoogleLogout,
  onGoogleSync
}: CalendarViewProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  
  // New event form states
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStart, setNewEventStart] = useState("2026-07-01T14:00");
  const [newEventDuration, setNewEventDuration] = useState("60");
  const [selectedMission, setSelectedMission] = useState("");



  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const startDateTime = new Date(newEventStart);
    const endDateTime = new Date(startDateTime.getTime() + parseInt(newEventDuration) * 60000);

    // Format back to ISO string
    const formatDateTime = (date: Date) => {
      return date.toISOString().replace("Z", "").slice(0, 19);
    };

    await createCalendarEvent({
      title: newEventTitle,
      start: formatDateTime(startDateTime),
      end: formatDateTime(endDateTime),
      missionId: selectedMission || undefined
    });

    setNewEventTitle("");
    setSelectedMission("");
    setIsScheduling(false);
  };

  // Group events by day for visual agenda list
  const days = ["2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03"];
  const getEventsForDay = (day: string) => {
    return calendar.filter(e => e.start.startsWith(day)).sort((a,b) => a.start.localeCompare(b.start));
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr.slice(11, 16);
    }
  };

  const getDayLabel = (dayStr: string) => {
    const d = new Date(dayStr);
    const daysName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (dayStr === "2026-06-30") return "Today (Tue, Jun 30)";
    if (dayStr === "2026-07-01") return "Tomorrow (Wed, Jul 1)";
    return `${daysName[d.getDay()]}, ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header with Integration controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-display text-white">Smart Calendar Integrations</h2>
            {googleUser && (
              <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-900/50 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Auto-Sync Active (15m)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Map focus sessions to high-risk missions automatically or sync with Google Calendar.</p>
          {googleUser && googleLastSynced && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              <span>Background scheduler running. Last synchronized: </span>
              <strong className="font-mono text-slate-400">{googleLastSynced.toLocaleTimeString()}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={() => setIsScheduling(true)}
            className="px-4 py-2 text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-750 border border-slate-700 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-red-500" />
            <span>Schedule Focus block</span>
          </button>
          
          {!googleUser ? (
            <button
              onClick={onGoogleLogin}
              disabled={googleSyncing}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white border border-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {googleSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Connect Google Calendar</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-950/40 p-1 rounded-lg border border-slate-800/80">
              <div className="px-2 py-1 text-left hidden sm:block">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Connected Google User</div>
                <div className="text-xs text-slate-300 font-mono font-medium max-w-[160px] truncate">{googleUser.email}</div>
              </div>
              <div className="flex items-center gap-1.5 p-1">
                <button
                  onClick={onGoogleSync}
                  disabled={googleSyncing}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Manual calendar refresh"
                >
                  {googleSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span>Sync Now</span>
                </button>
                <button
                  onClick={onGoogleLogout}
                  className="p-1.5 bg-slate-900/60 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/40 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                  title="Disconnect Google Account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Agenda & Scheduler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agenda View */}
        <div className="lg:col-span-2 space-y-6">
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            return (
              <div key={day} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    {getDayLabel(day)}
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    {dayEvents.length} events
                  </span>
                </div>

                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-1 pl-4">No events scheduled. Clear block for focused development.</p>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map(event => {
                      const mission = missions.find(m => m.id === event.missionId);
                      return (
                        <div 
                          key={event.id}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                            event.isMeeting 
                              ? "bg-purple-950/10 border-purple-900/20 text-purple-200" 
                              : mission 
                                ? "bg-red-950/10 border-red-900/20 text-red-100" 
                                : "bg-slate-900/40 border-slate-850 text-slate-300"
                          }`}
                        >
                          <div className="p-2 bg-slate-950 rounded-lg text-slate-400 self-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold leading-snug truncate">{event.title}</h4>
                              <span className="text-[10px] font-mono text-slate-500 font-medium shrink-0">
                                {formatTime(event.start)} - {formatTime(event.end)}
                              </span>
                            </div>
                            
                            {mission && (
                              <div className="flex items-center space-x-2 mt-1.5">
                                <span className="bg-red-500/10 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                                  Mission Focus
                                </span>
                                <p className="text-[11px] text-slate-400 truncate font-medium">Mapped: "{mission.title}"</p>
                              </div>
                            )}

                            {event.title.includes("synced") && (
                              <div className="flex items-center space-x-1 mt-1">
                                <span className="text-[10px] text-emerald-400 font-semibold font-mono">✓ OAuth Verified Sync</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CoS Scheduler Advice Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* AI Advice Panel */}
          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-red-500" />
              <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-200">CoS Scheduling Advice</h4>
            </div>
            
            <div className="space-y-4 text-xs text-slate-300">
              <p className="leading-relaxed">
                Our execution vector analysis highlights that **Sarah Lin** has **zero** free work slots scheduled for tomorrow to handle the critical **Beta Launch deployment**.
              </p>
              <div className="p-3 bg-red-950/20 border border-red-900/20 rounded-lg">
                <span className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-wider block mb-1">Recommended Calendar Fix</span>
                <p className="text-[11px] text-slate-300">
                  Reschedule Sarah's 2:30 PM Design Review, and allocate a 3-hour "Deep Work Focus Block" for her deployment scripts instead.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-3">Calendar Health</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total meetings scheduled</span>
                <span className="font-mono text-purple-400">3 meetings</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total deep focus hours</span>
                <span className="font-mono text-red-400">5.0 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interruption risk percentage</span>
                <span className="font-mono text-orange-400">42% (Medium)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SCHEDULER MODAL */}
      {isScheduling && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold font-display text-white">Schedule Focus Block</h3>
              </div>
              <button 
                onClick={() => setIsScheduling(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Session Title</label>
                <input 
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="E.g., Deep Focus: Build Scripts verification"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Start Date & Time</label>
                  <input 
                    type="datetime-local"
                    required
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Duration (Minutes)</label>
                  <select 
                    value={newEventDuration}
                    onChange={(e) => setNewEventDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-lg focus:outline-none"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Associate with active Mission</label>
                <select 
                  value={selectedMission}
                  onChange={(e) => setSelectedMission(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-lg focus:outline-none"
                >
                  <option value="">None (Independent task)</option>
                  {missions.filter(m => m.status !== 'completed').map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduling(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700/60 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg flex items-center gap-1 shadow-lg shadow-red-500/10"
                >
                  <span>Book Block</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
