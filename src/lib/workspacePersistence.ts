export const WORKSPACE_STORAGE_KEYS = {
  campaignIntakes: 'trygc-campaign-intakes',
  communityWorkspace: 'trygc-community-workspace',
  coverageRecords: 'trygc-coverage-records',
  disabledTeams: 'trygc-disabled-teams',
  demoCompleted: 'trygc-demo-completed',
  linkWidgets: 'trygc-link-widgets',
  mistakes: 'trygc-mistakes',
  opsCampaigns: 'trygc-ops-campaigns',
  organizedUpdates: 'trygc-organized-updates',
  shiftHandovers: 'trygc-shift-handovers',
  sidebarCollapsed: 'trygc-sidebar-collapsed',
  successLogs: 'trygc-success-logs',
  taskNotifications: 'trygc-task-notifications',
  tasks: 'trygc-tasks',
  tasksPerTeam: 'trygc-tasks-per-team',
} as const;

type PersistableWorkspaceSnapshot = {
  campaignIntakes: unknown;
  communityWorkspace: unknown;
  coverageRecords: unknown;
  linkWidgets: unknown;
  mistakes: unknown;
  opsCampaigns: unknown;
  organizedUpdates: unknown;
  shiftHandovers: unknown;
  standaloneTasks: unknown;
  successLogs: unknown;
  taskNotifications: unknown;
  tasks: unknown;
  tasksPerTeam: unknown;
  userEmail: string;
};

export function getStandaloneTasksStorageKey(userEmail: string) {
  return `trygc-standalone-tasks:${userEmail}`;
}

export function readStoredWorkspaceRecords<T = unknown>(key: string) {
  if (typeof window === 'undefined') {
    return [] as T[];
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return [] as T[];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? (parsed as T[]) : ([] as T[]);
  } catch {
    return [] as T[];
  }
}

export function readStoredWorkspaceObject<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function writeStoredWorkspaceValue(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore local storage write failures and keep the in-memory workspace active.
  }
}

export function persistWorkspaceSnapshot(snapshot: PersistableWorkspaceSnapshot) {
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.tasks, snapshot.tasks);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.taskNotifications, snapshot.taskNotifications);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.tasksPerTeam, snapshot.tasksPerTeam);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.opsCampaigns, snapshot.opsCampaigns);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.campaignIntakes, snapshot.campaignIntakes);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.organizedUpdates, snapshot.organizedUpdates);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.linkWidgets, snapshot.linkWidgets);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.shiftHandovers, snapshot.shiftHandovers);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.coverageRecords, snapshot.coverageRecords);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.successLogs, snapshot.successLogs);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.mistakes, snapshot.mistakes);
  writeStoredWorkspaceValue(WORKSPACE_STORAGE_KEYS.communityWorkspace, snapshot.communityWorkspace);

  if (snapshot.userEmail) {
    writeStoredWorkspaceValue(getStandaloneTasksStorageKey(snapshot.userEmail), snapshot.standaloneTasks);
  }
}

export function mergeWorkspaceRecords<T extends { id: string; updatedAt?: string }>(primary: T[], secondary: T[]) {
  const merged = new Map<string, T>();

  [...secondary, ...primary].forEach((item) => {
    const existing = merged.get(item.id);

    if (!existing) {
      merged.set(item.id, item);
      return;
    }

    const existingTime = new Date(existing.updatedAt || 0).getTime();
    const nextTime = new Date(item.updatedAt || 0).getTime();
    merged.set(item.id, nextTime >= existingTime ? item : existing);
  });

  return [...merged.values()].sort(
    (left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime(),
  );
}

export function mergeWorkspaceRecordsByIdentity<T extends { id?: string | number; updatedAt?: string }>(
  primary: T[],
  secondary: T[],
) {
  const primaryMap = new Map<string, T>(primary.map((item) => [String(item.id), item]));
  const result = [...primary];

  for (const item of secondary) {
    const key = String(item.id);
    const existing = primaryMap.get(key);

    if (!existing) {
      result.push(item);
      continue;
    }

    const existingTime = new Date(existing.updatedAt || 0).getTime();
    const itemTime = new Date(item.updatedAt || 0).getTime();

    if (itemTime > existingTime) {
      const index = result.findIndex((candidate) => String(candidate.id) === key);
      if (index !== -1) {
        result[index] = item;
      }
    }
  }

  return result;
}
