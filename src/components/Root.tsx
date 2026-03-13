"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Trophy, UploadCloud, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ThemeProvider } from './ThemeProvider';
import { Toaster } from './ui/sonner';
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
import { useLocation, useNavigate } from '../lib/routerCompat';
import { getRouteComponent, getRouteRedirect } from '../routes';

export const AppContext = React.createContext<any>(null);

const CAMPAIGN_INTAKES_STORAGE_KEY = 'trygc-campaign-intakes';
const ORGANIZED_UPDATES_STORAGE_KEY = 'trygc-organized-updates';
const LINK_WIDGETS_STORAGE_KEY = 'trygc-link-widgets';
const SHIFT_HANDOVERS_STORAGE_KEY = 'trygc-shift-handovers';
const COVERAGE_RECORDS_STORAGE_KEY = 'trygc-coverage-records';

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isXlsxUploaderOpen, setIsXlsxUploaderOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [successData, setSuccessData] = useState({ agent: '', type: 'Volume', detail: '' });
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [lastPersistedRevision, setLastPersistedRevision] = useState(0);

  const hasInitialNavigated = useRef(false);
  const workspaceRevisionRef = useRef(0);
  const communityWorkspaceRef = useRef<CommunityWorkspace>(createEmptyCommunityWorkspace());
  const isAdmin = userRole === 'admin';
  const RouteComponent = useMemo(() => getRouteComponent(pathname), [pathname]);
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
      const nextWorkspace = {
        tasks: data.tasks || [],
        successLogs: data.successLogs || [],
        taskNotifications: data.taskNotifications || [],
        mistakes: data.mistakes || [],
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
      setHasLoadedWorkspace(true);
      setFetchError(false);
      setLastSyncError(null);
      setConnectionState('online');
      setLastPersistedRevision(workspaceRevisionRef.current);
    } catch (error) {
      console.error('Error fetching workspace data:', error);
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
      },
      ...current,
    ]);

    setIsSuccessModalOpen(false);
    setSuccessData({ agent: '', type: 'Volume', detail: '' });
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
    () => [...flattenOperationalTasks(opsCampaigns), ...flattenCommunityWorkspaceTasks(communityWorkspace)],
    [communityWorkspace, opsCampaigns],
  );

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
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
    demoCompleted,
    setDemoCompleted,
    openCommandPalette: () => setIsCommandPaletteOpen(true),
  };

  return (
    <AppContext.Provider value={contextValue}>
      <ThemeProvider>
        <Toaster />
        <div className="min-h-screen overflow-x-hidden bg-zinc-100 dark:bg-black flex transition-colors">
          <Sidebar
            isAdmin={isAdmin}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <div className={`flex-1 flex flex-col transition-all [transition-duration:320ms] ease-in-out ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'}`}>
            <TopBar
              connectionState={connectionState}
              lastSyncError={lastSyncError}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
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

            {fetchError && (
              <div className="mx-4 mt-4 rounded-[1.75rem] border border-zinc-900 bg-zinc-900 px-5 py-4 text-white shadow-xl dark:border-zinc-100 dark:bg-zinc-100 dark:text-black">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.2em] opacity-80">
                        Workspace Sync Warning
                      </div>
                      <div className="mt-1 text-sm font-medium opacity-90">
                        {lastSyncError || 'The app could not reach the backend. Your local changes stay visible, but sync is currently blocked.'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={refreshWorkspaceData}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black transition-all hover:bg-zinc-200 dark:bg-black dark:text-white dark:hover:bg-zinc-800"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Sync
                  </button>
                </div>
              </div>
            )}

            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 sm:pb-0">
              {isLoading && !hasLoadedWorkspace ? (
                <div className="flex min-h-[60vh] items-center justify-center px-6">
                  <div className="rounded-[2rem] border border-zinc-200 bg-white px-8 py-10 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-zinc-500" />
                    <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Preparing your workspace</h2>
                    <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Loading tasks, updates, notifications, and connected workspace data.
                    </p>
                  </div>
                </div>
              ) : (
                routeRedirect ? null : <RouteComponent />
              )}
            </main>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsXlsxUploaderOpen(true)}
              className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-2xl transition-all hover:bg-zinc-800 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:hover:w-auto sm:hover:gap-2 sm:hover:px-6 group"
              title="Upload XLSX"
            >
              <UploadCloud className="w-6 h-6" />
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
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-800 dark:text-zinc-200">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">Add Update</h2>
                  </div>
                  <button
                    onClick={() => setIsSuccessModalOpen(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                  >
                    <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>
                <form onSubmit={handleLogSuccess} className="space-y-5">
                  <input
                    required
                    value={successData.agent}
                    onChange={(event) => setSuccessData({ ...successData, agent: event.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none text-zinc-800 dark:text-zinc-100"
                    placeholder="Agent Name"
                  />
                  <textarea
                    required
                    value={successData.detail}
                    onChange={(event) => setSuccessData({ ...successData, detail: event.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl h-24 outline-none text-zinc-800 dark:text-zinc-100"
                    placeholder="Describe the update..."
                  />
                  <button
                    type="submit"
                    className="w-full py-4 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-[1.5rem] font-black shadow-xl transition-all"
                  >
                    Save Update
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </ThemeProvider>
    </AppContext.Provider>
  );
}
