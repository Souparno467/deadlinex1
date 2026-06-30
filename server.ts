import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { 
  Mission, 
  TeamMember, 
  Reward, 
  ActivityLog, 
  CalendarEvent, 
  RescueAction 
} from "./src/types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5173;
const GROQ_API_KEY = process.env.GROQ_API_KEY || null;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

app.use(express.json());

async function callGroq(options: {
  prompt?: string;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  systemInstruction?: string;
  jsonMode?: boolean;
}) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY missing. Please configure a Groq API key.");
  }

  const requestMessages = options.messages ? [...options.messages] : [];
  if (options.systemInstruction) {
    requestMessages.unshift({ role: "system", content: options.systemInstruction });
  }
  if (options.prompt && !requestMessages.some((message) => message.content === options.prompt)) {
    requestMessages.push({ role: "user", content: options.prompt });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: requestMessages,
        temperature: 0.2,
        max_tokens: 1400,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {})
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  return {
    text: data.choices?.[0]?.message?.content || ""
  };
}

if (GROQ_API_KEY) {
  console.log("Groq API client initialized.");
} else {
  console.log("GROQ_API_KEY missing. App will use smart fallback analysis.");
}

// ==========================================
// DB STATE (InMemory Persistent during runtime)
// ==========================================

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "mem-1",
    name: "Souparno (You)",
    role: "manager", // Default starting role is manager (can be toggled to employee in UI)
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    xp: 0,
    level: 1,
    coins: 0,
    completedMissions: 0,
    onTimeRate: 100,
    status: "active",
    email: "gsouparno@gmail.com"
  },
  {
    id: "mem-2",
    name: "Sarah Lin",
    role: "employee",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    xp: 0,
    level: 1,
    coins: 0,
    completedMissions: 0,
    onTimeRate: 100,
    status: "active",
    email: "sarah.l@deadlinex.ai"
  },
  {
    id: "mem-3",
    name: "Marcus Vance",
    role: "employee",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    xp: 0,
    level: 1,
    coins: 0,
    completedMissions: 0,
    onTimeRate: 100,
    status: "active",
    email: "marcus.v@deadlinex.ai"
  },
  {
    id: "mem-4",
    name: "Elena Rostova",
    role: "employee",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80",
    xp: 0,
    level: 1,
    coins: 0,
    completedMissions: 0,
    onTimeRate: 100,
    status: "active",
    email: "elena.r@deadlinex.ai"
  },
  {
    id: "mem-5",
    name: "David Kim",
    role: "employee",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
    xp: 0,
    level: 1,
    coins: 0,
    completedMissions: 0,
    onTimeRate: 100,
    status: "active",
    email: "david.k@deadlinex.ai"
  }
];

const INITIAL_MISSIONS: Mission[] = [
  {
    id: "mis-1",
    title: "Launch Beta Version to Production",
    description: "Prepare and execute deployment of the product beta. Ensure CI/CD tests pass and primary CDN routes are verified.",
    deadline: "2026-07-01T18:00:00Z", // Tomorrow
    assignedTo: "mem-2", // Sarah Lin
    assignedByName: "Souparno",
    status: "in_progress",
    priority: "critical",
    xpReward: 300,
    coinReward: 50,
    riskScore: 88,
    riskLevel: "high",
    riskExplanation: "Assignee Sarah Lin is currently overloaded (assigned to 3 other high priority tasks) with an on-time rate of 82%. Time remaining is less than 36 hours.",
    creationDate: "2026-06-28T09:00:00Z",
    tags: ["DevOps", "Launch", "Beta"],
    subtasks: [
      { id: "sub-1-1", title: "Build script verification", completed: true },
      { id: "sub-1-2", title: "CDN routing check", completed: false },
      { id: "sub-1-3", title: "Post-deploy database migrations", completed: false }
    ],
    rescueActions: [
      {
        id: "resc-1-1",
        type: "delegate",
        title: "Delegate to Marcus Vance",
        description: "Marcus has an on-time completion rate of 96% and is currently active with open capacity. Smooth transfer of context is planned.",
        xpPenalty: 0,
        coinCost: 10,
        applied: false
      },
      {
        id: "resc-1-2",
        type: "split_task",
        title: "Split task into Submissions",
        description: "Split deployment scripts from testing protocols. Delegate testing to Elena Rostova to relieve Sarah.",
        xpPenalty: 15,
        coinCost: 5,
        applied: false
      },
      {
        id: "resc-1-3",
        type: "extend_deadline",
        title: "Request 2-Day Grace Period",
        description: "Use 2-day client extension. Standard project delay communication will auto-trigger.",
        xpPenalty: 50,
        coinCost: 0,
        applied: false
      },
      {
        id: "resc-1-4",
        type: "crunch_mode",
        title: "Initiate Crunch Mode Booster",
        description: "Auto-snooze non-critical meetings for Sarah for the next 24 hours. Boosts completion chance by 25%.",
        xpPenalty: 0,
        coinCost: 30,
        applied: false
      }
    ]
  },
  {
    id: "mis-2",
    title: "Finalize Financial Q2 Audit Reports",
    description: "Compile Q2 spreadsheets, expense summaries, and compliance filings for the executive review.",
    deadline: "2026-07-02T12:00:00Z", // 2 days out
    assignedTo: "mem-4", // Elena Rostova
    assignedByName: "Souparno",
    status: "pending",
    priority: "high",
    xpReward: 200,
    coinReward: 30,
    riskScore: 45,
    riskLevel: "medium",
    riskExplanation: "Elena is currently crunching on design updates. The deadline is close, but Elena has a strong historical track record (91% on-time).",
    creationDate: "2026-06-29T10:00:00Z",
    tags: ["Finance", "Audit", "Compliance"],
    subtasks: [
      { id: "sub-2-1", title: "Verify transaction ledger totals", completed: false },
      { id: "sub-2-2", title: "Format compliance templates", completed: false }
    ],
    rescueActions: [
      {
        id: "resc-2-1",
        type: "extend_deadline",
        title: "Use 24-hour extension pass",
        description: "Shift deadline to next business day with minimum rating impact.",
        xpPenalty: 15,
        coinCost: 15,
        applied: false
      },
      {
        id: "resc-2-2",
        type: "templates",
        title: "Inject Financial Report AI Template",
        description: "Inject a pre-formatted, AI-completed compliance template to skip 60% of spreadsheet formatting.",
        xpPenalty: 10,
        coinCost: 10,
        applied: false
      }
    ]
  },
  {
    id: "mis-3",
    title: "Implement OAuth Calendar Sync",
    description: "Integrate Outlook and Google calendar endpoints. Sync missions directly to target schedules.",
    deadline: "2026-07-05T17:00:00Z", // 5 days out
    assignedTo: "mem-3", // Marcus Vance
    assignedByName: "Souparno",
    status: "in_progress",
    priority: "medium",
    xpReward: 150,
    coinReward: 20,
    riskScore: 12,
    riskLevel: "low",
    riskExplanation: "Marcus is active with high focus and has plenty of time. Historically achieves 96% on-time rate.",
    creationDate: "2026-06-29T14:00:00Z",
    tags: ["Integrations", "API", "Auth"],
    subtasks: [
      { id: "sub-3-1", title: "Setup Developer console keys", completed: true },
      { id: "sub-3-2", title: "Implement token refresh flow", completed: false },
      { id: "sub-3-3", title: "Map event schema mapping", completed: false }
    ],
    rescueActions: []
  },
  {
    id: "mis-4",
    title: "Redesign High-Fidelity App UI",
    description: "Redesign core dashboards to incorporate bento layouts, modern dark accents, and seamless interactive panels.",
    deadline: "2026-06-30T22:00:00Z", // Lapsing soon or tonight
    assignedTo: "mem-2", // Sarah Lin
    assignedByName: "Souparno",
    status: "in_progress",
    priority: "high",
    xpReward: 250,
    coinReward: 40,
    riskScore: 94,
    riskLevel: "critical",
    riskExplanation: "The deadline is in less than 12 hours. Sarah has not checked off any subtasks and is overloaded.",
    creationDate: "2026-06-27T11:00:00Z",
    tags: ["UI/UX", "Design", "Bento"],
    subtasks: [
      { id: "sub-4-1", title: "Design homepage layout grid", completed: false },
      { id: "sub-4-2", title: "Create customized component library", completed: false }
    ],
    rescueActions: [
      {
        id: "resc-4-1",
        type: "delegate",
        title: "Delegate to Marcus Vance",
        description: "Marcus has active bandwidth and is an experienced designer hybrid.",
        xpPenalty: 10,
        coinCost: 15,
        applied: false
      },
      {
        id: "resc-4-2",
        type: "templates",
        title: "Load Pre-designed UI Component Packs",
        description: "Instantly inject 15 high-quality dashboard component designs. Skips layout phase.",
        xpPenalty: 0,
        coinCost: 20,
        applied: false
      }
    ]
  }
];

const INITIAL_REWARDS: Reward[] = [
  {
    id: "rew-1",
    title: "1-Day Grace Extension",
    description: "Instantly extend any critical mission deadline by 24 hours without manager complaints.",
    coinCost: 40,
    iconName: "Clock",
    category: "productivity"
  },
  {
    id: "rew-2",
    title: "Meeting Snooze Pass",
    description: "Decline any non-essential meeting this week to enter deeply engaged Crunch Mode.",
    coinCost: 25,
    iconName: "CalendarX",
    category: "productivity"
  },
  {
    id: "rew-3",
    title: "AI Layout Template Injection",
    description: "Instantly download professional layout and code starters to complete missions 40% faster.",
    coinCost: 35,
    iconName: "Sparkles",
    category: "productivity"
  },
  {
    id: "rew-4",
    title: "Manager Coffee Delivery",
    description: "Manager is notified to order a delicious hot brew to be delivered straight to your workstation.",
    coinCost: 60,
    iconName: "Coffee",
    category: "fun"
  },
  {
    id: "rew-5",
    title: "Half-Day Off Voucher",
    description: "Redeem 4 hours of paid recharge time. The AI Chief of Staff will auto-reallocate active tasks.",
    coinCost: 120,
    iconName: "Sun",
    category: "break"
  }
];

const INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: "act-1",
    timestamp: "2026-06-29T09:30:00Z",
    memberId: "mem-1",
    memberName: "Souparno (You)",
    action: "assigned 'Launch Beta Version to Production' to Sarah Lin",
    type: "mission_created"
  },
  {
    id: "act-2",
    timestamp: "2026-06-29T11:20:00Z",
    memberId: "mem-3",
    memberName: "Marcus Vance",
    action: "completed subtask 'Setup Developer console keys'",
    type: "xp"
  },
  {
    id: "act-3",
    timestamp: "2026-06-30T04:15:00Z",
    memberId: "mem-2",
    memberName: "Sarah Lin",
    action: "unlocked level 6 by completing critical sprint assets",
    type: "completion"
  }
];

const INITIAL_CALENDAR: CalendarEvent[] = [
  {
    id: "cal-1",
    title: "Daily Standup Meeting",
    start: "2026-06-30T09:00:00",
    end: "2026-06-30T09:30:00",
    isMeeting: true
  },
  {
    id: "cal-2",
    title: "Work on Launch Beta Version",
    start: "2026-06-30T10:00:00",
    end: "2026-06-30T13:00:00",
    missionId: "mis-1"
  },
  {
    id: "cal-3",
    title: "Design System Review Session",
    start: "2026-06-30T14:30:00",
    end: "2026-06-30T15:30:00",
    isMeeting: true
  },
  {
    id: "cal-4",
    title: "Work on Q2 Reports",
    start: "2026-07-01T10:00:00",
    end: "2026-07-01T12:00:00",
    missionId: "mis-2"
  },
  {
    id: "cal-5",
    title: "Marcus: Dev Sprint Planning",
    start: "2026-07-01T14:00:00",
    end: "2026-07-01T15:00:00",
    isMeeting: true
  }
];

// Active State
let dbState = {
  members: [...INITIAL_MEMBERS],
  missions: [...INITIAL_MISSIONS],
  rewards: [...INITIAL_REWARDS],
  activities: [...INITIAL_ACTIVITIES],
  calendar: [...INITIAL_CALENDAR]
};

// Helper to log actions
function logActivity(memberId: string, memberName: string, action: string, type: 'completion' | 'xp' | 'rescue' | 'mission_created' | 'coin') {
  const newLog: ActivityLog = {
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    memberId,
    memberName,
    action,
    type
  };
  dbState.activities.unshift(newLog);
  // Keep last 40 logs
  if (dbState.activities.length > 40) {
    dbState.activities.pop();
  }
}

// ==========================================
// REST ENDPOINTS
// ==========================================

// Get entire state
app.get("/api/state", (req, res) => {
  res.json(dbState);
});

// Sync Google Calendar events
app.post("/api/calendar/sync", (req, res) => {
  const { events } = req.body;
  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: "Events array is required." });
  }

  // Filter out any previous synced Google events
  dbState.calendar = dbState.calendar.filter(e => !e.id.startsWith("google-"));

  // Add the newly synchronized events
  const newEvents = events.map((e: any) => ({
    id: `google-${e.id}`,
    title: `⚡ ${e.title || "Calendar Event"} (Google Calendar)`,
    start: e.start,
    end: e.end,
    isMeeting: e.isMeeting ?? true
  }));

  dbState.calendar = [...dbState.calendar, ...newEvents];

  // Log activity
  logActivity(
    "mem-1",
    "Souparno (You)",
    `automatically synchronized ${newEvents.length} upcoming Google Calendar events`,
    "completion"
  );

  res.json({ success: true, calendar: dbState.calendar });
});

// Create Mission
app.post("/api/missions", async (req, res) => {
  const { title, description, deadline, assignedTo, priority, tags, etc, useAiPlanning = true } = req.body;
  
  if (!title || !deadline || !assignedTo) {
    return res.status(400).json({ error: "Title, deadline, and assignee are required." });
  }

  const assignee = dbState.members.find(m => m.id === assignedTo);
  const assigneeName = assignee ? assignee.name : "Unassigned";

  // Calculate generic rewards based on priority
  let xpReward = 100;
  let coinReward = 15;
  if (priority === 'high') {
    xpReward = 200;
    coinReward = 30;
  } else if (priority === 'critical') {
    xpReward = 300;
    coinReward = 50;
  }

  // Pre-generate standard rescue actions
  const rescueActions: RescueAction[] = [
    {
      id: `resc-${Date.now()}-1`,
      type: "delegate",
      title: "Delegate to Marcus Vance",
      description: "Instantly route this to Marcus to spread workload balance.",
      xpPenalty: 5,
      coinCost: 10,
      applied: false
    },
    {
      id: `resc-${Date.now()}-2`,
      type: "extend_deadline",
      title: "Grace Extension (24h)",
      description: "Extend delivery window by 1 day using buffer hours.",
      xpPenalty: 25,
      coinCost: 5,
      applied: false
    }
  ];

  // Try to analyze with AI
  let riskScore = 20;
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let riskExplanation = "Analyzing workload parameters...";

  // Calculate remaining calendar availability
  const currentTime = new Date("2026-06-30T06:23:57-07:00");
  const deadlineTime = new Date(deadline);
  const msLeft = deadlineTime.getTime() - currentTime.getTime();
  const hoursLeft = Math.max(0, msLeft / (1000 * 3600));
  const daysLeft = hoursLeft / 24;

  if (GROQ_API_KEY && useAiPlanning !== false) {
    try {
      const prompt = `Analyze this task for risk prediction.
      Task Title: "${title}"
      Task Description: "${description || 'None'}"
      Deadline: ${deadline}
      Current Time: 2026-06-30T06:23:57-07:00
      Assignee Name: ${assigneeName}
      Assignee historical on-time rate: ${assignee ? assignee.onTimeRate : 90}%
      Assignee Status: ${assignee ? assignee.status : 'active'}
      
      Estimated Time to Complete (ETC): ${etc !== undefined ? etc + ' hours' : 'Not specified'}
      Remaining Calendar Availability until Deadline: ${hoursLeft.toFixed(1)} hours (${daysLeft.toFixed(1)} days)

      IMPORTANT ASSESSMENT METHODOLOGY:
      Compare the task's Estimated Time to Complete (ETC) directly against the remaining calendar availability.
      If the ETC exceeds or is extremely close to the remaining hours, elevate the risk score and level appropriately.
      Also factor in if the assignee is overloaded or has a low on-time rate.

      Respond STRICTLY with a JSON object in this format:
      {
        "riskScore": number (0 to 100),
        "riskLevel": "low" | "medium" | "high" | "critical",
        "riskExplanation": "short explanation of why this risk score was given, explicitly mentioning ETC vs calendar availability comparisons if ETC was specified",
        "rescueActions": [
          {
            "type": "delegate" | "split_task" | "extend_deadline" | "templates" | "crunch_mode",
            "title": "Short title",
            "description": "Short explanation",
            "xpPenalty": number,
            "coinCost": number
          }
        ]
      }`;

      const response = await callGroq({
        prompt,
        jsonMode: true
      });

      const responseText = (response.text || "").trim();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("Initial JSON.parse failed, trying robust cleanup for risk assessment:", parseErr);
        let cleaned = responseText;
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
        }
        try {
          data = JSON.parse(cleaned);
        } catch (secondErr) {
          console.error("Robust fallback parsing also failed for risk assessment:", secondErr);
        }
      }
      if (data.riskScore !== undefined) riskScore = data.riskScore;
      if (data.riskLevel) riskLevel = data.riskLevel;
      if (data.riskExplanation) riskExplanation = data.riskExplanation;
      if (data.rescueActions && Array.isArray(data.rescueActions)) {
        // Merge AI-generated rescue actions
        data.rescueActions.forEach((ra: any, idx: number) => {
          rescueActions.push({
            id: `resc-${Date.now()}-ai-${idx}`,
            type: ra.type || 'extend_deadline',
            title: ra.title || 'AI Recommendation',
            description: ra.description || 'Auto-generated optimization recommendation',
            xpPenalty: ra.xpPenalty !== undefined ? ra.xpPenalty : 15,
            coinCost: ra.coinCost !== undefined ? ra.coinCost : 10,
            applied: false
          });
        });
      }
    } catch (err) {
      console.error("AI Risk Assessment failed, using heuristics:", err);
      // Fallback heuristics
      const remainingHours = (new Date(deadline).getTime() - new Date("2026-06-30T06:23:57").getTime()) / (1000 * 3600);
      const daysLeft = remainingHours / 24;

      if (etc !== undefined && Number(etc) > remainingHours) {
        riskScore = 95;
        riskLevel = 'critical';
        riskExplanation = `Critical: Estimated Time to Complete (${etc}h) exceeds remaining calendar availability (${remainingHours.toFixed(1)}h).`;
      } else if (etc !== undefined && Number(etc) * 1.5 > remainingHours) {
        riskScore = 75;
        riskLevel = 'high';
        riskExplanation = `High Risk: Estimated Time to Complete (${etc}h) consumes over 66% of remaining calendar availability (${remainingHours.toFixed(1)}h).`;
      } else if (daysLeft < 1) {
        riskScore = 80;
        riskLevel = 'high';
        riskExplanation = "Urgent: Delivery scheduled in less than 24 hours.";
      } else if (daysLeft < 3) {
        riskScore = 50;
        riskLevel = 'medium';
        riskExplanation = "Medium: Due in less than 3 days, require prompt tracking.";
      } else {
        riskScore = 15;
        riskLevel = 'low';
        riskExplanation = "Active tracking: Secure buffer remains for delivery.";
      }
    }
  } else {
    // Basic fallback heuristics
    const remainingHours = (new Date(deadline).getTime() - new Date("2026-06-30T06:23:57").getTime()) / (1000 * 3600);
    const daysLeft = remainingHours / 24;

    if (etc !== undefined && Number(etc) > remainingHours) {
      riskScore = 95;
      riskLevel = 'critical';
      riskExplanation = `Critical: Estimated Time to Complete (${etc}h) exceeds remaining calendar availability (${remainingHours.toFixed(1)}h).`;
    } else if (etc !== undefined && Number(etc) * 1.5 > remainingHours) {
      riskScore = 75;
      riskLevel = 'high';
      riskExplanation = `High Risk: Estimated Time to Complete (${etc}h) consumes over 66% of remaining calendar availability (${remainingHours.toFixed(1)}h).`;
    } else if (daysLeft < 1) {
      riskScore = 82;
      riskLevel = 'high';
      riskExplanation = "Immediate: Less than 24 hours to deliver. Sarah is overloaded.";
    } else if (daysLeft < 3) {
      riskScore = 48;
      riskLevel = 'medium';
      riskExplanation = "Moderate: Deadline in under 3 days. Assignee is tracking regularly.";
    } else {
      riskScore = 12;
      riskLevel = 'low';
      riskExplanation = "Secure: Task scheduled with over 3 days of headstart.";
    }
  }

  const newMission: Mission = {
    id: `mis-${Date.now()}`,
    title,
    description: description || "",
    deadline,
    assignedTo,
    assignedByName: "Souparno",
    status: "pending",
    priority: priority || "medium",
    xpReward,
    coinReward,
    riskScore,
    riskLevel,
    riskExplanation,
    etc: etc !== undefined ? Number(etc) : undefined,
    subtasks: (req.body.subtasks || []).map((t: string, i: number) => ({
      id: `sub-${Date.now()}-${i}`,
      title: t,
      completed: false
    })),
    creationDate: new Date().toISOString(),
    tags: tags || [],
    rescueActions
  };

  dbState.missions.unshift(newMission);
  logActivity("mem-1", "Souparno (You)", `created & assigned mission: "${title}" to ${assigneeName}`, "mission_created");

  res.json({ success: true, mission: newMission });
});

// Add Team Member / Employee
app.post("/api/members", (req, res) => {
  const { name, email, role, status, avatar } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  const emailLower = email.toLowerCase();
  const exists = dbState.members.find(m => m.email.toLowerCase() === emailLower);
  if (exists) {
    return res.status(400).json({ error: `A member with email ${email} already exists.` });
  }

  const newMember: TeamMember = {
    id: `mem-${Date.now()}`,
    name,
    email: emailLower,
    role: role || "employee",
    avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`,
    xp: 0,
    level: 1,
    coins: 0,
    completedMissions: 0,
    onTimeRate: 100,
    status: status || "active"
  };

  dbState.members.push(newMember);
  logActivity("mem-1", "Souparno (You)", `added new team member ${name} (${role || "employee"})`, "completion");

  res.json({ success: true, member: newMember, members: dbState.members });
});

// Update Team Member directly
app.put("/api/members/:id", (req, res) => {
  const { id } = req.params;
  const { role, name, email, xp, level, coins, completedMissions, onTimeRate, status, avatar } = req.body;

  let member = dbState.members.find(m => m.id === id);
  if (!member && email) {
    member = dbState.members.find(m => m.email.toLowerCase() === email.toLowerCase());
  }

  if (!member) {
    return res.status(404).json({ error: "Member not found." });
  }

  if (role !== undefined) member.role = role;
  if (name !== undefined) member.name = name;
  if (email !== undefined) member.email = email.toLowerCase();
  if (xp !== undefined) member.xp = xp;
  if (level !== undefined) member.level = level;
  if (coins !== undefined) member.coins = coins;
  if (completedMissions !== undefined) member.completedMissions = completedMissions;
  if (onTimeRate !== undefined) member.onTimeRate = onTimeRate;
  if (status !== undefined) member.status = status;
  if (avatar !== undefined) member.avatar = avatar;

  res.json({ success: true, member, members: dbState.members });
});

// Update Mission Status/Subtasks
app.put("/api/missions/:id", (req, res) => {
  const { id } = req.params;
  const { status, subtasks, priority, assignedTo, role } = req.body;

  // Intercept role updates for team members sent to missions endpoint
  if (id.startsWith("mem-")) {
    const member = dbState.members.find(m => m.id === id);
    if (member) {
      if (role !== undefined) member.role = role;
      return res.json({ success: true, member, members: dbState.members });
    }
    return res.status(404).json({ error: "Member not found." });
  }

  const mission = dbState.missions.find(m => m.id === id);
  if (!mission) {
    return res.status(404).json({ error: "Mission not found." });
  }

  if (status !== undefined) {
    const oldStatus = mission.status;
    mission.status = status;
    
    // Reward XP & Coins upon Completion
    if (status === 'completed' && oldStatus !== 'completed') {
      const assignee = dbState.members.find(m => m.id === mission.assignedTo);
      if (assignee) {
        assignee.xp += mission.xpReward;
        assignee.coins += mission.coinReward;
        assignee.completedMissions += 1;
        
        // Level up algorithm (1000 XP per level starting level 1)
        const expectedLevel = Math.floor(assignee.xp / 300) + 1;
        if (expectedLevel > assignee.level) {
          assignee.level = expectedLevel;
          logActivity(assignee.id, assignee.name, `reached LEVEL ${expectedLevel}!`, "xp");
        }

        logActivity(
          assignee.id, 
          assignee.name, 
          `completed mission "${mission.title}" (+${mission.xpReward} XP, +${mission.coinReward} Coins)`, 
          "completion"
        );
      }
    }
  }

  if (subtasks !== undefined) {
    mission.subtasks = subtasks;
  }

  if (priority !== undefined) {
    mission.priority = priority;
  }

  if (assignedTo !== undefined) {
    const oldAssignee = dbState.members.find(m => m.id === mission.assignedTo);
    const newAssignee = dbState.members.find(m => m.id === assignedTo);
    if (newAssignee) {
      mission.assignedTo = assignedTo;
      logActivity(
        "mem-1", 
        "Souparno (You)", 
        `reassigned "${mission.title}" from ${oldAssignee ? oldAssignee.name : 'Unassigned'} to ${newAssignee.name}`, 
        "mission_created"
      );
    }
  }

  res.json({ success: true, mission });
});

// Apply Rescue Action
app.post("/api/missions/:id/rescue", (req, res) => {
  const { id } = req.params;
  const { rescueActionId } = req.body;

  const mission = dbState.missions.find(m => m.id === id);
  if (!mission) {
    return res.status(404).json({ error: "Mission not found." });
  }

  const action = mission.rescueActions.find(ra => ra.id === rescueActionId);
  if (!action) {
    return res.status(404).json({ error: "Rescue action recommendation not found." });
  }

  if (action.applied) {
    return res.status(400).json({ error: "This rescue action has already been deployed." });
  }

  // Deduct penalty/cost from current manager/user (mem-1)
  const activeUser = dbState.members.find(m => m.id === "mem-1");
  if (!activeUser) {
    return res.status(500).json({ error: "Active user context invalid." });
  }

  if (activeUser.coins < action.coinCost) {
    return res.status(400).json({ error: `Insufficient Execution Coins. Requires ${action.coinCost} coins, you have ${activeUser.coins}.` });
  }

  activeUser.coins -= action.coinCost;
  activeUser.xp = Math.max(0, activeUser.xp - action.xpPenalty);
  action.applied = true;

  // Apply actual effect in DB State
  let descriptionAddition = "";
  if (action.type === 'delegate') {
    // Re-assign to Marcus Vance (mem-3)
    const oldAssignee = dbState.members.find(m => m.id === mission.assignedTo);
    const newAssignee = dbState.members.find(m => m.id === "mem-3");
    if (newAssignee) {
      mission.assignedTo = newAssignee.id;
      descriptionAddition = ` Reassigned workload safely to Marcus Vance.`;
      
      logActivity(
        "mem-1",
        "Souparno (You)",
        `deployed rescue DELEGATION for "${mission.title}" to Marcus (-${action.coinCost} Coins)`,
        "rescue"
      );
    }
  } else if (action.type === 'extend_deadline') {
    // Extend deadline by 2 days
    const currentDeadline = new Date(mission.deadline);
    currentDeadline.setDate(currentDeadline.getDate() + 2);
    mission.deadline = currentDeadline.toISOString();
    descriptionAddition = ` Deadline successfully deferred by 48 hours.`;
    
    logActivity(
      "mem-1",
      "Souparno (You)",
      `deployed rescue DEADLINE EXTENSION for "${mission.title}" (-${action.xpPenalty} XP penalty)`,
      "rescue"
    );
  } else if (action.type === 'crunch_mode') {
    mission.activeCrunchMode = true;
    // Set assignee status to crunching
    const assignee = dbState.members.find(m => m.id === mission.assignedTo);
    if (assignee) {
      assignee.status = 'crunching';
    }
    descriptionAddition = ` Initiated intensive 24-hour Crunch Mode lock.`;
    
    logActivity(
      "mem-1",
      "Souparno (You)",
      `deployed rescue CRUNCH MODE boost on "${mission.title}" (-${action.coinCost} Coins)`,
      "rescue"
    );
  } else if (action.type === 'split_task') {
    // Split subtasks
    if (mission.subtasks.length > 0) {
      // Mark some subtasks completed or delegate them
      descriptionAddition = ` Workload halved. Auxiliary testing routed to Elena Rostova.`;
    }
    logActivity(
      "mem-1",
      "Souparno (You)",
      `deployed rescue SPLIT WORKLOAD on "${mission.title}"`,
      "rescue"
    );
  } else if (action.type === 'templates') {
    // Completed a subtask instantly using templates
    const uncompleted = mission.subtasks.find(st => !st.completed);
    if (uncompleted) {
      uncompleted.completed = true;
      descriptionAddition = ` Injected boilerplate AI starter pack for "${uncompleted.title}".`;
    }
    logActivity(
      "mem-1",
      "Souparno (You)",
      `deployed rescue AI TEMPLATE injection on "${mission.title}" (-${action.coinCost} Coins)`,
      "rescue"
    );
  }

  // Lower risk score since rescue was applied
  mission.riskScore = Math.max(10, Math.floor(mission.riskScore * 0.4));
  if (mission.riskScore < 30) mission.riskLevel = 'low';
  else if (mission.riskScore < 60) mission.riskLevel = 'medium';
  else mission.riskLevel = 'high';

  mission.riskExplanation = `Optimized via CoS Intervention:${descriptionAddition} Current risk lowered to secure thresholds.`;

  res.json({ success: true, mission, activeUser });
});

// Redeem Reward Store Item
app.post("/api/rewards/redeem", (req, res) => {
  const { rewardId } = req.body;
  const reward = dbState.rewards.find(r => r.id === rewardId);
  if (!reward) {
    return res.status(404).json({ error: "Reward item not found." });
  }

  const activeUser = dbState.members.find(m => m.id === "mem-1");
  if (!activeUser) {
    return res.status(500).json({ error: "Active user context invalid." });
  }

  if (activeUser.coins < reward.coinCost) {
    return res.status(400).json({ error: `Insufficient Execution Coins. Requires ${reward.coinCost} coins, you have ${activeUser.coins}.` });
  }

  activeUser.coins -= reward.coinCost;
  
  logActivity(
    "mem-1",
    "Souparno (You)",
    `redeemed reward: "${reward.title}" for -${reward.coinCost} coins`,
    "coin"
  );

  res.json({ success: true, activeUser, reward });
});

// ==========================================
// AI CO-PILOT / CHIEF OF STAFF ENDPOINTS
// ==========================================

// GET Daily Brief
app.get("/api/ai/status", (_req, res) => {
  res.json({
    configured: !!GROQ_API_KEY,
    model: GROQ_MODEL,
    features: ["daily-brief", "chat", "voice-commands", "mission-risk-analysis"]
  });
});

app.get("/api/ai/brief", async (req, res) => {
  const openMissions = dbState.missions.filter(m => m.status !== 'completed');
  const criticalCount = openMissions.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length;
  
  const missionSummary = openMissions.map(m => `- ${m.title} (Priority: ${m.priority}, Assignee: ${dbState.members.find(mem => mem.id === m.assignedTo)?.name}, Risk: ${m.riskLevel}, Score: ${m.riskScore}%)`).join("\n");

  let summary = "Good morning, Chief of Staff. Today is June 30, 2026. You have a few major projects requiring attention. Most team members are humming along, but Sarah Lin is severely overloaded with 3 critical deadlines due in the next 36 hours. We highly recommend deploying the 'Delegate to Marcus' rescue strategy on 'Launch Beta Version to Production' to secure on-time delivery.";
  let recommendedAction = "Delegate the Beta Launch task to Marcus Vance immediately using your Execution Coins. He has free calendar slot at 2:00 PM.";

  if (GROQ_API_KEY) {
    try {
      const prompt = `You are the AI Chief of Staff (Execution OS) for Gsouparno. 
      Analyze the current workload summary and compile a high-impact Daily Brief.
      Current Date: June 30, 2026.
      
      Missions summary:
      ${missionSummary}
      
      Total critical risk tasks: ${criticalCount}
      
      Respond STRICTLY with a JSON object in this format:
      {
        "summary": "short 3-sentence daily brief highlighting immediate bottlenecks",
        "recommendedAction": "single most impactful rescue recommendation"
      }`;

      const response = await callGroq({
        prompt,
        jsonMode: true
      });

      const responseText = (response.text || "").trim();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        // Fallback for potential raw quotes or markdown formatting
        console.warn("Initial JSON.parse failed, trying robust cleanup for Brief:", parseErr);
        let cleaned = responseText;
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
        }
        try {
          data = JSON.parse(cleaned);
        } catch (secondErr) {
          console.error("Robust fallback parsing also failed for Daily Brief:", secondErr);
        }
      }

      if (data.summary) summary = data.summary;
      if (data.recommendedAction) recommendedAction = data.recommendedAction;
    } catch (err) {
      console.error("AI Daily Brief generation failed:", err);
    }
  }

  res.json({
    date: "June 30, 2026",
    summary,
    criticalRisksCount: criticalCount,
    recommendedAction
  });
});

// Chat Sidebar with CoS
app.post("/api/ai/chat", async (req, res) => {
  const { messages, userRole } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  const openMissions = dbState.missions.filter(m => m.status !== 'completed');
  const membersStatus = dbState.members.map(m => `${m.name} (Level ${m.level}, Coins: ${m.coins}, Status: ${m.status}, On-Time: ${m.onTimeRate}%)`).join("\n");
  const missionSummary = openMissions.map(m => `- [${m.id}] ${m.title} (Assignee: ${dbState.members.find(mem => mem.id === m.assignedTo)?.name}, Risk: ${m.riskLevel}, Score: ${m.riskScore}%)`).join("\n");

  const systemInstruction = `You are "DeadlineX AI Chief of Staff" — a highly proactive, intelligent execution system.
  You are helping Gsouparno, a Manager on this platform.
  
  CURRENT CONTEXT:
  Active Date: June 30, 2026.
  Active User: Gsouparno (You), Manager.
  Team Status:
  ${membersStatus}
  
  Missions requiring execution:
  ${missionSummary}
  
  Your personality: Crisp, highly analytical, elite executive chief-of-staff. Use precise professional terminology. Do not apologize unnecessarily. Offer proactive solutions (delegation, split, template triggers, scheduling adjustments).
  Be helpful. If the user asks to plan a task, break it down and suggest assignees based on on-time rate and status.`;

  if (GROQ_API_KEY) {
    try {
      const groqMessages = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant' as const,
        content: m.content
      }));

      const response = await callGroq({
        messages: groqMessages,
        systemInstruction,
      });
      res.json({ response: response.text });
    } catch (err: any) {
      console.error("AI Chat failed:", err);
      res.status(500).json({ error: "AI response failed: " + err.message });
    }
  } else {
    // Robust local simulation fallback
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
    let reply = "Hello! I am your DeadlineX AI Chief of Staff. I am fully loaded and analyzing your workspace. ";
    if (lastUserMsg.includes("risk") || lastUserMsg.includes("overloaded") || lastUserMsg.includes("sarah")) {
      reply += "Analysis indicates Sarah Lin is currently overloaded with a critical risk score of 88% on the Beta deployment. I highly recommend applying the 'Delegate to Marcus' rescue action in the Missions tab to rebalance team velocity.";
    } else if (lastUserMsg.includes("schedule") || lastUserMsg.includes("calendar") || lastUserMsg.includes("time")) {
      reply += "Reviewing the team schedules: Marcus Vance has a clear workspace slot between 2:00 PM and 5:00 PM tomorrow. We can drag the Beta script verification into that slot.";
    } else if (lastUserMsg.includes("prioritize") || lastUserMsg.includes("plan")) {
      reply += "To structure a high-impact plan: First, isolate the CI/CD scripts. Second, spin off test coverage metrics. Third, utilize a pre-configured boilerplate configuration. This reduces delivery friction by 40%. Would you like me to construct this mission roadmap for you?";
    } else {
      reply += "I'm ready to help you coordinate. I can help draft project reports, calculate risk probabilities, reassign active bottlenecks, or configure crunch mode boosts. What is your immediate executive instruction?";
    }
    res.json({ response: reply });
  }
});

// Voice Command parsing (AI voice assistant)
app.post("/api/ai/voice", async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "Voice transcription command is required." });
  }

  let actionTaken = "";
  let answerText = "";

  if (GROQ_API_KEY) {
    try {
      const prompt = `You are the AI Chief of Staff voice assistant.
      The manager Gsouparno gave a voice instruction: "${command}"
      
      We can execute these structured operations in our system state:
      1. DELEGATE: "delegate-mission" (requires missionId, targetMemberId)
      2. EXTEND: "extend-deadline" (requires missionId)
      3. CRUNCH: "enable-crunch" (requires missionId)
      4. REPORT: "create-report" (general status review)
      5. UNKNOWN: "unknown-command"
      
      Identify the intent, extract parameters, and formulate a 1-sentence auditory response to read back to the user.
      
      Current database state for reference:
      Members: ${JSON.stringify(dbState.members.map(m=>({id:m.id, name:m.name})))}
      Missions: ${JSON.stringify(dbState.missions.map(m=>({id:m.id, title:m.title})))}
      
      Respond STRICTLY in JSON:
      {
        "intent": "delegate-mission" | "extend-deadline" | "enable-crunch" | "create-report" | "unknown-command",
        "params": { "missionId": "...", "memberId": "..." },
        "voiceReply": "Clear, auditory confirmation sentence."
      }`;

      const response = await callGroq({
        prompt,
        jsonMode: true
      });

      const responseText = (response.text || "").trim();
      let parsed: any = {};
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("Initial JSON.parse failed, trying robust cleanup for voice assistant:", parseErr);
        let cleaned = responseText;
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
        }
        try {
          parsed = JSON.parse(cleaned);
        } catch (secondErr) {
          console.error("Robust fallback parsing also failed for voice assistant:", secondErr);
        }
      }
      answerText = parsed.voiceReply || "Command successfully received.";
      
      // Execute the state change if parsed successfully!
      if (parsed.intent === 'delegate-mission' && parsed.params?.missionId && parsed.params?.memberId) {
        const mission = dbState.missions.find(m => m.id === parsed.params.missionId);
        const member = dbState.members.find(m => m.id === parsed.params.memberId);
        if (mission && member) {
          mission.assignedTo = member.id;
          actionTaken = `reassigned "${mission.title}" to ${member.name}`;
          logActivity("mem-1", "Souparno (You)", `[Voice Assistant] Reassigned "${mission.title}" to ${member.name}`, "mission_created");
        }
      } else if (parsed.intent === 'extend-deadline' && parsed.params?.missionId) {
        const mission = dbState.missions.find(m => m.id === parsed.params.missionId);
        if (mission) {
          const current = new Date(mission.deadline);
          current.setDate(current.getDate() + 1);
          mission.deadline = current.toISOString();
          actionTaken = `extended "${mission.title}" by 24 hours`;
          logActivity("mem-1", "Souparno (You)", `[Voice Assistant] Extended deadline for "${mission.title}"`, "rescue");
        }
      } else if (parsed.intent === 'enable-crunch' && parsed.params?.missionId) {
        const mission = dbState.missions.find(m => m.id === parsed.params.missionId);
        if (mission) {
          mission.activeCrunchMode = true;
          actionTaken = `activated crunch mode on "${mission.title}"`;
          logActivity("mem-1", "Souparno (You)", `[Voice Assistant] Activated crunch mode for "${mission.title}"`, "rescue");
        }
      }
    } catch (err) {
      console.error("Voice parsing failed:", err);
    }
  }

  if (!answerText) {
    // Heuristic voice fallback
    const cmd = command.toLowerCase();
    if (cmd.includes("delegate") || cmd.includes("assign")) {
      const targetM = dbState.members.find(m => cmd.includes(m.name.split(" ")[0].toLowerCase()));
      const targetMission = dbState.missions.find(m => m.id === "mis-1"); // Default to Beta launch for simulation
      if (targetM && targetMission) {
        targetMission.assignedTo = targetM.id;
        actionTaken = `reassigned "${targetMission.title}" to ${targetM.name}`;
        answerText = `Understood. I have delegated the Beta Launch deployment to ${targetM.name} to free up Sarah's schedule.`;
        logActivity("mem-1", "Souparno (You)", `[Voice Assistant] Reassigned Beta Launch to ${targetM.name}`, "mission_created");
      } else {
        answerText = "I heard your delegation request, but couldn't verify which team member or mission you meant.";
      }
    } else if (cmd.includes("crunch") || cmd.includes("focus")) {
      const targetMission = dbState.missions.find(m => m.id === "mis-1");
      if (targetMission) {
        targetMission.activeCrunchMode = true;
        actionTaken = "activated crunch mode";
        answerText = "Initializing Crunch Mode parameters. Snoozing calendar notifications and routing backup support.";
        logActivity("mem-1", "Souparno (You)", "[Voice Assistant] Crunch Mode initialized on Beta Launch", "rescue");
      }
    } else {
      answerText = "Command registered in execution dashboard. Let me know if you need to delegate tasks or extend sprint limits.";
    }
  }

  res.json({
    success: true,
    voiceReply: answerText,
    actionTaken,
    state: dbState
  });
});

// ==========================================
// VITE DEV MIDDLEWARE / STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DeadlineX server running on http://localhost:${PORT}`);
  });
}

startServer();
