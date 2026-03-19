import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Cloud,
  CloudOff,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Upload,
  WifiOff,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NotificationPanel } from './NotificationPanel';
import { useNavigate } from '../lib/routerCompat';
import { cn } from '@/lib/utils';

const LazySOPModal = React.lazy(() =>
  import('./SOPModal').then((module) => ({ default: module.SOPModal })),
);

interface TopBarProps {
  connectionState: 'idle' | 'loading' | 'online' | 'syncing' | 'error';
  currentPageDescription: string;
  currentPageLabel: string;
  lastSyncError: string | null;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
  onRefreshWorkspace: () => void;
  onOpenUpload: () => void;
  onOpenSuccess: () => void;
  unreadCount: number;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
}

function initials(value: string) {
  return (value || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-zinc-800 text-zinc-100',
    'bg-zinc-700 text-zinc-100',
    'bg-zinc-600 text-zinc-100',
    'bg-zinc-900 text-zinc-100',
  ];
  const index = (name || 'U').charCodeAt(0) % colors.length;
  return colors[index];
}

export function TopBar({
  connectionState,
  currentPageDescription,
  currentPageLabel,
  lastSyncError,
  onOpenCommandPalette,
  onOpenMobileMenu,
  userName,
  userEmail,
  isAdmin,
  onLogout,
  onRefreshWorkspace,
  onOpenUpload,
  onOpenSuccess,
  unreadCount,
  saveState,
  lastSaved,
}: TopBarProps) {
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSOPOpen, setIsSOPOpen] = useState(false);
  const notifButtonRef = useRef<HTMLButtonElement | null>(null);

  const connectionLabel = useMemo(() => {
    if (saveState === 'saving') return 'Saving…';
    if (saveState === 'error') return lastSyncError ? 'Sync failed' : 'Sync failed';
    if (saveState === 'saved' && lastSaved) {
      return `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (connectionState === 'loading') return 'Loading…';
    if (connectionState === 'error') return 'Offline';
    return 'Up to date';
  }, [connectionState, lastSaved, lastSyncError, saveState]);

  const connectionTooltip = useMemo(() => {
    if (lastSyncError) return lastSyncError;
    if (saveState === 'saved' && lastSaved) return `Last saved at ${lastSaved.toLocaleTimeString()}`;
    return undefined;
  }, [lastSaved, lastSyncError, saveState]);

  const SaveIcon =
    saveState === 'saving' ? Loader2 :
    saveState === 'saved' ? CheckCircle2 :
    saveState === 'error' ? CloudOff :
    connectionState === 'error' ? WifiOff :
    Cloud;

  const statusTone =
    connectionState === 'error' || saveState === 'error'
      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : saveState === 'saved'
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      : saveState === 'saving'
      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';

  return (
    <>
      <header
        className="app-shell-chrome app-topbar-gradient sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b backdrop-blur-xl"
        style={{ paddingInline: 'var(--app-topbar-padding-x)' }}
      >
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            {currentPageLabel}
          </div>
          <div className="hidden lg:block text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {currentPageDescription}
          </div>
        </div>

        <button
          onClick={onOpenCommandPalette}
          className="hidden w-64 items-center gap-2 rounded-xl border border-transparent bg-[hsl(var(--muted)/0.72)] px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-[rgba(var(--app-primary-rgb),0.14)] hover:bg-[hsl(var(--muted)/0.96)] dark:text-zinc-400 md:flex"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-white/10 bg-[hsl(var(--card)/0.88)] px-1.5 py-0.5 font-mono text-xs sm:flex">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        <div className="hidden lg:flex items-center gap-2">
          <span
            className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors', statusTone)}
            title={connectionTooltip}
          >
            <SaveIcon className={cn('w-3.5 h-3.5', saveState === 'saving' && 'animate-spin')} />
            {connectionLabel}
          </span>

          <button
            onClick={onRefreshWorkspace}
            className="rounded-xl p-1.5 text-zinc-500 transition-colors hover:bg-[hsl(var(--muted)/0.9)]"
            title="Refresh workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSOPOpen(true)}
            className="rounded-xl bg-[hsl(var(--muted)/0.72)] px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-[hsl(var(--muted)/0.96)] dark:text-zinc-300"
          >
            SOP
          </button>

          <button
            onClick={onOpenSuccess}
            className="app-accent-button rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Add Update
          </button>

          {isAdmin && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 rounded-xl border border-[rgba(var(--app-primary-rgb),0.14)] bg-[hsl(var(--card)/0.78)] px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-[hsl(var(--card)/0.98)] dark:text-zinc-50"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          )}
        </div>

        <ThemeToggle />

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={notifButtonRef}
            onClick={() => setIsNotifOpen((current) => !current)}
            className="relative rounded-xl p-1.5 text-zinc-500 transition-colors hover:bg-[hsl(var(--muted)/0.9)]"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} triggerRef={notifButtonRef} />
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((current) => !current)}
            className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-[hsl(var(--muted)/0.9)]"
          >
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold', getAvatarColor(userName || userEmail))}>
              {initials(userName || userEmail)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50 leading-none">
                {(userName || userEmail).split(' ')[0]}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-none mt-0.5 capitalize">
                {isAdmin ? 'admin' : 'member'}
              </p>
            </div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isUserMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
          <div className="app-menu-surface absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border py-1 shadow-xl">
                <div className="app-shell-divider mb-1 border-b px-3 py-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{userName || userEmail}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{userEmail}</p>
                  <span className="mt-1 inline-block rounded-full border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--muted)/0.9)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    {isAdmin ? 'Admin' : 'Member'}
                  </span>
                </div>
                <MenuButton
                  icon={Settings}
                  label="Settings"
                  onClick={() => { navigate('/settings'); setIsUserMenuOpen(false); }}
                />
                <MenuButton
                  icon={ClipboardList}
                  label="SOP & Roles"
                  onClick={() => { setIsSOPOpen(true); setIsUserMenuOpen(false); }}
                  className="lg:hidden"
                />
                {isAdmin && (
                  <MenuButton
                    icon={Upload}
                    label="Upload"
                    onClick={() => { onOpenUpload(); setIsUserMenuOpen(false); }}
                    className="lg:hidden"
                  />
                )}
                <MenuButton
                  label="Add Update"
                  onClick={() => { onOpenSuccess(); setIsUserMenuOpen(false); }}
                  className="lg:hidden"
                />
                <MenuButton
                  label="Refresh workspace"
                  onClick={() => { onRefreshWorkspace(); setIsUserMenuOpen(false); }}
                  className="lg:hidden"
                />
                <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <MenuButton
                  icon={LogOut}
                  label="Sign out"
                  onClick={() => { onLogout(); setIsUserMenuOpen(false); }}
                  danger
                />
              </div>
            </>
          )}
        </div>
      </header>

      {isSOPOpen && (
        <React.Suspense fallback={null}>
          <LazySOPModal isOpen={isSOPOpen} onClose={() => setIsSOPOpen(false)} />
        </React.Suspense>
      )}
    </>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
  className,
}: {
  icon?: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2',
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
        className,
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}
