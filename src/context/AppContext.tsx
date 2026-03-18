import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { AppState, Campaign, Task, CommunityWorkspace, CampaignIntake, OrganizedUpdate, ShiftHandover, LinkWidget, CoverageRecord, SuccessLog, TaskNotification, MistakeLog, User } from '@/types';
import { seedCampaigns, seedTasks, seedCommunityWorkspaces, seedCampaignIntakes, seedUpdates, seedHandovers, seedWidgets, seedCoverageRecords, seedSuccessLogs, seedNotifications, seedMistakes, seedTeamMembers } from '@/data/seed';

const LOCAL_KEYS = ['campaignIntakes', 'updates', 'widgets', 'handovers', 'coverageRecords'] as const;

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`trygc_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveLocal(key: string, data: unknown) {
  try { localStorage.setItem(`trygc_${key}`, JSON.stringify(data)); } catch (error) { void error; }
}

const defaultUser: User = {
  id: 'demo-user', email: 'demo@trygc.com', name: 'Demo User', role: 'owner',
  features: ['all'], demoCompleted: true, createdAt: '2026-01-01',
};

const initialState: AppState = {
  user: defaultUser, isAuthenticated: true,
  teamMembers: seedTeamMembers, campaigns: seedCampaigns, tasks: seedTasks,
  communityWorkspaces: seedCommunityWorkspaces,
  campaignIntakes: loadLocal('campaignIntakes', seedCampaignIntakes),
  updates: loadLocal('updates', seedUpdates),
  widgets: loadLocal('widgets', seedWidgets),
  handovers: loadLocal('handovers', seedHandovers),
  coverageRecords: loadLocal('coverageRecords', seedCoverageRecords),
  successLogs: seedSuccessLogs, notifications: seedNotifications, mistakes: seedMistakes,
  saveState: 'saved', syncState: 'synced', lastSaved: new Date().toISOString(),
};

type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_CAMPAIGNS'; payload: Campaign[] }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_COMMUNITY'; payload: CommunityWorkspace[] }
  | { type: 'SET_INTAKES'; payload: CampaignIntake[] }
  | { type: 'SET_UPDATES'; payload: OrganizedUpdate[] }
  | { type: 'SET_WIDGETS'; payload: LinkWidget[] }
  | { type: 'SET_HANDOVERS'; payload: ShiftHandover[] }
  | { type: 'SET_COVERAGE'; payload: CoverageRecord[] }
  | { type: 'SET_SUCCESSES'; payload: SuccessLog[] }
  | { type: 'SET_NOTIFICATIONS'; payload: TaskNotification[] }
  | { type: 'SET_MISTAKES'; payload: MistakeLog[] }
  | { type: 'SET_SAVE_STATE'; payload: AppState['saveState'] }
  | { type: 'SET_SYNC_STATE'; payload: AppState['syncState'] }
  | { type: 'MARK_SAVED' }
  | { type: 'ADD_CAMPAIGN'; payload: Campaign }
  | { type: 'UPDATE_CAMPAIGN'; payload: Campaign }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'ADD_INTAKE'; payload: CampaignIntake }
  | { type: 'ADD_UPDATE'; payload: OrganizedUpdate }
  | { type: 'ADD_WIDGET'; payload: LinkWidget }
  | { type: 'UPDATE_WIDGET'; payload: LinkWidget }
  | { type: 'DELETE_WIDGET'; payload: string }
  | { type: 'ADD_HANDOVER'; payload: ShiftHandover }
  | { type: 'ADD_COVERAGE'; payload: CoverageRecord }
  | { type: 'UPDATE_COVERAGE'; payload: CoverageRecord }
  | { type: 'DELETE_COVERAGE'; payload: string }
  | { type: 'ADD_SUCCESS'; payload: SuccessLog }
  | { type: 'ADD_NOTIFICATION'; payload: TaskNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'ADD_MISTAKE'; payload: MistakeLog }
  | { type: 'UPDATE_MISTAKE'; payload: MistakeLog }
  | { type: 'IMPORT_DATA'; payload: Partial<AppState> }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER': return { ...state, user: action.payload };
    case 'SET_AUTHENTICATED': return { ...state, isAuthenticated: action.payload };
    case 'SET_CAMPAIGNS': return { ...state, campaigns: action.payload, saveState: 'unsaved' };
    case 'SET_TASKS': return { ...state, tasks: action.payload, saveState: 'unsaved' };
    case 'SET_COMMUNITY': return { ...state, communityWorkspaces: action.payload, saveState: 'unsaved' };
    case 'SET_INTAKES': return { ...state, campaignIntakes: action.payload, saveState: 'unsaved' };
    case 'SET_UPDATES': return { ...state, updates: action.payload, saveState: 'unsaved' };
    case 'SET_WIDGETS': return { ...state, widgets: action.payload, saveState: 'unsaved' };
    case 'SET_HANDOVERS': return { ...state, handovers: action.payload, saveState: 'unsaved' };
    case 'SET_COVERAGE': return { ...state, coverageRecords: action.payload, saveState: 'unsaved' };
    case 'SET_SUCCESSES': return { ...state, successLogs: action.payload, saveState: 'unsaved' };
    case 'SET_NOTIFICATIONS': return { ...state, notifications: action.payload };
    case 'SET_MISTAKES': return { ...state, mistakes: action.payload, saveState: 'unsaved' };
    case 'SET_SAVE_STATE': return { ...state, saveState: action.payload };
    case 'SET_SYNC_STATE': return { ...state, syncState: action.payload };
    case 'MARK_SAVED': return { ...state, saveState: 'saved', lastSaved: new Date().toISOString() };
    case 'ADD_CAMPAIGN': return { ...state, campaigns: [...state.campaigns, action.payload], saveState: 'unsaved' };
    case 'UPDATE_CAMPAIGN': return { ...state, campaigns: state.campaigns.map(c => c.id === action.payload.id ? action.payload : c), saveState: 'unsaved' };
    case 'ADD_TASK': return { ...state, tasks: [...state.tasks, action.payload], saveState: 'unsaved' };
    case 'UPDATE_TASK': return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t), saveState: 'unsaved' };
    case 'ADD_INTAKE': return { ...state, campaignIntakes: [...state.campaignIntakes, action.payload], saveState: 'unsaved' };
    case 'ADD_UPDATE': return { ...state, updates: [action.payload, ...state.updates], saveState: 'unsaved' };
    case 'ADD_WIDGET': return { ...state, widgets: [...state.widgets, action.payload], saveState: 'unsaved' };
    case 'UPDATE_WIDGET': return { ...state, widgets: state.widgets.map(w => w.id === action.payload.id ? action.payload : w), saveState: 'unsaved' };
    case 'DELETE_WIDGET': return { ...state, widgets: state.widgets.filter(w => w.id !== action.payload), saveState: 'unsaved' };
    case 'ADD_HANDOVER': return { ...state, handovers: [action.payload, ...state.handovers], saveState: 'unsaved' };
    case 'ADD_COVERAGE': return { ...state, coverageRecords: [...state.coverageRecords, action.payload], saveState: 'unsaved' };
    case 'UPDATE_COVERAGE': return { ...state, coverageRecords: state.coverageRecords.map(c => c.id === action.payload.id ? action.payload : c), saveState: 'unsaved' };
    case 'DELETE_COVERAGE': return { ...state, coverageRecords: state.coverageRecords.filter(c => c.id !== action.payload), saveState: 'unsaved' };
    case 'ADD_SUCCESS': return { ...state, successLogs: [action.payload, ...state.successLogs], saveState: 'unsaved' };
    case 'ADD_NOTIFICATION': return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ': return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'ADD_MISTAKE': return { ...state, mistakes: [...state.mistakes, action.payload], saveState: 'unsaved' };
    case 'UPDATE_MISTAKE': return { ...state, mistakes: state.mistakes.map(m => m.id === action.payload.id ? action.payload : m), saveState: 'unsaved' };
    case 'IMPORT_DATA': return { ...state, ...action.payload, saveState: 'unsaved' };
    case 'RESET': return initialState;
    default: return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Persist local-fallback data
  useEffect(() => {
    if (state.saveState === 'unsaved') {
      LOCAL_KEYS.forEach(key => saveLocal(key, state[key]));
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        dispatch({ type: 'SET_SAVE_STATE', payload: 'saving' });
        // Simulate backend save
        setTimeout(() => dispatch({ type: 'MARK_SAVED' }), 500);
      }, 1500);
    }
  }, [state.saveState, state.campaignIntakes, state.updates, state.widgets, state.handovers, state.coverageRecords]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
