"use client";

import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, RefreshCw, Trophy, UploadCloud, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { ThemeProvider } from './ThemeProvider';
import { Toaster } from './ui/sonner';
import { ConfigurationProvider } from '../context/ConfigurationContext';
import { supabase } from './supabaseClient';
import { Login } from './Login';
import { CommandPalette } from './CommandPalette';
import { apiRequest, type WorkspaceDataResponse } from '../lib/api';
import {
  flattenOperationalTasks,
  normalizeOpsCampaigns,
  type AssignmentMode,
  type OpsCampaign,
  type TaskPriority,
  type TaskStatus,
} from '../lib/operations';
import {
  createEmptyCommunityWorkspace,
  flattenCommunityWorkspaceTasks,
  normalizeCommunityWorkspace,
  type CommunityWorkspace,
} from '../lib/communityWorkspace';
import {
  type CampaignIntakeRecord,
  type LinkWidgetRecord,
  type OrganizedUpdateRecord,
  type ShiftHandoverRecord,
  normalizeCampaignIntakeRecords,
  normalizeLinkWidgetRecords,
  normalizeOrganizedUpdateRecords,
  normalizeShiftHandoverRecords,
} from '../lib/workspaceTools';
import { normalizeCoverageRecords, type CoverageRecord } from '../lib/coverageTypes';
import { getCurrentNavItem } from '../lib/navigation';
import { useLocation, useNavigate } from '../lib/routerCompat';
import { getRouteComponent, getRouteRedirect } from '../routes';
import {
  WORKSPACE_STORAGE_KEYS,
  getStandaloneTasksStorageKey,
  mergeWorkspaceRecords,
  mergeWorkspaceRecordsByIdentity,
  persistWorkspaceSnapshot,
  readStoredWorkspaceObject,
  readStoredWorkspaceRecords,
  writeStoredWorkspaceValue,
} from '../lib/workspacePersistence';
import { useRealtimeWorkspaceAlerts } from '../hooks/use-realtime-workspace-alerts';
import { createSuccessAlertPayload, publishWorkspaceAlert } from '../lib/realtimeAlerts';
import type { User as AppUser } from '../types';

type WorkspaceRecord = {
  id?: string | number;
  updatedAt?: string;
  [key: string]: unknown;
};

type TaskRecord = {
  id: number | string;
  description: string;
  campaign: string;
  assignedTo: string;
  priority: string;
  status: string;
  category: string;
  slaHrs: number;
  startDateTime: string;
  endDateTime?: string;
  teamId?: string;
  name?: string;
  [key: string]: unknown;
};

type SuccessRecord = {
  id?: string | number;
  title?: string;
  detail?: string;
  agent?: string;
  campaign?: string;
  date?: string;
  time?: string;
  timestamp?: string;
  [key: string]: unknown;
};

type NotificationRecord = {
  id?: string | number;
  assignedTo?: string;
  [key: string]: unknown;
};

type MistakeRecord = {
  id: string;
  taskId: string | number;
  taskDescription: string;
  campaign: string;
  team: string;
  mistakeDescription: string;
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
};

type StandaloneTaskRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  teamId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignmentMode: AssignmentMode;
  assignedToName: string;
  assignedToEmail: string;
  notes: string;
  linkedCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

type WorkspaceSnapshot = {
  tasks: TaskRecord[];
  successLogs: SuccessRecord[];
  taskNotifications: NotificationRecord[];
  mistakes: MistakeRecord[];
  tasksPerTeam: Record<string, WorkspaceRecord>;
  opsCampaigns: OpsCampaign[];
  communityWorkspace: CommunityWorkspace;
  campaignIntakes: CampaignIntakeRecord[];
  organizedUpdates: OrganizedUpdateRecord[];
  linkWidgets: LinkWidgetRecord[];
  shiftHandovers: ShiftHandoverRecord[];
  coverageRecords: CoverageRecord[];
  standaloneTasks: StandaloneTaskRecord[];
};

type TeamMemberRecord = AppUser;
type SessionLike = { user: { email?: string; user_metadata?: { name?: string } } };

type AppContextValue = {
  tasks: TaskRecord[];
  setTasks: (value: React.SetStateAction<TaskRecord[]>) => void;
  successLogs: SuccessRecord[];
  setSuccessLogs: (value: React.SetStateAction<SuccessRecord[]>) => void;
  taskNotifications: NotificationRecord[];
  setTaskNotifications: (value: React.SetStateAction<NotificationRecord[]>) => void;
  mistakes: MistakeRecord[];
  setMistakes: (value: React.SetStateAction<MistakeRecord[]>) => void;
  userEmail: string;
  userName: string;
  userRole: 'admin' | 'member' | null;
  isAdmin: boolean;
  teamMembers: TeamMemberRecord[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMemberRecord[]>>;
  refreshTeamMembers: () => Promise<void>;
  isLoading: boolean;
  fetchError: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  lastSyncError: string | null;
  refreshWorkspaceData: () => Promise<void>;
  userFeatures: string[] | null;
  setUserFeatures: React.Dispatch<React.SetStateAction<string[] | null>>;
  tasksPerTeam: Record<string, WorkspaceRecord>;
  setTasksPerTeam: (value: React.SetStateAction<Record<string, WorkspaceRecord>>) => void;
  opsCampaigns: OpsCampaign[];
  setOpsCampaigns: (value: React.SetStateAction<OpsCampaign[]>) => void;
  communityWorkspace: CommunityWorkspace;
  setCommunityWorkspace: (value: React.SetStateAction<CommunityWorkspace>) => void;
  campaignIntakes: CampaignIntakeRecord[];
  setCampaignIntakes: (value: React.SetStateAction<CampaignIntakeRecord[]>) => void;
  organizedUpdates: OrganizedUpdateRecord[];
  setOrganizedUpdates: (value: React.SetStateAction<OrganizedUpdateRecord[]>) => void;
  linkWidgets: LinkWidgetRecord[];
  setLinkWidgets: (value: React.SetStateAction<LinkWidgetRecord[]>) => void;
  shiftHandovers: ShiftHandoverRecord[];
  setShiftHandovers: (value: React.SetStateAction<ShiftHandoverRecord[]>) => void;
  coverageRecords: CoverageRecord[];
  setCoverageRecords: (value: React.SetStateAction<CoverageRecord[]>) => void;
  operationalTasks: TaskRecord[];
  standaloneTasks: StandaloneTaskRecord[];
  setStandaloneTasks: (value: React.SetStateAction<StandaloneTaskRecord[]>) => void;
  demoCompleted: boolean | null;
  setDemoCompleted: React.Dispatch<React.SetStateAction<boolean | null>>;
  disabledTeams: string[];
  setDisabledTeams: React.Dispatch<React.SetStateAction<string[]>>;
  openCommandPalette: () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = React.createContext<AppContextValue | null>(null);

const LazyXlsxUploader = React.lazy(() =>
  import('./XlsxUploader').then((module) => ({ default: module.XlsxUploader })),
);

function resolveStateUpdate<T>(value: React.SetStateAction<T>, current: T): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(current) : value;
}

function hasRecords(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function hasObjectValues(value: unknown) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length > 0;
}

function preferLocalRecords<T>(remote: T[], local: T[]) {
  return hasRecords(remote) || !hasRecords(local) ? remote : local;
}

function preferLocalObject<T extends Record<string, WorkspaceRecord>>(remote: T, local: T) {
  return hasObjectValues(remote) || !hasObjectValues(local) ? remote : local;
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest">Loading…</span>
      </div>
    </div>
  );
}

export function Root() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [userFeatures, setUserFeatures] = useState<string[] | null>(null);

  const [tasks, setTasks] = useState<TaskRecord[]>(() => readStoredWorkspaceRecords<TaskRecord>(WORKSPACE_STORAGE_KEYS.tasks));
  const [successLogs, setSuccessLogs] = useState<SuccessRecord[]>(() => readStoredWorkspaceRecords<SuccessRecord>(WORKSPACE_STORAGE_KEYS.successLogs));
  const [taskNotifications, setTaskNotifications] = useState<NotificationRecord[]>(() => readStoredWorkspaceRecords<NotificationRecord>(WORKSPACE_STORAGE_KEYS.taskNotifications));
  const [mistakes, setMistakes] = useState<MistakeRecord[]>(() => readStoredWorkspaceRecords<MistakeRecord>(WORKSPACE_STORAGE_KEYS.mistakes));
  const [tasksPerTeam, setTasksPerTeam] = useState<Record<string, WorkspaceRecord>>(() =>
    readStoredWorkspaceObject<Record<string, WorkspaceRecord>>(WORKSPACE_STORAGE_KEYS.tasksPerTeam, {}),
  );
  const [opsCampaigns, setOpsCampaigns] = useState<OpsCampaign[]>(() => normalizeOpsCampaigns(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.opsCampaigns)));
  const [communityWorkspace, setCommunityWorkspace] = useState<CommunityWorkspace>(() => {
    const stored = readStoredWorkspaceObject(WORKSPACE_STORAGE_KEYS.communityWorkspace, null);
    return stored ? normalizeCommunityWorkspace(stored) : createEmptyCommunityWorkspace();
  });
  const [campaignIntakes, setCampaignIntakes] = useState<CampaignIntakeRecord[]>(() => normalizeCampaignIntakeRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.campaignIntakes)));
  const [organizedUpdates, setOrganizedUpdates] = useState<OrganizedUpdateRecord[]>(() => normalizeOrganizedUpdateRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.organizedUpdates)));
  const [linkWidgets, setLinkWidgets] = useState<LinkWidgetRecord[]>(() => normalizeLinkWidgetRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.linkWidgets)));
  const [shiftHandovers, setShiftHandovers] = useState<ShiftHandoverRecord[]>(() => normalizeShiftHandoverRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.shiftHandovers)));
  const [coverageRecords, setCoverageRecords] = useState<CoverageRecord[]>(() => normalizeCoverageRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.coverageRecords)));
  const [demoCompleted, setDemoCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [connectionState, setConnectionState] = useState<'idle' | 'loading' | 'online' | 'syncing' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(WORKSPACE_STORAGE_KEYS.sidebarCollapsed) === 'true'; } catch { return false; }
  });
  const [isXlsxUploaderOpen, setIsXlsxUploaderOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [successData, setSuccessData] = useState({ title: '', detail: '', campaign: '' });
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [lastPersistedRevision, setLastPersistedRevision] = useState(0);
  const [communityRevision, setCommunityRevision] = useState(0);
  const [lastPersistedCommunityRevision, setLastPersistedCommunityRevision] = useState(0);

  const hasInitialNavigated = useRef(false);
  const refreshRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const workspaceRevisionRef = useRef(0);
  const communityRevisionRef = useRef(0);
  const communityWorkspaceRef = useRef<CommunityWorkspace>(createEmptyCommunityWorkspace());
  const workspaceSyncPayloadRef = useRef({
    tasks: [] as TaskRecord[],
    successLogs: [] as SuccessRecord[],
    taskNotifications: [] as NotificationRecord[],
    mistakes: [] as MistakeRecord[],
    tasksPerTeam: {} as Record<string, WorkspaceRecord>,
    opsCampaigns: [] as OpsCampaign[],
    campaignIntakes: [] as CampaignIntakeRecord[],
    organizedUpdates: [] as OrganizedUpdateRecord[],
    linkWidgets: [] as LinkWidgetRecord[],
    shiftHandovers: [] as ShiftHandoverRecord[],
    coverageRecords: [] as CoverageRecord[],
    standaloneTasks: [] as StandaloneTaskRecord[],
  });
  const isAdmin = userRole === 'admin';
  const RouteComponent = useMemo(() => getRouteComponent(pathname), [pathname]);
  const currentNavItem = useMemo(() => getCurrentNavItem(pathname), [pathname]);
  const routeRedirect = useMemo(() => getRouteRedirect(pathname), [pathname]);

  useEffect(() => {
    workspaceRevisionRef.current = workspaceRevision;
  }, [workspaceRevision]);

  useEffect(() => {
    communityRevisionRef.current = communityRevision;
  }, [communityRevision]);

  useEffect(() => {
    communityWorkspaceRef.current = communityWorkspace;
  }, [communityWorkspace]);

  const markWorkspaceDirty = useCallback(() => {
    setWorkspaceRevision((current) => current + 1);
  }, []);

  const markCommunityDirty = useCallback(() => {
    setCommunityRevision((current) => current + 1);
  }, []);

  const updateTasks = useCallback((value: React.SetStateAction<TaskRecord[]>) => {
    setTasks((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateSuccessLogs = useCallback((value: React.SetStateAction<SuccessRecord[]>) => {
    setSuccessLogs((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateTaskNotifications = useCallback((value: React.SetStateAction<NotificationRecord[]>) => {
    setTaskNotifications((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateMistakes = useCallback((value: React.SetStateAction<MistakeRecord[]>) => {
    setMistakes((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateTasksPerTeam = useCallback((value: React.SetStateAction<Record<string, WorkspaceRecord>>) => {
    setTasksPerTeam((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateOpsCampaigns = useCallback((value: React.SetStateAction<OpsCampaign[]>) => {
    setOpsCampaigns((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateCommunityWorkspace = useCallback((value: React.SetStateAction<CommunityWorkspace>) => {
    setCommunityWorkspace((current) => resolveStateUpdate(value, current));
    markCommunityDirty();
  }, [markCommunityDirty]);

  const updateCampaignIntakes = useCallback((value: React.SetStateAction<CampaignIntakeRecord[]>) => {
    setCampaignIntakes((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateOrganizedUpdates = useCallback((value: React.SetStateAction<OrganizedUpdateRecord[]>) => {
    setOrganizedUpdates((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateLinkWidgets = useCallback((value: React.SetStateAction<LinkWidgetRecord[]>) => {
    setLinkWidgets((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateShiftHandovers = useCallback((value: React.SetStateAction<ShiftHandoverRecord[]>) => {
    setShiftHandovers((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateCoverageRecords = useCallback((value: React.SetStateAction<CoverageRecord[]>) => {
    setCoverageRecords((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const [standaloneTasks, setStandaloneTasksState] = useState<StandaloneTaskRecord[]>([]);

  const [disabledTeams, setDisabledTeams] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEYS.disabledTeams);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(WORKSPACE_STORAGE_KEYS.disabledTeams, JSON.stringify(disabledTeams)); } catch { /* ignore */ }
  }, [disabledTeams]);

  const updateStandaloneTasks = useCallback((value: React.SetStateAction<StandaloneTaskRecord[]>) => {
    setStandaloneTasksState((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  useEffect(() => {
    workspaceSyncPayloadRef.current = {
      tasks,
      successLogs,
      taskNotifications,
      mistakes,
      tasksPerTeam,
      opsCampaigns,
      campaignIntakes,
      organizedUpdates,
      linkWidgets,
      shiftHandovers,
      coverageRecords,
      standaloneTasks,
    };
  }, [
    campaignIntakes,
    coverageRecords,
    linkWidgets,
    mistakes,
    opsCampaigns,
    organizedUpdates,
    shiftHandovers,
    standaloneTasks,
    successLogs,
    taskNotifications,
    tasks,
    tasksPerTeam,
  ]);

  // Standalone tasks are loaded via refreshWorkspaceData (server + localStorage merge).
  // This effect is a safety-net for first-load before the server responds.
  useEffect(() => {
    if (!userEmail || hasLoadedWorkspace) return;
    const stored = readStoredWorkspaceRecords<StandaloneTaskRecord>(getStandaloneTasksStorageKey(userEmail));
    if (stored.length > 0) setStandaloneTasksState(stored);
  }, [userEmail, hasLoadedWorkspace]);

  useEffect(() => {
    if (!userEmail || !hasLoadedWorkspace) return;
    writeStoredWorkspaceValue(getStandaloneTasksStorageKey(userEmail), standaloneTasks);
  }, [standaloneTasks, userEmail, hasLoadedWorkspace]);

  const applyWorkspaceSnapshot = useCallback((snapshot: WorkspaceSnapshot) => {
    startTransition(() => {
      setTasks(snapshot.tasks);
      setSuccessLogs(snapshot.successLogs);
      setTaskNotifications(snapshot.taskNotifications);
      setMistakes(snapshot.mistakes);
      setTasksPerTeam(snapshot.tasksPerTeam);
      setOpsCampaigns(snapshot.opsCampaigns);
      setCommunityWorkspace(snapshot.communityWorkspace);
      setCampaignIntakes(snapshot.campaignIntakes);
      setOrganizedUpdates(snapshot.organizedUpdates);
      setLinkWidgets(snapshot.linkWidgets);
      setShiftHandovers(snapshot.shiftHandovers);
      setCoverageRecords(snapshot.coverageRecords);
      setStandaloneTasksState(snapshot.standaloneTasks);
    });
  }, []);

  const resetWorkspaceState = useCallback(() => {
    communityWorkspaceRef.current = createEmptyCommunityWorkspace();
    setTasks([]);
    setSuccessLogs([]);
    setTaskNotifications([]);
    setMistakes([]);
    setTasksPerTeam({});
    setOpsCampaigns([]);
    setCommunityWorkspace(createEmptyCommunityWorkspace());
    setCampaignIntakes([]);
    setOrganizedUpdates([]);
    setLinkWidgets([]);
    setShiftHandovers([]);
    setCoverageRecords([]);
    setDemoCompleted(null);
    try { window.localStorage.removeItem(WORKSPACE_STORAGE_KEYS.demoCompleted); } catch { /* ignore */ }
    setIsLoading(true);
    setHasLoadedWorkspace(false);
    setFetchError(false);
    setSaveState('idle');
    setConnectionState('idle');
    setLastSaved(null);
    setLastSyncError(null);
    setWorkspaceRevision(0);
    setLastPersistedRevision(0);
    setCommunityRevision(0);
    setLastPersistedCommunityRevision(0);
    refreshRequestIdRef.current += 1;
    saveRequestIdRef.current += 1;
  }, []);

  const applySession = useCallback((session: SessionLike | null) => {
    if (!session) {
      setIsAuthenticated(false);
      setUserEmail('');
      setUserName('');
      setUserRole(null);
      setUserFeatures(null);
      setTeamMembers([]);
      hasInitialNavigated.current = false;
      resetWorkspaceState();
      return;
    }

    setIsAuthenticated(true);
    setUserEmail(session.user.email || '');
    setUserName(session.user.user_metadata?.name || session.user.email || '');
  }, [resetWorkspaceState]);

  useEffect(() => {
    let isMounted = true;

    const bootAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          applySession(session);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    bootAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      applySession(session);
      setCheckingSession(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (!isAuthenticated || !userEmail) {
      return;
    }

    const registerRole = async () => {
      try {
        setConnectionState((current) => (current === 'idle' ? 'loading' : current));
        const data = await apiRequest<{
          config?: { teamMembers?: TeamMemberRecord[] };
          demoCompleted?: boolean;
          features?: string[] | null;
          role?: 'admin' | 'member';
        }>('auto-register', {
          method: 'POST',
          body: { email: userEmail, name: userName },
        });

        setUserRole(data.role || 'member');
        setTeamMembers(data.config?.teamMembers || []);
        setUserFeatures(data.features || null);
        const completed = data.demoCompleted === true;
        setDemoCompleted(completed);
        try { window.localStorage.setItem(WORKSPACE_STORAGE_KEYS.demoCompleted, String(completed)); } catch { /* ignore */ }
        setConnectionState('online');
      } catch (error) {
        console.error('Error registering role:', error);
        setUserRole('member');
        // Restore from cache so a temporary API failure does not force a demo redirect
        try {
          const cached = window.localStorage.getItem(WORKSPACE_STORAGE_KEYS.demoCompleted);
          if (cached !== null) {
            setDemoCompleted(cached === 'true');
          }
          // If no cache yet (first ever visit), leave demoCompleted as null — no redirect fires
        } catch { /* ignore */ }
        setLastSyncError(error instanceof Error ? error.message : 'Failed to load user access');
        setConnectionState('error');
      }
    };

    registerRole();
  }, [isAuthenticated, userEmail, userName]);

  const refreshWorkspaceData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;

    setIsLoading(true);
    setFetchError(false);
    setConnectionState('loading');

    try {
      const [workspaceResult, communityResult] = await Promise.allSettled([
        apiRequest<WorkspaceDataResponse>('data'),
        apiRequest<{ data?: unknown }>('community-team-data'),
      ]);

      if (workspaceResult.status !== 'fulfilled') {
        throw workspaceResult.reason;
      }

      const data = workspaceResult.value;
      let nextCommunityWorkspace = communityWorkspaceRef.current;

      if (communityResult.status === 'fulfilled') {
        const nextData = communityResult.value.data;
        if (nextData && Object.keys(nextData).length > 0) {
          nextCommunityWorkspace = normalizeCommunityWorkspace(nextData);
        } else {
          const storedCommunityWorkspace = readStoredWorkspaceObject(WORKSPACE_STORAGE_KEYS.communityWorkspace, null);
          if (storedCommunityWorkspace) {
            nextCommunityWorkspace = normalizeCommunityWorkspace(storedCommunityWorkspace);
          }
        }
      } else {
        console.error('Error fetching community workspace:', communityResult.reason);
        const storedCommunityWorkspace = readStoredWorkspaceObject(WORKSPACE_STORAGE_KEYS.communityWorkspace, null);
        if (storedCommunityWorkspace) {
          nextCommunityWorkspace = normalizeCommunityWorkspace(storedCommunityWorkspace);
        }
      }

      const storedCampaignIntakes = normalizeCampaignIntakeRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.campaignIntakes));
      const storedOrganizedUpdates = normalizeOrganizedUpdateRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.organizedUpdates));
      const storedLinkWidgets = normalizeLinkWidgetRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.linkWidgets));
      const storedShiftHandovers = normalizeShiftHandoverRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.shiftHandovers));
      const storedCoverageRecords = normalizeCoverageRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.coverageRecords));
      const storedTasks = readStoredWorkspaceRecords<TaskRecord>(WORKSPACE_STORAGE_KEYS.tasks);
      const storedOpsCampaigns = normalizeOpsCampaigns(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.opsCampaigns));
      const storedTaskNotifications = readStoredWorkspaceRecords<NotificationRecord>(WORKSPACE_STORAGE_KEYS.taskNotifications);
      const storedSuccessLogs = readStoredWorkspaceRecords<SuccessRecord>(WORKSPACE_STORAGE_KEYS.successLogs);
      const storedMistakes = readStoredWorkspaceRecords<MistakeRecord>(WORKSPACE_STORAGE_KEYS.mistakes);
      const storedStandaloneTasks = readStoredWorkspaceRecords<StandaloneTaskRecord>(getStandaloneTasksStorageKey(userEmail));

      const nextWorkspace: WorkspaceSnapshot = {
        tasks: mergeWorkspaceRecordsByIdentity<TaskRecord>(preferLocalRecords((data.tasks || []) as TaskRecord[], storedTasks), storedTasks),
        successLogs: mergeWorkspaceRecordsByIdentity<SuccessRecord>(preferLocalRecords((data.successLogs || []) as SuccessRecord[], storedSuccessLogs), storedSuccessLogs),
        taskNotifications: mergeWorkspaceRecordsByIdentity<NotificationRecord>(
          preferLocalRecords((data.taskNotifications || []) as NotificationRecord[], storedTaskNotifications),
          storedTaskNotifications,
        ),
        mistakes: mergeWorkspaceRecordsByIdentity<MistakeRecord>(preferLocalRecords((data.mistakes || []) as MistakeRecord[], storedMistakes), storedMistakes),
        tasksPerTeam: preferLocalObject(
          ((data.tasksPerTeam || {}) as Record<string, WorkspaceRecord>),
          readStoredWorkspaceObject<Record<string, WorkspaceRecord>>(WORKSPACE_STORAGE_KEYS.tasksPerTeam, {}),
        ),
        opsCampaigns: mergeWorkspaceRecords(
          normalizeOpsCampaigns(preferLocalRecords(data.opsCampaigns || [], storedOpsCampaigns)),
          storedOpsCampaigns,
        ),
        campaignIntakes: mergeWorkspaceRecords(
          normalizeCampaignIntakeRecords(preferLocalRecords(data.campaignIntakes || [], storedCampaignIntakes)),
          storedCampaignIntakes,
        ),
        organizedUpdates: mergeWorkspaceRecords(
          normalizeOrganizedUpdateRecords(preferLocalRecords(data.organizedUpdates || [], storedOrganizedUpdates)),
          storedOrganizedUpdates,
        ),
        linkWidgets: mergeWorkspaceRecords(
          normalizeLinkWidgetRecords(preferLocalRecords(data.linkWidgets || [], storedLinkWidgets)),
          storedLinkWidgets,
        ),
        shiftHandovers: mergeWorkspaceRecords(
          normalizeShiftHandoverRecords(preferLocalRecords(data.shiftHandovers || [], storedShiftHandovers)),
          storedShiftHandovers,
        ),
        coverageRecords: mergeWorkspaceRecords(
          normalizeCoverageRecords(preferLocalRecords(data.coverageRecords || [], storedCoverageRecords)),
          storedCoverageRecords,
        ),
        communityWorkspace: nextCommunityWorkspace,
        standaloneTasks: mergeWorkspaceRecordsByIdentity<StandaloneTaskRecord>(
          preferLocalRecords((data.standaloneTasks || []) as StandaloneTaskRecord[], storedStandaloneTasks),
          storedStandaloneTasks,
        ),
      };

      if (requestId !== refreshRequestIdRef.current) {
        return;
      }

      applyWorkspaceSnapshot(nextWorkspace);
      setHasLoadedWorkspace(true);
      setFetchError(false);
      setLastSyncError(null);
      setConnectionState('online');
      setLastPersistedRevision(workspaceRevisionRef.current);
      setLastPersistedCommunityRevision(communityRevisionRef.current);
    } catch (error) {
      console.error('Error fetching workspace data:', error);

      if (requestId !== refreshRequestIdRef.current) {
        return;
      }

      // Load from localStorage as fallback so data doesn't disappear when server is unreachable
      const storedSuccessLogs = readStoredWorkspaceRecords<SuccessRecord>(WORKSPACE_STORAGE_KEYS.successLogs);
      const storedMistakes = readStoredWorkspaceRecords<MistakeRecord>(WORKSPACE_STORAGE_KEYS.mistakes);
      const storedTasks = readStoredWorkspaceRecords<TaskRecord>(WORKSPACE_STORAGE_KEYS.tasks);
      const storedOpsCampaigns = normalizeOpsCampaigns(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.opsCampaigns));
      const storedTaskNotifications = readStoredWorkspaceRecords<NotificationRecord>(WORKSPACE_STORAGE_KEYS.taskNotifications);
      const storedCampaignIntakes = normalizeCampaignIntakeRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.campaignIntakes));
      const storedOrganizedUpdates = normalizeOrganizedUpdateRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.organizedUpdates));
      const storedLinkWidgets = normalizeLinkWidgetRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.linkWidgets));
      const storedShiftHandovers = normalizeShiftHandoverRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.shiftHandovers));
      const storedCoverageRecords = normalizeCoverageRecords(readStoredWorkspaceRecords(WORKSPACE_STORAGE_KEYS.coverageRecords));
      const storedCommunityWorkspace = readStoredWorkspaceObject(WORKSPACE_STORAGE_KEYS.communityWorkspace, null);

      const storedStandaloneTasks = readStoredWorkspaceRecords<StandaloneTaskRecord>(getStandaloneTasksStorageKey(userEmail));
      const storedTasksPerTeam = readStoredWorkspaceObject<Record<string, WorkspaceRecord>>(WORKSPACE_STORAGE_KEYS.tasksPerTeam, {});

      applyWorkspaceSnapshot({
        tasks: storedTasks,
        successLogs: storedSuccessLogs,
        taskNotifications: storedTaskNotifications,
        mistakes: storedMistakes,
        tasksPerTeam: storedTasksPerTeam,
        opsCampaigns: storedOpsCampaigns,
        communityWorkspace: storedCommunityWorkspace ? normalizeCommunityWorkspace(storedCommunityWorkspace) : createEmptyCommunityWorkspace(),
        campaignIntakes: storedCampaignIntakes,
        organizedUpdates: storedOrganizedUpdates,
        linkWidgets: storedLinkWidgets,
        shiftHandovers: storedShiftHandovers,
        coverageRecords: storedCoverageRecords,
        standaloneTasks: storedStandaloneTasks,
      });

      // Mark workspace as loaded so content shows instead of a blank loading screen
      setHasLoadedWorkspace(true);
      setFetchError(true);
      setLastSyncError(error instanceof Error ? error.message : 'Failed to load workspace data');
      setConnectionState('error');
    } finally {
      if (requestId === refreshRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyWorkspaceSnapshot, isAuthenticated, userEmail]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    refreshWorkspaceData();
  }, [isAuthenticated, refreshWorkspaceData]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void refreshWorkspaceData();
    };

    const intervalId = window.setInterval(refreshIfVisible, 60_000);

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [hasLoadedWorkspace, isAuthenticated, refreshWorkspaceData]);

  useEffect(() => {
    if (routeRedirect && pathname !== routeRedirect) {
      navigate(routeRedirect, { replace: true });
    }
  }, [navigate, pathname, routeRedirect]);

  useEffect(() => {
    if (!userRole || demoCompleted === null || !isAuthenticated) {
      return;
    }

    if (routeRedirect && pathname !== routeRedirect) {
      return;
    }

    if (demoCompleted === false) {
      if (pathname !== '/demo') {
        navigate('/demo', { replace: true });
      }
      hasInitialNavigated.current = true;
      return;
    }

    if (hasInitialNavigated.current) {
      return;
    }

    if (pathname !== '/' && pathname !== '/demo') {
      hasInitialNavigated.current = true;
      return;
    }

    hasInitialNavigated.current = true;
    navigate(userRole === 'member' ? '/personal' : '/', { replace: true });
  }, [demoCompleted, isAuthenticated, navigate, pathname, routeRedirect, userRole]);

  useEffect(() => {
    if (!isAuthenticated || isLoading || fetchError || !hasLoadedWorkspace) {
      return;
    }

    const hasWorkspaceChanges = workspaceRevision !== lastPersistedRevision;
    const hasCommunityChanges = communityRevision !== lastPersistedCommunityRevision;

    if (!hasWorkspaceChanges && !hasCommunityChanges) {
      return;
    }

    setSaveState('saving');
    setConnectionState('syncing');
    const revisionAtSave = {
      community: communityRevision,
      workspace: workspaceRevision,
    };

    const timer = window.setTimeout(async () => {
      const saveRequestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = saveRequestId;
      let workspaceSaved = false;
      let communitySaved = false;

      try {
        if (hasWorkspaceChanges) {
          await apiRequest('workspace', {
            method: 'POST',
            body: workspaceSyncPayloadRef.current,
            timeoutMs: 20000,
          });
          workspaceSaved = true;
        }

        if (hasCommunityChanges) {
          await apiRequest('community-team-data', {
            method: 'POST',
            body: { data: communityWorkspaceRef.current },
            timeoutMs: 20000,
          });
          communitySaved = true;
        }

        if (saveRequestId !== saveRequestIdRef.current) {
          return;
        }

        setLastSaved(new Date());
        setSaveState('saved');
        setConnectionState('online');
        setLastSyncError(null);
        if (workspaceSaved) {
          setLastPersistedRevision(revisionAtSave.workspace);
        }
        if (communitySaved) {
          setLastPersistedCommunityRevision(revisionAtSave.community);
        }
      } catch (error) {
        console.error('Error saving workspace:', error);
        if (saveRequestId !== saveRequestIdRef.current) {
          return;
        }
        if (workspaceSaved) {
          setLastPersistedRevision(revisionAtSave.workspace);
        }
        if (communitySaved) {
          setLastPersistedCommunityRevision(revisionAtSave.community);
        }
        setSaveState('error');
        setConnectionState('error');
        setLastSyncError(error instanceof Error ? error.message : 'Failed to sync workspace changes');
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    fetchError,
    hasLoadedWorkspace,
    isAuthenticated,
    isLoading,
    workspaceRevision,
    lastPersistedRevision,
    communityRevision,
    lastPersistedCommunityRevision,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';

      if (isShortcut) {
        event.preventDefault();
        setIsCommandPaletteOpen((current) => !current);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    const timer = window.setTimeout(() => {
      persistWorkspaceSnapshot({
        tasks,
        taskNotifications,
        tasksPerTeam,
        opsCampaigns,
        campaignIntakes,
        organizedUpdates,
        linkWidgets,
        shiftHandovers,
        coverageRecords,
        successLogs,
        mistakes,
        communityWorkspace,
        standaloneTasks,
        userEmail,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    campaignIntakes,
    communityWorkspace,
    coverageRecords,
    hasLoadedWorkspace,
    isAuthenticated,
    linkWidgets,
    mistakes,
    opsCampaigns,
    organizedUpdates,
    shiftHandovers,
    standaloneTasks,
    successLogs,
    taskNotifications,
    tasks,
    tasksPerTeam,
    userEmail,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    const flushWorkspaceSnapshot = () => {
      const payload = workspaceSyncPayloadRef.current;
      persistWorkspaceSnapshot({
        tasks: payload.tasks,
        taskNotifications: payload.taskNotifications,
        tasksPerTeam: payload.tasksPerTeam,
        opsCampaigns: payload.opsCampaigns,
        campaignIntakes: payload.campaignIntakes,
        organizedUpdates: payload.organizedUpdates,
        linkWidgets: payload.linkWidgets,
        shiftHandovers: payload.shiftHandovers,
        coverageRecords: payload.coverageRecords,
        successLogs: payload.successLogs,
        mistakes: payload.mistakes,
        communityWorkspace: communityWorkspaceRef.current,
        standaloneTasks: payload.standaloneTasks,
        userEmail,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushWorkspaceSnapshot();
      }
    };

    window.addEventListener('pagehide', flushWorkspaceSnapshot);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushWorkspaceSnapshot);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasLoadedWorkspace, isAuthenticated, userEmail]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(WORKSPACE_STORAGE_KEYS.sidebarCollapsed, String(isSidebarCollapsed)); } catch { /* ignore */ }
  }, [isSidebarCollapsed]);

  // Auto-reset "Saved" badge back to idle after 3 seconds so the status bar stays clean
  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 3000);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  useRealtimeWorkspaceAlerts({
    hasLoadedWorkspace,
    isAdmin,
    isAuthenticated,
    refreshWorkspaceData,
    userEmail,
  });

  const handleSession = (session: SessionLike) => {
    applySession(session);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      applySession(null);
    } finally {
      setIsCommandPaletteOpen(false);
      navigate('/', { replace: true });
    }
  };

  const handleXlsxImport = (importedTasks: TaskRecord[]) => {
    updateTasks((current) => [...current, ...importedTasks]);
  };

  const handleLogSuccess = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date();
    const nextSuccess = {
      ...successData,
      id: Date.now(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timestamp: now.toISOString(),
      campaign: successData.campaign || 'General',
    };

    updateSuccessLogs((current) => [
      nextSuccess,
      ...current,
    ]);

    void publishWorkspaceAlert(createSuccessAlertPayload(nextSuccess));

    setIsSuccessModalOpen(false);
    setSuccessData({ title: '', detail: '', campaign: '' });
  };

  const refreshTeamMembers = useCallback(async () => {
    try {
      const data = await apiRequest<{ config?: { teamMembers?: TeamMemberRecord[] } }>('admin-config');
      setTeamMembers(data.config?.teamMembers || []);
    } catch (error) {
      console.error('Error refreshing team members:', error);
      setLastSyncError(error instanceof Error ? error.message : 'Failed to refresh team members');
    }
  }, []);

  const operationalTasks = useMemo(
    () =>
      [...flattenOperationalTasks(opsCampaigns), ...flattenCommunityWorkspaceTasks(communityWorkspace)]
        .map((task) => ({
          ...task,
          id: task.id ?? 0,
          description: String(task.description ?? task.title ?? ''),
          campaign: String(task.campaign ?? ''),
          assignedTo: String(task.assignedTo ?? ''),
          priority: String(task.priority ?? 'Medium'),
          status: String(task.status ?? 'Pending'),
          category: 'category' in task ? String((task as { category?: unknown }).category ?? 'Operations') : 'Operations',
          slaHrs: Number(task.slaHrs ?? 0),
          startDateTime: String(task.startDateTime ?? task.createdAt ?? new Date().toISOString()),
          endDateTime: task.endDateTime ? String(task.endDateTime) : undefined,
        }))
        .filter((task) => !disabledTeams.includes(task.teamId || '')) as TaskRecord[],
    [communityWorkspace, opsCampaigns, disabledTeams],
  );

  const unreadCount = useMemo(() => {
    let count = 0;
    count += successLogs.slice(0, 3).length;
    count += operationalTasks.filter((task) => {
      if (task.status === 'Done' || !task.startDateTime) return false;
      const aging = (Date.now() - new Date(task.startDateTime).getTime()) / (1000 * 60 * 60);
      return aging > (task.slaHrs || 0);
    }).slice(0, 3).length;
    count += operationalTasks.filter((task) => task.status === 'Blocked').slice(0, 2).length;
    count += taskNotifications
      .filter((notification: NotificationRecord) => String(notification.assignedTo || '').toLowerCase() === userEmail.toLowerCase())
      .slice(0, 5).length;
    return Math.min(count, 99);
  }, [operationalTasks, successLogs, taskNotifications, userEmail]);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((current) => !current);
  }, []);

  const openUpload = useCallback(() => {
    setIsXlsxUploaderOpen(true);
  }, []);

  const openSuccess = useCallback(() => {
    setIsSuccessModalOpen(true);
  }, []);

  const contextValue = useMemo(() => ({
    tasks,
    setTasks: updateTasks,
    successLogs,
    setSuccessLogs: updateSuccessLogs,
    taskNotifications,
    setTaskNotifications: updateTaskNotifications,
    mistakes,
    setMistakes: updateMistakes,
    userEmail,
    userName,
    userRole,
    isAdmin,
    teamMembers,
    setTeamMembers,
    refreshTeamMembers,
    isLoading,
    fetchError,
    isSaving: saveState === 'saving',
    lastSaved,
    lastSyncError,
    refreshWorkspaceData,
    userFeatures,
    setUserFeatures,
    tasksPerTeam,
    setTasksPerTeam: updateTasksPerTeam,
    opsCampaigns,
    setOpsCampaigns: updateOpsCampaigns,
    communityWorkspace,
    setCommunityWorkspace: updateCommunityWorkspace,
    campaignIntakes,
    setCampaignIntakes: updateCampaignIntakes,
    organizedUpdates,
    setOrganizedUpdates: updateOrganizedUpdates,
    linkWidgets,
    setLinkWidgets: updateLinkWidgets,
    shiftHandovers,
    setShiftHandovers: updateShiftHandovers,
    coverageRecords,
    setCoverageRecords: updateCoverageRecords,
    operationalTasks,
    standaloneTasks,
    setStandaloneTasks: updateStandaloneTasks,
    demoCompleted,
    setDemoCompleted,
    disabledTeams,
    setDisabledTeams,
    openCommandPalette,
  }), [
    campaignIntakes,
    communityWorkspace,
    coverageRecords,
    demoCompleted,
    disabledTeams,
    fetchError,
    isAdmin,
    isLoading,
    lastSaved,
    lastSyncError,
    linkWidgets,
    mistakes,
    openCommandPalette,
    operationalTasks,
    opsCampaigns,
    organizedUpdates,
    refreshTeamMembers,
    refreshWorkspaceData,
    saveState,
    setDemoCompleted,
    setTeamMembers,
    setUserFeatures,
    shiftHandovers,
    standaloneTasks,
    successLogs,
    taskNotifications,
    tasks,
    tasksPerTeam,
    teamMembers,
    updateCampaignIntakes,
    updateCommunityWorkspace,
    updateCoverageRecords,
    updateLinkWidgets,
    updateMistakes,
    updateOpsCampaigns,
    updateOrganizedUpdates,
    updateShiftHandovers,
    updateStandaloneTasks,
    updateSuccessLogs,
    updateTaskNotifications,
    updateTasks,
    updateTasksPerTeam,
    userEmail,
    userFeatures,
    userName,
    userRole,
  ]);

  if (checkingSession) {
    return (
      <div className="app-shell-background min-h-screen flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-5 rounded-[var(--app-card-radius)] border border-zinc-200 bg-white/90 px-8 py-7 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-xl">
              <Trophy className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Trygc OPS</div>
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Command Center</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">Checking session…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleSession} />;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <ConfigurationProvider
        userId={userEmail}
        userName={userName || userEmail}
      >
        <ThemeProvider>
          <Toaster />
          <div className="app-shell-background flex h-screen overflow-hidden transition-theme">
            <Sidebar
              isAdmin={isAdmin}
              isCollapsed={isSidebarCollapsed}
              mobileOpen={isMobileSidebarOpen}
              onMobileOpenChange={setIsMobileSidebarOpen}
              onToggleCollapse={toggleSidebarCollapse}
            />

            <motion.div layout className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <TopBar
                connectionState={connectionState}
                currentPageDescription={currentNavItem.description}
                currentPageLabel={currentNavItem.label}
                lastSyncError={lastSyncError}
                onOpenCommandPalette={openCommandPalette}
                onOpenMobileMenu={openMobileMenu}
                userName={userName}
                userEmail={userEmail}
                isAdmin={isAdmin}
                onLogout={handleLogout}
                onRefreshWorkspace={refreshWorkspaceData}
                onOpenUpload={openUpload}
                onOpenSuccess={openSuccess}
                unreadCount={unreadCount}
                saveState={saveState}
                lastSaved={lastSaved}
              />

              <main className="app-shell-background flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--app-mobile-nav-height)+env(safe-area-inset-bottom,0px)+12px)] lg:pb-0 scrollbar-thin">
                <div
                  className="mx-auto w-full"
                  style={{
                    maxWidth: 'var(--app-shell-max-width)',
                    paddingInline: 'var(--app-shell-padding-x)',
                    paddingBlock: 'var(--app-shell-padding-y)',
                  }}
                >
                  {fetchError && (
                    <div className="mb-4 rounded-[var(--app-card-radius-sm)] border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <div className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                              Working offline
                            </div>
                            <div className="mt-0.5 text-sm font-medium text-amber-700 dark:text-amber-300">
                              Showing your last saved data. Changes will sync automatically when the connection is restored.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={refreshWorkspaceData}
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      </div>
                    </div>
                  )}

                  {isLoading && !hasLoadedWorkspace ? (
                    <div className="flex min-h-[60vh] items-center justify-center">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100 shadow-xl">
                          <Trophy className="h-7 w-7 text-white dark:text-zinc-900" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">Preparing workspace</h2>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Loading your data…
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-pulse"
                              style={{ animationDelay: `${i * 180}ms` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : routeRedirect ? null : (
                    <React.Suspense fallback={<RouteLoadingFallback />}>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={pathname}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="route-page-layout"
                        >
                          <RouteComponent />
                        </motion.div>
                      </AnimatePresence>
                    </React.Suspense>
                  )}
                </div>
              </main>
            </motion.div>

            {isAdmin && (
              <button
                onClick={openUpload}
                className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-2xl transition-all hover:bg-zinc-800 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:hover:w-auto sm:hover:gap-2 sm:hover:px-5 group"
                title="Upload XLSX"
              >
                <UploadCloud className="w-5 h-5" />
                <span className="hidden whitespace-nowrap text-sm font-bold sm:group-hover:inline">Upload XLSX</span>
              </button>
            )}

            {isXlsxUploaderOpen && (
              <React.Suspense fallback={null}>
                <LazyXlsxUploader
                  isOpen={isXlsxUploaderOpen}
                  onClose={() => setIsXlsxUploaderOpen(false)}
                  onImport={handleXlsxImport}
                />
              </React.Suspense>
            )}

            <MobileBottomNav />

            <CommandPalette
              isAdmin={isAdmin}
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
              onOpenSuccess={openSuccess}
              onOpenUpload={openUpload}
              onRefreshWorkspace={refreshWorkspaceData}
              userEmail={userEmail}
              userFeatures={userFeatures}
            />

            {isSuccessModalOpen && (
              <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white dark:bg-zinc-950 rounded-[var(--app-card-radius)] w-full max-w-md p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">Add Update</h2>
                        <p className="text-xs text-zinc-400">Log a win or progress note</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSuccessModalOpen(false)}
                      className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-zinc-500" />
                    </button>
                  </div>
                  <form onSubmit={handleLogSuccess} className="space-y-3">
                    <input
                      required
                      value={successData.title}
                      onChange={(event) => setSuccessData({ ...successData, title: event.target.value })}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                      placeholder="Title"
                    />
                    <select
                      value={successData.campaign}
                      onChange={(event) => setSuccessData({ ...successData, campaign: event.target.value })}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-sm text-zinc-800 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                    >
                      <option value="">Select campaign (optional)</option>
                      <option value="General">General</option>
                      {opsCampaigns.map((c: OpsCampaign) => (
                        <option key={String(c.id || c.name || 'campaign')} value={String(c.name || '')}>{String(c.name || '')}</option>
                      ))}
                    </select>
                    <textarea
                      required
                      value={successData.detail}
                      onChange={(event) => setSuccessData({ ...successData, detail: event.target.value })}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl h-28 outline-none text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-none"
                      placeholder="Write your update here…"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSuccessModalOpen(false)}
                        className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-black transition-all"
                      >
                        Save Update
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </div>
        </ThemeProvider>
      </ConfigurationProvider>
    </AppContext.Provider>
  );
}
