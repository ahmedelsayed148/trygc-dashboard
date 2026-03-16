"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { flattenOperationalTasks, normalizeOpsCampaigns } from '../lib/operations';
import {
  createEmptyCommunityWorkspace,
  flattenCommunityWorkspaceTasks,
  normalizeCommunityWorkspace,
  type CommunityWorkspace,
} from '../lib/communityWorkspace';
import {
  normalizeCampaignIntakeRecords,
  normalizeLinkWidgetRecords,
  normalizeOrganizedUpdateRecords,
  normalizeShiftHandoverRecords,
} from '../lib/workspaceTools';
import { normalizeCoverageRecords } from '../lib/coverageTypes';
import { getCurrentNavItem } from '../lib/navigation';
import { useLocation, useNavigate } from '../lib/routerCompat';
import { getRouteComponent, getRouteRedirect } from '../routes';

export const AppContext = React.createContext<any>(null);

const CAMPAIGN_INTAKES_STORAGE_KEY = 'trygc-campaign-intakes';
const ORGANIZED_UPDATES_STORAGE_KEY = 'trygc-organized-updates';
const LINK_WIDGETS_STORAGE_KEY = 'trygc-link-widgets';
const SHIFT_HANDOVERS_STORAGE_KEY = 'trygc-shift-handovers';
const COVERAGE_RECORDS_STORAGE_KEY = 'trygc-coverage-records';
const SUCCESS_LOGS_STORAGE_KEY = 'trygc-success-logs';
const MISTAKES_STORAGE_KEY = 'trygc-mistakes';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'trygc-sidebar-collapsed';

function readStoredWorkspaceRecords(key: string) {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeStoredWorkspaceRecords(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Ignore local storage write failures and keep the in-memory workspace active.
  }
}

function mergeWorkspaceRecords<T extends { id: string; updatedAt?: string }>(primary: T[], secondary: T[]) {
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

const LazyXlsxUploader = React.lazy(() =>
  import('./XlsxUploader').then((module) => ({ default: module.XlsxUploader })),
);

function resolveStateUpdate<T>(value: React.SetStateAction<T>, current: T): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(current) : value;
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
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [userFeatures, setUserFeatures] = useState<string[] | null>(null);

  const [tasks, setTasks] = useState<any[]>([]);
  const [successLogs, setSuccessLogs] = useState<any[]>([]);
  const [taskNotifications, setTaskNotifications] = useState<any[]>([]);
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [tasksPerTeam, setTasksPerTeam] = useState<Record<string, any>>({});
  const [opsCampaigns, setOpsCampaigns] = useState<any[]>([]);
  const [communityWorkspace, setCommunityWorkspace] = useState<CommunityWorkspace>(createEmptyCommunityWorkspace());
  const [campaignIntakes, setCampaignIntakes] = useState<any[]>([]);
  const [organizedUpdates, setOrganizedUpdates] = useState<any[]>([]);
  const [linkWidgets, setLinkWidgets] = useState<any[]>([]);
  const [shiftHandovers, setShiftHandovers] = useState<any[]>([]);
  const [coverageRecords, setCoverageRecords] = useState<any[]>([]);
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
    try { return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [isXlsxUploaderOpen, setIsXlsxUploaderOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [successData, setSuccessData] = useState({ title: '', detail: '', campaign: '' });
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [lastPersistedRevision, setLastPersistedRevision] = useState(0);

  const hasInitialNavigated = useRef(false);
  const workspaceRevisionRef = useRef(0);
  const communityWorkspaceRef = useRef<CommunityWorkspace>(createEmptyCommunityWorkspace());
  const isAdmin = userRole === 'admin';
  const RouteComponent = useMemo(() => getRouteComponent(pathname), [pathname]);
  const currentNavItem = useMemo(() => getCurrentNavItem(pathname), [pathname]);
  const routeRedirect = useMemo(() => getRouteRedirect(pathname), [pathname]);

  useEffect(() => {
    workspaceRevisionRef.current = workspaceRevision;
  }, [workspaceRevision]);

  useEffect(() => {
    communityWorkspaceRef.current = communityWorkspace;
  }, [communityWorkspace]);

  const markWorkspaceDirty = useCallback(() => {
    setWorkspaceRevision((current) => current + 1);
  }, []);

  const updateTasks = useCallback((value: React.SetStateAction<any[]>) => {
    setTasks((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateSuccessLogs = useCallback((value: React.SetStateAction<any[]>) => {
    setSuccessLogs((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateTaskNotifications = useCallback((value: React.SetStateAction<any[]>) => {
    setTaskNotifications((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateMistakes = useCallback((value: React.SetStateAction<any[]>) => {
    setMistakes((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateTasksPerTeam = useCallback((value: React.SetStateAction<Record<string, any>>) => {
    setTasksPerTeam((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateOpsCampaigns = useCallback((value: React.SetStateAction<any[]>) => {
    setOpsCampaigns((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateCommunityWorkspace = useCallback((value: React.SetStateAction<CommunityWorkspace>) => {
    setCommunityWorkspace((current) => resolveStateUpdate(value, current));
  }, []);

  const updateCampaignIntakes = useCallback((value: React.SetStateAction<any[]>) => {
    setCampaignIntakes((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateOrganizedUpdates = useCallback((value: React.SetStateAction<any[]>) => {
    setOrganizedUpdates((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateLinkWidgets = useCallback((value: React.SetStateAction<any[]>) => {
    setLinkWidgets((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateShiftHandovers = useCallback((value: React.SetStateAction<any[]>) => {
    setShiftHandovers((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const updateCoverageRecords = useCallback((value: React.SetStateAction<any[]>) => {
    setCoverageRecords((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  const [standaloneTasks, setStandaloneTasksState] = useState<any[]>([]);

  const [disabledTeams, setDisabledTeams] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('trygc-disabled-teams');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('trygc-disabled-teams', JSON.stringify(disabledTeams)); } catch { /* ignore */ }
  }, [disabledTeams]);

  const updateStandaloneTasks = useCallback((value: React.SetStateAction<any[]>) => {
    setStandaloneTasksState((current) => resolveStateUpdate(value, current));
    markWorkspaceDirty();
  }, [markWorkspaceDirty]);

  // Standalone tasks are loaded via refreshWorkspaceData (server + localStorage merge).
  // This effect is a safety-net for first-load before the server responds.
  useEffect(() => {
    if (!userEmail || hasLoadedWorkspace) return;
    const stored = readStoredWorkspaceRecords(`trygc-standalone-tasks:${userEmail}`);
    if (stored.length > 0) setStandaloneTasksState(stored);
  }, [userEmail, hasLoadedWorkspace]);

  useEffect(() => {
    if (!userEmail) return;
    writeStoredWorkspaceRecords(`trygc-standalone-tasks:${userEmail}`, standaloneTasks);
  }, [standaloneTasks, userEmail]);

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
    setIsLoading(true);
    setHasLoadedWorkspace(false);
    setFetchError(false);
    setSaveState('idle');
    setConnectionState('idle');
    setLastSaved(null);
    setLastSyncError(null);
    setWorkspaceRevision(0);
    setLastPersistedRevision(0);
  }, []);

  const applySession = useCallback((session: any | null) => {
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
          config?: { teamMembers?: any[] };
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
        setDemoCompleted(data.demoCompleted === true);
        setConnectionState('online');
      } catch (error) {
        console.error('Error registering role:', error);
        setUserRole('member');
        setDemoCompleted(false);
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

    setIsLoading(true);
    setFetchError(false);
    setConnectionState('loading');

    try {
      const data = await apiRequest<WorkspaceDataResponse>('data');
      let nextCommunityWorkspace = communityWorkspaceRef.current;

      try {
        const communityResponse = await apiRequest<{ data?: any }>('community-team-data');
        nextCommunityWorkspace = normalizeCommunityWorkspace(communityResponse.data);
      } catch (error) {
        console.error('Error fetching community workspace:', error);
      }

      const storedCampaignIntakes = normalizeCampaignIntakeRecords(readStoredWorkspaceRecords(CAMPAIGN_INTAKES_STORAGE_KEY));
      const storedOrganizedUpdates = normalizeOrganizedUpdateRecords(readStoredWorkspaceRecords(ORGANIZED_UPDATES_STORAGE_KEY));
      const storedLinkWidgets = normalizeLinkWidgetRecords(readStoredWorkspaceRecords(LINK_WIDGETS_STORAGE_KEY));
      const storedShiftHandovers = normalizeShiftHandoverRecords(readStoredWorkspaceRecords(SHIFT_HANDOVERS_STORAGE_KEY));
      const storedCoverageRecords = normalizeCoverageRecords(readStoredWorkspaceRecords(COVERAGE_RECORDS_STORAGE_KEY));
      const storedSuccessLogs = readStoredWorkspaceRecords(SUCCESS_LOGS_STORAGE_KEY);
      const storedMistakes = readStoredWorkspaceRecords(MISTAKES_STORAGE_KEY);
      const storedStandaloneTasks = readStoredWorkspaceRecords(`trygc-standalone-tasks:${userEmail}`);

      // Merge successLogs by id: prefer server entries, fill in any local-only ones not yet synced
      const mergeById = (primary: any[], secondary: any[]) => {
        const seen = new Set(primary.map((x) => String(x.id)));
        return [...primary, ...secondary.filter((x) => !seen.has(String(x.id)))];
      };

      const nextWorkspace = {
        tasks: data.tasks || [],
        successLogs: mergeById(data.successLogs || [], storedSuccessLogs),
        taskNotifications: data.taskNotifications || [],
        mistakes: mergeById(data.mistakes || [], storedMistakes),
        tasksPerTeam: data.tasksPerTeam || {},
        opsCampaigns: normalizeOpsCampaigns(data.opsCampaigns || []),
        campaignIntakes: mergeWorkspaceRecords(
          normalizeCampaignIntakeRecords(data.campaignIntakes || []),
          storedCampaignIntakes,
        ),
        organizedUpdates: mergeWorkspaceRecords(
          normalizeOrganizedUpdateRecords(data.organizedUpdates || []),
          storedOrganizedUpdates,
        ),
        linkWidgets: mergeWorkspaceRecords(
          normalizeLinkWidgetRecords(data.linkWidgets || []),
          storedLinkWidgets,
        ),
        shiftHandovers: mergeWorkspaceRecords(
          normalizeShiftHandoverRecords(data.shiftHandovers || []),
          storedShiftHandovers,
        ),
        coverageRecords: mergeWorkspaceRecords(
          normalizeCoverageRecords(data.coverageRecords || []),
          storedCoverageRecords,
        ),
        standaloneTasks: mergeById(data.standaloneTasks || [], storedStandaloneTasks),
      };

      setTasks(nextWorkspace.tasks);
      setSuccessLogs(nextWorkspace.successLogs);
      setTaskNotifications(nextWorkspace.taskNotifications);
      setMistakes(nextWorkspace.mistakes);
      setTasksPerTeam(nextWorkspace.tasksPerTeam);
      setOpsCampaigns(nextWorkspace.opsCampaigns);
      setCommunityWorkspace(nextCommunityWorkspace);
      setCampaignIntakes(nextWorkspace.campaignIntakes);
      setOrganizedUpdates(nextWorkspace.organizedUpdates);
      setLinkWidgets(nextWorkspace.linkWidgets);
      setShiftHandovers(nextWorkspace.shiftHandovers);
      setCoverageRecords(nextWorkspace.coverageRecords);
      if (nextWorkspace.standaloneTasks.length > 0) {
        setStandaloneTasksState(nextWorkspace.standaloneTasks);
      }
      setHasLoadedWorkspace(true);
      setFetchError(false);
      setLastSyncError(null);
      setConnectionState('online');
      setLastPersistedRevision(workspaceRevisionRef.current);
    } catch (error) {
      console.error('Error fetching workspace data:', error);

      // Load from localStorage as fallback so data doesn't disappear when server is unreachable
      const storedSuccessLogs = readStoredWorkspaceRecords(SUCCESS_LOGS_STORAGE_KEY);
      const storedMistakes = readStoredWorkspaceRecords(MISTAKES_STORAGE_KEY);
      const storedCampaignIntakes = normalizeCampaignIntakeRecords(readStoredWorkspaceRecords(CAMPAIGN_INTAKES_STORAGE_KEY));
      const storedOrganizedUpdates = normalizeOrganizedUpdateRecords(readStoredWorkspaceRecords(ORGANIZED_UPDATES_STORAGE_KEY));
      const storedLinkWidgets = normalizeLinkWidgetRecords(readStoredWorkspaceRecords(LINK_WIDGETS_STORAGE_KEY));
      const storedShiftHandovers = normalizeShiftHandoverRecords(readStoredWorkspaceRecords(SHIFT_HANDOVERS_STORAGE_KEY));
      const storedCoverageRecords = normalizeCoverageRecords(readStoredWorkspaceRecords(COVERAGE_RECORDS_STORAGE_KEY));

      if (storedSuccessLogs.length > 0) setSuccessLogs(storedSuccessLogs);
      if (storedMistakes.length > 0) setMistakes(storedMistakes);
      if (storedCampaignIntakes.length > 0) setCampaignIntakes(storedCampaignIntakes);
      if (storedOrganizedUpdates.length > 0) setOrganizedUpdates(storedOrganizedUpdates);
      if (storedLinkWidgets.length > 0) setLinkWidgets(storedLinkWidgets);
      if (storedShiftHandovers.length > 0) setShiftHandovers(storedShiftHandovers);
      if (storedCoverageRecords.length > 0) setCoverageRecords(storedCoverageRecords);

      // Mark workspace as loaded so content shows instead of a blank loading screen
      setHasLoadedWorkspace(true);
      setFetchError(true);
      setLastSyncError(error instanceof Error ? error.message : 'Failed to load workspace data');
      setConnectionState('error');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    refreshWorkspaceData();
  }, [isAuthenticated, refreshWorkspaceData]);

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

    if (workspaceRevision === lastPersistedRevision) {
      return;
    }

    setSaveState('saving');
    setConnectionState('syncing');

    const timer = window.setTimeout(async () => {
      try {
        await apiRequest('workspace', {
          method: 'POST',
          body: {
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
          },
        });

        setLastSaved(new Date());
        setSaveState('saved');
        setConnectionState('online');
        setLastSyncError(null);
        setLastPersistedRevision(workspaceRevision);
      } catch (error) {
        console.error('Error saving workspace:', error);
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
    mistakes,
    successLogs,
    taskNotifications,
    tasks,
    tasksPerTeam,
    opsCampaigns,
    campaignIntakes,
    organizedUpdates,
    linkWidgets,
    shiftHandovers,
    coverageRecords,
    standaloneTasks,
    workspaceRevision,
    lastPersistedRevision,
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

    writeStoredWorkspaceRecords(CAMPAIGN_INTAKES_STORAGE_KEY, campaignIntakes);
  }, [campaignIntakes, hasLoadedWorkspace, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    writeStoredWorkspaceRecords(ORGANIZED_UPDATES_STORAGE_KEY, organizedUpdates);
  }, [organizedUpdates, hasLoadedWorkspace, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    writeStoredWorkspaceRecords(LINK_WIDGETS_STORAGE_KEY, linkWidgets);
  }, [linkWidgets, hasLoadedWorkspace, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    writeStoredWorkspaceRecords(SHIFT_HANDOVERS_STORAGE_KEY, shiftHandovers);
  }, [shiftHandovers, hasLoadedWorkspace, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    writeStoredWorkspaceRecords(COVERAGE_RECORDS_STORAGE_KEY, coverageRecords);
  }, [coverageRecords, hasLoadedWorkspace, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    writeStoredWorkspaceRecords(SUCCESS_LOGS_STORAGE_KEY, successLogs);
  }, [successLogs, hasLoadedWorkspace, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace) {
      return;
    }

    writeStoredWorkspaceRecords(MISTAKES_STORAGE_KEY, mistakes);
  }, [mistakes, hasLoadedWorkspace, isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed)); } catch { /* ignore */ }
  }, [isSidebarCollapsed]);

  // Auto-reset "Saved" badge back to idle after 3 seconds so the status bar stays clean
  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 3000);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const handleSession = (session: any) => {
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

  const handleXlsxImport = (importedTasks: any[]) => {
    updateTasks((current) => [...current, ...importedTasks]);
  };

  const handleLogSuccess = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date();

    updateSuccessLogs((current) => [
      {
        ...successData,
        id: Date.now(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: now.toISOString(),
        campaign: successData.campaign || 'General',
      },
      ...current,
    ]);

    setIsSuccessModalOpen(false);
    setSuccessData({ title: '', detail: '', campaign: '' });
  };

  const refreshTeamMembers = useCallback(async () => {
    try {
      const data = await apiRequest<{ config?: { teamMembers?: any[] } }>('admin-config');
      setTeamMembers(data.config?.teamMembers || []);
    } catch (error) {
      console.error('Error refreshing team members:', error);
      setLastSyncError(error instanceof Error ? error.message : 'Failed to refresh team members');
    }
  }, []);

  const operationalTasks = useMemo(
    () => [...flattenOperationalTasks(opsCampaigns), ...flattenCommunityWorkspaceTasks(communityWorkspace)]
      .filter((task: any) => !disabledTeams.includes(task.teamId)),
    [communityWorkspace, opsCampaigns, disabledTeams],
  );

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

  const contextValue = {
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
    openCommandPalette: () => setIsCommandPaletteOpen(true),
  };

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
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <motion.div layout className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <TopBar
                connectionState={connectionState}
                currentPageDescription={currentNavItem.description}
                currentPageLabel={currentNavItem.label}
                lastSyncError={lastSyncError}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
                userName={userName}
                userEmail={userEmail}
                isAdmin={isAdmin}
                onLogout={handleLogout}
                onRefreshWorkspace={refreshWorkspaceData}
                onOpenUpload={() => setIsXlsxUploaderOpen(true)}
                onOpenSuccess={() => setIsSuccessModalOpen(true)}
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
                onClick={() => setIsXlsxUploaderOpen(true)}
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
              onOpenSuccess={() => setIsSuccessModalOpen(true)}
              onOpenUpload={() => setIsXlsxUploaderOpen(true)}
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
                      {opsCampaigns.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
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
