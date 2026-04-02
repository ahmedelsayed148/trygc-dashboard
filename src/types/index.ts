export type UserRole = 'owner' | 'admin' | 'member';

export type CampaignPhase = 'Planning' | 'Briefing' | 'Activation' | 'Live' | 'Post-Campaign' | 'Closed';
export type CampaignStatus = 'Planning' | 'Active' | 'Paused' | 'Completed' | 'Archived';
export type TaskStatus = 'Pending' | 'In Progress' | 'Blocked' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export const OPS_TEAMS = [
  'Inbound', 'Outbound', 'WhatsApp Live Chat', 'Coverage', 'Coordination',
  'Quality', 'Acquisition', 'Post-Campaign', 'Key Accounts', 'Analytics',
] as const;
export type OpsTeam = typeof OPS_TEAMS[number];

export const COMMUNITY_MARKETS = ['Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Egypt'] as const;
export type CommunityMarket = typeof COMMUNITY_MARKETS[number];

export const COMMUNITY_TASKS = [
  'Add New Influencers', 'Calling Influencers', 'Check Campaign Status',
  'Check Confirmations', 'Check Missing Coverage', 'Check Remaining Work',
  'Client Meeting', 'Campaign Report Review', 'Create A Plan',
  'Daily Ops Meeting', 'Generate New Leads', 'Generate New List',
  'Quotations Sent', 'Create Brief', 'Update Ongoing Report', 'Reply on All WhatsApp',
] as const;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  features: string[];
  demoCompleted: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  client: string;
  phase: CampaignPhase;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget?: number;
  description: string;
  teamPlan: TeamPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamPlanItem {
  team: OpsTeam;
  tasks: string[];
  lead?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  criteria: string;
  methodology: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  assignmentMode: 'team' | 'person';
  assignedTeam?: OpsTeam;
  assignedPerson?: string;
  campaignId?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityWorkspace {
  country: CommunityMarket;
  manager: string;
  summary: string;
  tasks: CommunityTask[];
  progress: number;
}

export interface CommunityTask {
  id: string;
  name: string;
  status: TaskStatus;
  assignee?: string;
  notes: string;
  updatedAt: string;
}

export interface CampaignIntake {
  id: string;
  campaignName: string;
  clientName: string;
  startDate: string;
  endDate: string;
  budget: string;
  objectives: string;
  notes: string;
  createdAt: string;
}

export interface OrganizedUpdate {
  id: string;
  rawText: string;
  formattedText: string;
  translatedText?: string;
  category: string;
  createdAt: string;
}

export interface ShiftHandover {
  id: string;
  shiftDate: string;
  author: string;
  completedTasks: string[];
  pendingTasks: string[];
  escalations: string[];
  notes: string;
  broadcastSummary: string;
  createdAt: string;
}

export interface LinkWidget {
  id: string;
  title: string;
  url: string;
  category: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

export interface CoverageRecord {
  id: string;
  influencer: string;
  platform: string;
  campaignId: string;
  campaignName: string;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected';
  link?: string;
  notes: string;
  submittedAt?: string;
  createdAt: string;
}

export interface SuccessLog {
  id: string;
  title: string;
  description: string;
  campaignId?: string;
  author: string;
  createdAt: string;
}

export interface TaskNotification {
  id: string;
  type: 'overdue' | 'done' | 'blocked' | 'assigned' | 'success';
  title: string;
  message: string;
  read: boolean;
  taskId?: string;
  createdAt: string;
}

export interface MistakeLog {
  id: string;
  title: string;
  description: string;
  campaignId?: string;
  team?: OpsTeam;
  severity: Priority;
  resolved: boolean;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  teamMembers: User[];
  campaigns: Campaign[];
  tasks: Task[];
  communityWorkspaces: CommunityWorkspace[];
  campaignIntakes: CampaignIntake[];
  updates: OrganizedUpdate[];
  widgets: LinkWidget[];
  handovers: ShiftHandover[];
  coverageRecords: CoverageRecord[];
  successLogs: SuccessLog[];
  notifications: TaskNotification[];
  mistakes: MistakeLog[];
  saveState: 'saved' | 'saving' | 'unsaved' | 'error';
  syncState: 'synced' | 'syncing' | 'offline' | 'error';
  lastSaved: string | null;
}
