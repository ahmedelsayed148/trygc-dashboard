export const CAMPAIGN_PHASES = [
  'Planning',
  'Briefing',
  'Activation',
  'Live',
  'Post-Campaign',
  'Closed',
] as const;

export const CAMPAIGN_STATUSES = [
  'Planning',
  'Active',
  'Paused',
  'Completed',
  'Archived',
] as const;

export const TASK_STATUSES = ['Pending', 'In Progress', 'Blocked', 'Done'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export type CampaignPhase = (typeof CAMPAIGN_PHASES)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type AssignmentMode = 'unassigned' | 'team' | 'person';

export interface OperationsTeam {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  defaultTasks: Array<{
    title: string;
    description: string;
    priority?: TaskPriority;
  }>;
}

export interface CampaignTeamTask {
  id: string;
  title: string;
  description: string;
  metricTarget: number;
  metricCON: number;
  metricCOV: number;
  teamId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignmentMode: AssignmentMode;
  assignedTeamId: string;
  assignedToName: string;
  assignedToEmail: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  criteria?: string;
  methodology?: string;
}

export interface CampaignTeamPlan {
  teamId: string;
  teamName: string;
  summary: string;
  tasks: CampaignTeamTask[];
}

export interface OpsCampaign {
  id: string;
  name: string;
  client: string;
  criteria: string;
  methodology: string;
  market: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  priority: TaskPriority;
  currentPhase: CampaignPhase;
  owner: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  teamPlans: CampaignTeamPlan[];
}

export interface FlattenedOperationalTask extends CampaignTeamTask {
  campaignId: string;
  campaign: string;
  campaignCriteria: string;
  campaignMethodology: string;
  campaignStatus: CampaignStatus;
  campaignPhase: CampaignPhase;
  teamName: string;
  assignedTo: string;
  assignedLabel: string;
  startDateTime: string;
  endDateTime?: string;
  slaHrs: number;
  metricCON: number;
  metricCOV: number;
  metricTarget: number;
  metricConfirmationToday: number;
}

type TaskAssignmentLike = Partial<
  Pick<CampaignTeamTask, 'assignmentMode' | 'assignedTeamId' | 'assignedToEmail' | 'assignedToName' | 'teamId'>
> & {
  assignedLabel?: string;
  assignedTo?: string;
};

export const MARKETS = ['EGY', 'KSA', 'KW', 'UAE', 'QAT', 'BH', 'OMAN', 'GCC', 'Regional'] as const;

export const OPERATIONS_TEAMS: OperationsTeam[] = [
  {
    id: 'inbound',
    name: 'Inbound',
    shortLabel: 'INB',
    description: 'Lead intake, complaints, and first-touch validation.',
    defaultTasks: [
      {
        title: 'Validate incoming pipeline',
        description: 'Review inbound leads, complaints, and referrals for campaign readiness.',
        priority: 'High',
      },
      {
        title: 'Confirm stakeholder readiness',
        description: 'Verify office, influencer, and client details required before execution.',
      },
    ],
  },
  {
    id: 'outbound',
    name: 'Outbound',
    shortLabel: 'OUT',
    description: 'Proactive activation, follow-up, and roster confirmation.',
    defaultTasks: [
      {
        title: 'Launch outbound activation',
        description: 'Reach out to campaign roster and confirm response targets.',
        priority: 'High',
      },
      {
        title: 'Follow up pending confirmations',
        description: 'Chase outstanding responses and escalate missing confirmations.',
      },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Live Chat',
    shortLabel: 'WA',
    description: 'WhatsApp and chat support execution with shield awareness.',
    defaultTasks: [
      {
        title: 'Prepare live chat playbook',
        description: 'Align replies, macros, and escalation paths for the campaign.',
      },
      {
        title: 'Monitor WhatsApp risk signals',
        description: 'Track message volume, complaints, and risky patterns during execution.',
        priority: 'High',
      },
    ],
  },
  {
    id: 'coverage',
    name: 'Coverage',
    shortLabel: 'COV',
    description: 'Slot coverage, roster sufficiency, and market support.',
    defaultTasks: [
      {
        title: 'Map campaign coverage',
        description: 'Confirm slot-to-influencer coverage and identify gaps by market.',
        priority: 'High',
      },
      {
        title: 'Fill coverage gaps',
        description: 'Source replacements and protect campaign delivery targets.',
      },
    ],
  },
  {
    id: 'coordination',
    name: 'Coordination',
    shortLabel: 'COORD',
    description: 'Cross-team orchestration, blockers, and daily alignment.',
    defaultTasks: [
      {
        title: 'Run campaign coordination cadence',
        description: 'Align all functions on milestones, dependencies, and daily actions.',
        priority: 'High',
      },
      {
        title: 'Resolve cross-team blockers',
        description: 'Track open blockers and drive ownership until closure.',
      },
    ],
  },
  {
    id: 'quality',
    name: 'Quality',
    shortLabel: 'QA',
    description: 'Audit quality, feedback loops, and coaching actions.',
    defaultTasks: [
      {
        title: 'Audit campaign interactions',
        description: 'Sample interactions across channels and score against quality standards.',
        priority: 'High',
      },
      {
        title: 'Close quality actions',
        description: 'Issue coaching items and confirm action completion with owners.',
      },
    ],
  },
  {
    id: 'acquisition',
    name: 'Acquisition',
    shortLabel: 'ACQ',
    description: 'Supply building, reactivation, and list creation.',
    defaultTasks: [
      {
        title: 'Refresh campaign sourcing pool',
        description: 'Build or refresh the list of qualified influencers for this campaign.',
        priority: 'High',
      },
      {
        title: 'Run reactivation segment',
        description: 'Reactivate relevant inactive profiles that match campaign criteria.',
      },
    ],
  },
  {
    id: 'post-campaign',
    name: 'Post-Campaign',
    shortLabel: 'POST',
    description: 'Wrap-up reporting, surveys, and retention follow-through.',
    defaultTasks: [
      {
        title: 'Prepare post-campaign reporting',
        description: 'Collect outputs, KPIs, and narrative for final reporting.',
        priority: 'High',
      },
      {
        title: 'Run feedback and NPS loop',
        description: 'Collect client and participant feedback and document actions.',
      },
    ],
  },
  {
    id: 'key-accounts',
    name: 'Key Accounts',
    shortLabel: 'KA',
    description: 'Client health, escalation handling, and upsell readiness.',
    defaultTasks: [
      {
        title: 'Manage client checkpoints',
        description: 'Keep key stakeholders updated and aligned on campaign expectations.',
        priority: 'High',
      },
      {
        title: 'Track commercial opportunities',
        description: 'Capture retention, upsell, or expansion opportunities from the campaign.',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    shortLabel: 'ANL',
    description: 'Measurement, pacing, and operational insight generation.',
    defaultTasks: [
      {
        title: 'Build campaign pacing view',
        description: 'Track campaign pacing versus target and highlight deviations.',
        priority: 'High',
      },
      {
        title: 'Publish performance insights',
        description: 'Share performance summaries and recommendations with operations leadership.',
      },
    ],
  },
];

export const ALL_TEAM_IDS = OPERATIONS_TEAMS.map((team) => team.id);

export function createId(prefix = 'op') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMetricValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function collectLegacyCampaignField(existingPlans: any[] | undefined, field: 'criteria' | 'methodology') {
  if (!Array.isArray(existingPlans)) {
    return '';
  }

  const values = existingPlans
    .flatMap((plan) => (Array.isArray(plan?.tasks) ? plan.tasks : []))
    .map((task) => (typeof task?.[field] === 'string' ? task[field].trim() : ''))
    .filter(Boolean);

  return [...new Set(values)].join('\n');
}

export function getTeamDefinition(teamId: string) {
  return OPERATIONS_TEAMS.find((team) => team.id === teamId);
}

export function getAssigneeLabel(task: CampaignTeamTask, fallbackTeamName?: string) {
  if (task.assignmentMode === 'person' && task.assignedToName) {
    return task.assignedToName;
  }

  if (task.assignmentMode === 'person' && task.assignedToEmail) {
    return task.assignedToEmail;
  }

  if (task.assignmentMode === 'team') {
    const assignedTeam = getTeamDefinition(task.assignedTeamId || task.teamId);
    return assignedTeam?.name || fallbackTeamName || 'Assigned Team';
  }

  return 'Unassigned';
}

export function createCampaignTask(teamId: string, seed?: Partial<CampaignTeamTask>): CampaignTeamTask {
  const now = new Date().toISOString();
  const nextTask: CampaignTeamTask = {
    id: seed?.id || createId('task'),
    title: seed?.title || 'New task',
    description: seed?.description || '',
    metricTarget: normalizeMetricValue(seed?.metricTarget),
    metricCON: normalizeMetricValue(seed?.metricCON),
    metricCOV: normalizeMetricValue(seed?.metricCOV),
    teamId,
    status: seed?.status || 'Pending',
    priority: seed?.priority || 'Medium',
    dueDate: seed?.dueDate || '',
    assignmentMode: seed?.assignmentMode || 'team',
    assignedTeamId: seed?.assignedTeamId || teamId,
    assignedToName: seed?.assignedToName || '',
    assignedToEmail: seed?.assignedToEmail || '',
    notes: seed?.notes || '',
    createdAt: seed?.createdAt || now,
    updatedAt: seed?.updatedAt || now,
  };

  if (seed?.criteria) {
    nextTask.criteria = seed.criteria;
  }

  if (seed?.methodology) {
    nextTask.methodology = seed.methodology;
  }

  return nextTask;
}

function normalizeAssigneeValue(value: string | undefined | null) {
  return value?.trim().toLowerCase() || '';
}

export function getTaskAssignedDisplay(
  task: TaskAssignmentLike,
  fallbackTeamName?: string,
) {
  if (task.assignedLabel) {
    return task.assignedLabel;
  }

  if (task.assignmentMode === 'person') {
    return task.assignedToName || task.assignedToEmail || task.assignedTo || 'Unassigned';
  }

  if (task.assignmentMode === 'team') {
    const assignedTeam = getTeamDefinition(task.assignedTeamId || task.teamId || '');
    return assignedTeam?.name || fallbackTeamName || task.assignedTo || 'Assigned Team';
  }

  return task.assignedTo || 'Unassigned';
}

export function isTaskAssignedToUser(
  task: TaskAssignmentLike,
  {
    userEmail,
    userName,
  }: {
    userEmail?: string | null;
    userName?: string | null;
  },
) {
  const candidates = [
    normalizeAssigneeValue(task.assignedToEmail),
    normalizeAssigneeValue(task.assignedToName),
    normalizeAssigneeValue(task.assignedTo),
    normalizeAssigneeValue(task.assignedLabel),
  ].filter(Boolean);

  const identities = [
    normalizeAssigneeValue(userEmail),
    normalizeAssigneeValue(userName),
  ].filter(Boolean);

  return identities.some((identity) => candidates.includes(identity));
}

export function buildTeamPlansForCampaign(
  campaignName: string,
  startDate = '',
  existingPlans?: any[],
): CampaignTeamPlan[] {
  return OPERATIONS_TEAMS.map((team) => {
    const existingPlan = existingPlans?.find((plan) => plan?.teamId === team.id);
    const existingTasks = Array.isArray(existingPlan?.tasks) ? existingPlan.tasks : [];
    const tasks = existingTasks.length > 0
      ? existingTasks.map((task: any) =>
          createCampaignTask(team.id, {
            ...task,
            teamId: team.id,
            assignedTeamId: task?.assignedTeamId || team.id,
          }),
        )
      : team.defaultTasks.map((template) =>
          createCampaignTask(team.id, {
            title: template.title,
            description: template.description.replace('{campaign}', campaignName),
            priority: template.priority || 'Medium',
            dueDate: startDate,
            assignmentMode: 'team',
            assignedTeamId: team.id,
          }),
        );

    return {
      teamId: team.id,
      teamName: team.name,
      summary: existingPlan?.summary || team.description,
      tasks,
    };
  });
}

export function createOpsCampaign(seed?: Partial<OpsCampaign>): OpsCampaign {
  const now = new Date().toISOString();
  const name = seed?.name || 'New Campaign';
  const startDate = seed?.startDate || '';
  const legacyCriteria = collectLegacyCampaignField(seed?.teamPlans, 'criteria');
  const legacyMethodology = collectLegacyCampaignField(seed?.teamPlans, 'methodology');

  return {
    id: seed?.id || createId('campaign'),
    name,
    client: seed?.client || '',
    criteria: seed?.criteria || legacyCriteria,
    methodology: seed?.methodology || legacyMethodology,
    market: seed?.market || 'EGY',
    budget: seed?.budget || 0,
    startDate,
    endDate: seed?.endDate || '',
    status: seed?.status || 'Planning',
    priority: seed?.priority || 'Medium',
    currentPhase: seed?.currentPhase || 'Planning',
    owner: seed?.owner || '',
    notes: seed?.notes || '',
    createdAt: seed?.createdAt || now,
    updatedAt: seed?.updatedAt || now,
    teamPlans: buildTeamPlansForCampaign(name, startDate, seed?.teamPlans),
  };
}

export function normalizeOpsCampaigns(rawCampaigns: any[] | undefined | null): OpsCampaign[] {
  if (!Array.isArray(rawCampaigns)) {
    return [];
  }

  return rawCampaigns.map((campaign) => {
    const normalized = createOpsCampaign({
      ...campaign,
      status: CAMPAIGN_STATUSES.includes(campaign?.status) ? campaign.status : 'Planning',
      priority: TASK_PRIORITIES.includes(campaign?.priority) ? campaign.priority : 'Medium',
      currentPhase: CAMPAIGN_PHASES.includes(campaign?.currentPhase) ? campaign.currentPhase : 'Planning',
      owner: campaign?.owner || campaign?.assignedAgent || '',
      criteria: campaign?.criteria || '',
      methodology: campaign?.methodology || '',
      notes: campaign?.notes || '',
      market: campaign?.market || 'EGY',
      teamPlans: campaign?.teamPlans,
    });

    return {
      ...normalized,
      teamPlans: buildTeamPlansForCampaign(normalized.name, normalized.startDate, campaign?.teamPlans),
    };
  });
}

export function flattenOperationalTasks(campaigns: OpsCampaign[]): FlattenedOperationalTask[] {
  return campaigns.flatMap((campaign) =>
    campaign.teamPlans.flatMap((plan) =>
      plan.tasks.map((task) => {
        const assignedLabel = getAssigneeLabel(task, plan.teamName);

        return {
          ...task,
          campaignId: campaign.id,
          campaign: campaign.name,
          campaignCriteria: campaign.criteria || '',
          campaignMethodology: campaign.methodology || '',
          campaignStatus: campaign.status,
          campaignPhase: campaign.currentPhase,
          teamName: plan.teamName,
          assignedTo: assignedLabel,
          assignedLabel,
          startDateTime: task.createdAt,
          endDateTime: task.status === 'Done' ? task.updatedAt : undefined,
          slaHrs: 24,
          metricCON: task.metricCON || 0,
          metricCOV: task.metricCOV || 0,
          metricTarget: task.metricTarget || 0,
          metricConfirmationToday: 0,
        };
      }),
    ),
  );
}

export function getCampaignProgress(campaign: OpsCampaign) {
  const tasks = campaign.teamPlans.flatMap((plan) => plan.tasks);
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === 'Done').length;
  const blocked = tasks.filter((task) => task.status === 'Blocked').length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    total,
    done,
    blocked,
    completionRate,
  };
}
