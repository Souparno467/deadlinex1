export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned';
export type RescueType = 'delegate' | 'split_task' | 'extend_deadline' | 'templates' | 'crunch_mode';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RescueAction {
  id: string;
  type: RescueType;
  title: string;
  description: string;
  xpPenalty: number;
  coinCost: number;
  applied: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO string or date string
  assignedTo: string; // Member ID
  assignedByName: string; // Manager Name
  status: MissionStatus;
  priority: PriorityLevel;
  xpReward: number;
  coinReward: number;
  riskScore: number; // 0 - 100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskExplanation: string;
  etc?: number; // Estimated Time to Complete in hours
  subtasks: Subtask[];
  creationDate: string;
  delegatedFrom?: string; // Member ID if delegated
  tags: string[];
  rescueActions: RescueAction[];
  activeCrunchMode?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'employee';
  avatar: string;
  xp: number;
  level: number;
  coins: number;
  completedMissions: number;
  onTimeRate: number; // e.g., 95 for 95%
  status: 'active' | 'overloaded' | 'offline' | 'crunching';
  email: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  coinCost: number;
  iconName: string;
  category: 'productivity' | 'fun' | 'break';
}

export interface DailyBrief {
  date: string;
  summary: string;
  criticalRisksCount: number;
  recommendedAction: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  memberId: string;
  memberName: string;
  action: string;
  type: 'completion' | 'xp' | 'rescue' | 'mission_created' | 'coin';
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // 'YYYY-MM-DD HH:MM'
  end: string;
  missionId?: string;
  isMeeting?: boolean;
}

export interface MissionTemplate {
  id: string;
  name: string; // The user-friendly template name
  title: string;
  description: string;
  priority: PriorityLevel;
  etc: string;
  tags: string[];
  subtasks: string[];
}

