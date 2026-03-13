import React, { useContext, useMemo, useState } from 'react';
import { LogOut, Upload, Trophy, Bell, ClipboardList, Search, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLocation } from '../lib/routerCompat';
import { ThemeToggle } from './ThemeToggle';
import { NotificationPanel } from './NotificationPanel';
import { AppContext } from './Root';
import { getCurrentNavItem } from '../lib/navigation';

const LazySOPModal = React.lazy(() =>
  import('./SOPModal').then((module) => ({ default: module.SOPModal })),
);

interface TopBarProps {
  connectionState: 'idle' | 'loading' | 'online' | 'syncing' | 'error';
  lastSyncError: string | null;
  onOpenCommandPalette: () => void;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
  onRefreshWorkspace: () => void;
  onOpenUpload: () => void;
  onOpenSuccess: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
}

export function TopBar({ 
  connectionState,
  lastSyncError,
  onOpenCommandPalette,
  userName, 
  userEmail, 
  isAdmin, 
  onLogout, 
  onRefreshWorkspace,
  onOpenUpload,
  onOpenSuccess,
  saveState,
  lastSaved 
}: TopBarProps) {
  const ctx = useContext(AppContext);
  const taskNotifications = ctx?.taskNotifications || [];
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSOPOpen, setIsSOPOpen] = useState(false);
  const notifButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const currentNavItem = getCurrentNavItem(location.pathname);
  const assignmentNotificationCount = useMemo(
    () =>
      taskNotifications.filter(
        (notification: any) => notification.assignedTo?.toLowerCase() === userEmail.toLowerCase(),
      ).length,
    [taskNotifications, userEmail],
  );
  const lastSavedLabel = lastSaved
    ? lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const statusLabel = saveState === 'saving'
    ? 'Syncing changes'
    : saveState === 'error'
    ? 'Sync issue'
    : lastSavedLabel
    ? `Saved ${lastSavedLabel}`
    : 'Ready';
  const isOffline = connectionState === 'error';

  return (
    <header className="relative z-20 border-b border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-4 pl-16 pr-4 py-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,720px)] xl:items-start">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-500">
            Connected Workspace
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
              {currentNavItem.label}
            </h2>
            <div className="hidden max-w-full truncate rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 sm:block">
              {location.pathname}
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {currentNavItem.description}
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <button
            onClick={onOpenCommandPalette}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition-all hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80"
            title="Open command palette"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <span className="truncate text-sm font-bold text-zinc-500 dark:text-zinc-400">Search, jump, or act</span>
            </div>
            <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 shadow-sm dark:bg-zinc-950">
              Ctrl K
            </span>
          </button>

          <div className="flex flex-wrap items-stretch gap-2 xl:justify-end">
            <div className={`flex min-w-[170px] flex-1 items-center gap-2 rounded-2xl border px-3 py-2 sm:flex-none ${
              isOffline
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black'
                : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
            }`}>
              {isOffline ? <WifiOff className="h-4 w-4 shrink-0" /> : <Wifi className="h-4 w-4 shrink-0" />}
              <div className="min-w-0 flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                  {connectionState === 'syncing' ? 'Syncing' : isOffline ? 'Attention' : 'Connected'}
                </span>
                <span className="truncate text-[10px] font-medium opacity-80">
                  {lastSyncError || statusLabel}
                </span>
              </div>
            </div>

            <div className="flex min-w-[130px] items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <div className={`h-2 w-2 rounded-full ${
                saveState === 'saving'
                  ? 'animate-pulse bg-zinc-500'
                  : saveState === 'error'
                    ? 'bg-zinc-900 dark:bg-zinc-100'
                    : lastSaved
                      ? 'bg-black dark:bg-white'
                      : 'bg-zinc-300'
              }`} />
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                {statusLabel}
              </span>
            </div>

            <button
              onClick={onRefreshWorkspace}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-500 transition-all hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              title="Refresh workspace"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsSOPOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition-all shadow-md hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              title="SOP & Roles"
            >
              <ClipboardList className="h-4 w-4" />
              <span>SOP & Roles</span>
            </button>

            <button
              onClick={onOpenSuccess}
              className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-700 px-4 py-2 text-sm font-bold text-white shadow-lg transition-colors hover:bg-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              title="Log update"
            >
              <Trophy className="h-4 w-4" />
              <span>Add Update</span>
            </button>

            {isAdmin && (
              <button
                onClick={onOpenUpload}
                className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
            )}

            <div className="relative z-40">
              <button 
                ref={notifButtonRef}
                onClick={() => setIsNotifOpen((current) => !current)}
                className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition-all hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                {assignmentNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-black text-white dark:bg-white dark:text-black">
                    {assignmentNotificationCount}
                  </span>
                )}
              </button>
              <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} triggerRef={notifButtonRef} />
            </div>

            <div className="shrink-0">
              <ThemeToggle />
            </div>

            <div className="flex min-w-[180px] max-w-full flex-1 items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 sm:flex-none dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-xs font-black uppercase text-white dark:bg-white dark:text-black">
                {(userName || userEmail).substring(0, 2)}
              </div>
              <div className="min-w-0 flex-1 flex-col">
                <span className="block truncate text-xs font-bold leading-none text-zinc-700 dark:text-zinc-200">
                  {userName || userEmail}
                </span>
                <span className="mt-0.5 block text-[8px] font-black uppercase leading-none tracking-widest text-zinc-500 dark:text-zinc-400">
                  {isAdmin ? 'Admin' : 'Member'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-200 hover:text-black dark:hover:bg-zinc-700 dark:hover:text-white"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* SOP Modal */}
      {isSOPOpen && (
        <React.Suspense fallback={null}>
          <LazySOPModal isOpen={isSOPOpen} onClose={() => setIsSOPOpen(false)} />
        </React.Suspense>
      )}
    </header>
  );
}
