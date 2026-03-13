import {
  createCampaignTask,
  getAssigneeLabel,
  type CampaignTeamTask,
  type FlattenedOperationalTask,
  type TaskPriority,
} from './operations';

export const COMMUNITY_TEAM = {
  id: 'community',
  name: 'Community Team',
};

export const COUNTRIES = [
  { id: 'ksa', name: 'Saudi Arabia', nameAr: 'Saudi Arabia', marketCode: 'KSA' },
  { id: 'uae', name: 'United Arab Emirates', nameAr: 'United Arab Emirates', marketCode: 'UAE' },
  { id: 'kuwait', name: 'Kuwait', nameAr: 'Kuwait', marketCode: 'KWT' },
  { id: 'egypt', name: 'Egypt', nameAr: 'Egypt', marketCode: 'EGY' },
] as const;

const DEFAULT_COMMUNITY_TASKS: Array<{
  id: string;
  title: string;
  description: string;
  criteria: string;
  methodology: string;
  priority?: TaskPriority;
}> = [
  {
    id: 'add-influencers',
    title: 'Add New Influencers',
    description: 'Expand or refresh the approved creator pool for the market.',
    criteria: 'Profiles match category, market fit, quality standard, and availability.',
    methodology: 'Source prospects, validate fit, confirm readiness, then register approved profiles.',
    priority: 'High',
  },
  {
    id: 'calling-influencers',
    title: 'Calling Influencers',
    description: 'Run outreach to active and target creators for campaign readiness.',
    criteria: 'Priority creators are identified with call goals and response expectations.',
    methodology: 'Contact the list, capture outcomes, flag risks, and schedule the next touchpoint.',
  },
  {
    id: 'check-campaigns',
    title: 'Check Campaign Status',
    description: 'Review every live or pending campaign the market is supporting.',
    criteria: 'Current phase, blockers, owner, and next milestone are all visible.',
    methodology: 'Audit the campaign queue, update statuses, and escalate anything off-track.',
    priority: 'High',
  },
  {
    id: 'check-confirmations',
    title: 'Check Confirmations',
    description: 'Validate creator confirmations against the required roster.',
    criteria: 'All required creators are confirmed or have a clear follow-up action.',
    methodology: 'Compare roster versus confirmations, chase gaps, and log remaining dependencies.',
  },
  {
    id: 'check-missing',
    title: 'Check Missing Coverage',
    description: 'Identify missing slots, weak markets, or channel coverage gaps.',
    criteria: 'Coverage gaps are measurable and tied to market needs.',
    methodology: 'Review the roster map, isolate missing coverage, and assign replacement actions.',
    priority: 'High',
  },
  {
    id: 'check-remaining',
    title: 'Check Remaining Work',
    description: 'Audit the outstanding work required to keep the market on plan.',
    criteria: 'Open tasks have owners, status, and due dates.',
    methodology: 'Review leftovers, regroup priorities, and hand off pending actions clearly.',
  },
  {
    id: 'client-meeting',
    title: 'Client Meeting',
    description: 'Prepare or support the client-facing market sync.',
    criteria: 'Agenda, talking points, risks, and decisions are documented before the meeting.',
    methodology: 'Prepare notes, align stakeholders, run the meeting, then capture actions.',
    priority: 'High',
  },
  {
    id: 'campaign-report',
    title: 'Campaign Report Review',
    description: 'Review market reporting quality, pacing, and narrative.',
    criteria: 'Report reflects the latest delivery, risks, and market-specific insight.',
    methodology: 'Check source data, validate the summary, then publish corrections or approvals.',
  },
  {
    id: 'create-plan',
    title: 'Create A Plan',
    description: 'Create the market-level execution plan for the next cycle.',
    criteria: 'Scope, owner, timing, and success indicators are defined.',
    methodology: 'Break the work into steps, assign owners, and lock the delivery rhythm.',
    priority: 'High',
  },
  {
    id: 'daily-ops',
    title: 'Daily Ops Meeting',
    description: 'Run the daily market operations checkpoint.',
    criteria: 'The meeting covers blockers, delivery status, and required decisions.',
    methodology: 'Use the latest task view, capture actions live, and confirm ownership before close.',
  },
  {
    id: 'generate-leads',
    title: 'Generate New Leads',
    description: 'Generate new creator or opportunity leads relevant to the market.',
    criteria: 'Leads match target categories and are viable for near-term activation.',
    methodology: 'Source, qualify, de-duplicate, and hand over the validated lead list.',
  },
  {
    id: 'generate-list',
    title: 'Generate New List',
    description: 'Produce a fresh market list for activation, backup, or pitching.',
    criteria: 'List quality meets market brief, audience fit, and readiness standards.',
    methodology: 'Build the list, verify core data, and publish the final version with notes.',
  },
  {
    id: 'quotations',
    title: 'Quotations Sent',
    description: 'Prepare and send quotations that depend on market community inputs.',
    criteria: 'Pricing assumptions, roster, and scope are aligned before sending.',
    methodology: 'Validate inputs, prepare the quotation, send it, and track the response.',
  },
  {
    id: 'create-brief',
    title: 'Create Brief',
    description: 'Draft the market-ready brief for community execution.',
    criteria: 'The brief is clear on targeting, deliverables, and decision rules.',
    methodology: 'Compile context, define requirements, review internally, then publish.',
    priority: 'High',
  },
  {
    id: 'update-report',
    title: 'Update Ongoing Report',
    description: 'Keep the ongoing market report current during execution.',
    criteria: 'Updates reflect the latest status, issue log, and completed actions.',
    methodology: 'Refresh data, summarize changes, and circulate the updated version.',
  },
  {
    id: 'reply-whatsapp',
    title: 'Reply on All WhatsApp',
    description: 'Close pending WhatsApp replies for community operations.',
    criteria: 'No critical creator or client message is waiting without an owner.',
    methodology: 'Review pending threads, answer or escalate, and confirm closure in the log.',
  },
];

export type CountryDefinition = (typeof COUNTRIES)[number];

export interface CommunityCountryPlan {
  id: string;
  name: string;
  nameAr: string;
  marketCode: string;
  summary: string;
  managerName: string;
  managerEmail: string;
  tasks: CampaignTeamTask[];
}

export interface CommunityWorkspace {
  countries: CommunityCountryPlan[];
  updatedAt: string;
  version: number;
}

function createDefaultTask(country: CountryDefinition, template: (typeof DEFAULT_COMMUNITY_TASKS)[number]) {
  return createCampaignTask(COMMUNITY_TEAM.id, {
    id: `community-${country.id}-${template.id}`,
    title: template.title,
    description: template.description,
    criteria: template.criteria,
    methodology: template.methodology,
    priority: template.priority || 'Medium',
    assignmentMode: 'unassigned',
    assignedTeamId: '',
  });
}

export function createDefaultCountryPlan(country: CountryDefinition): CommunityCountryPlan {
  return {
    id: country.id,
    name: country.name,
    nameAr: country.nameAr,
    marketCode: country.marketCode,
    summary: `Community execution plan for ${country.name}.`,
    managerName: '',
    managerEmail: '',
    tasks: DEFAULT_COMMUNITY_TASKS.map((template) => createDefaultTask(country, template)),
  };
}

export function createEmptyCommunityWorkspace(): CommunityWorkspace {
  return {
    version: 1,
    updatedAt: '',
    countries: COUNTRIES.map(createDefaultCountryPlan),
  };
}

function normalizeCountryPlan(country: CountryDefinition, seed?: Partial<CommunityCountryPlan>): CommunityCountryPlan {
  const fallback = createDefaultCountryPlan(country);
  const seededTasks = Array.isArray(seed?.tasks) ? seed.tasks : [];

  return {
    ...fallback,
    summary: seed?.summary || fallback.summary,
    managerName: seed?.managerName || '',
    managerEmail: seed?.managerEmail || '',
    tasks:
      seededTasks.length > 0
        ? seededTasks.map((task) =>
            createCampaignTask(COMMUNITY_TEAM.id, {
              ...task,
              teamId: COMMUNITY_TEAM.id,
              assignedTeamId: task.assignmentMode === 'team' ? COMMUNITY_TEAM.id : task.assignedTeamId || '',
            }),
          )
        : fallback.tasks,
  };
}

function convertLegacyCommunityData(raw: any): CommunityWorkspace {
  const assignments = raw?.assignments || {};
  const checked = raw?.checked || {};
  const notes = raw?.notes || {};
  const customLabels = raw?.customLabels || {};
  const managerAssignees = raw?.managerAssignees || {};

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    countries: COUNTRIES.map((country) => ({
      ...createDefaultCountryPlan(country),
      managerName: managerAssignees[country.id] || '',
      tasks: DEFAULT_COMMUNITY_TASKS.map((template) => {
        const key = `${country.id}-${template.id}`;
        const assigneeName = assignments[key] || '';

        return createCampaignTask(COMMUNITY_TEAM.id, {
          id: `community-${country.id}-${template.id}`,
          title: customLabels[key] || template.title,
          description: template.description,
          criteria: template.criteria,
          methodology: template.methodology,
          priority: template.priority || 'Medium',
          status: checked[key] ? 'Done' : 'Pending',
          assignmentMode: assigneeName ? 'person' : 'unassigned',
          assignedTeamId: '',
          assignedToName: assigneeName,
          notes: notes[key] || '',
        });
      }),
    })),
  };
}

export function normalizeCommunityWorkspace(raw: any): CommunityWorkspace {
  if (Array.isArray(raw?.countries)) {
    return {
      version: raw?.version || 1,
      updatedAt: raw?.updatedAt || '',
      countries: COUNTRIES.map((country) => {
        const match = raw.countries.find((item: any) => item?.id === country.id || item?.marketCode === country.marketCode);
        return normalizeCountryPlan(country, match);
      }),
    };
  }

  return convertLegacyCommunityData(raw || {});
}

export function flattenCommunityWorkspaceTasks(workspace: CommunityWorkspace): FlattenedOperationalTask[] {
  return workspace.countries.flatMap((country) =>
    country.tasks.map((task) => {
      const assignedLabel = getAssigneeLabel(task, COMMUNITY_TEAM.name);

      return {
        ...task,
        campaignId: `community-${country.id}`,
        campaign: `Community - ${country.name}`,
        campaignStatus: 'Active',
        campaignPhase: 'Activation',
        teamName: COMMUNITY_TEAM.name,
        assignedTo: assignedLabel,
        assignedLabel,
        startDateTime: task.createdAt,
        endDateTime: task.status === 'Done' ? task.updatedAt : undefined,
        slaHrs: 24,
        metricCON: 0,
        metricCOV: 0,
        metricTarget: 0,
        metricConfirmationToday: 0,
      };
    }),
  );
}
