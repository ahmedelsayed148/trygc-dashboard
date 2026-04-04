import React, { useContext, useMemo, useRef, useEffect, useState } from 'react';
import { AppContext } from './Root';
import { Bell, CheckCheck, ClipboardList, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildLatestNotificationFeed,
  formatNotificationFeedTime,
  type NotificationFeedItem,
} from '@/lib/notificationFeed';
import type { OrganizedUpdateRecord } from '@/lib/workspaceTools';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

type SuccessLog = {
  id?: string | number;
  title?: string;
  agent?: string;
  detail?: string;
  time?: string;
};

type TaskNotificationRecord = {
  id: string;
  assignedTo?: string;
  taskName?: string;
  taskDescription?: string;
  timestamp?: string;
  time?: string;
  date?: string;
};

const EMPTY_SUCCESS_LOGS: SuccessLog[] = [];
const EMPTY_TASK_NOTIFICATIONS: TaskNotificationRecord[] = [];
const EMPTY_ORGANIZED_UPDATES: OrganizedUpdateRecord[] = [];

export function NotificationPanel({ isOpen, onClose, triggerRef }: NotificationPanelProps) {
  const ctx = useContext(AppContext);
  const successLogs = (ctx?.successLogs as SuccessLog[] | undefined) ?? EMPTY_SUCCESS_LOGS;
  const taskNotifications = (ctx?.taskNotifications as TaskNotificationRecord[] | undefined) ?? EMPTY_TASK_NOTIFICATIONS;
  const organizedUpdates =
    (ctx?.organizedUpdates as OrganizedUpdateRecord[] | undefined) ?? EMPTY_ORGANIZED_UPDATES;
  const userEmail = ctx?.userEmail || '';
  const panelRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Close on outside click / Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef?.current?.contains(target)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  const allNotifications = useMemo<NotificationFeedItem[]>(
    () =>
      buildLatestNotificationFeed({
        organizedUpdates,
        successLogs,
        taskNotifications,
        userEmail,
      }),
    [organizedUpdates, successLogs, taskNotifications, userEmail],
  );

  const visible = useMemo(
    () => allNotifications.filter((n) => !dismissed.has(n.id)),
    [allNotifications, dismissed],
  );

  const dismiss = (id: string) => setDismissed((prev) => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(allNotifications.map((n) => n.id)));

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Notifications</h3>
          {visible.length > 0 && (
            <span className="px-2 py-0.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black rounded-full">
              {visible.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {visible.length > 0 && (
            <button
              onClick={dismissAll}
              title="Mark all as read"
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[26rem] overflow-y-auto">
        {visible.length > 0 ? (
          visible.map((notif) => {
            return (
              <div
                key={notif.id}
                className="group flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-b-0"
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                  notif.category === 'assignment'
                    ? 'bg-zinc-900 dark:bg-zinc-200 text-white dark:text-black'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
                )}>
                  {notif.category === 'assignment' ? (
                    <ClipboardList className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{notif.title}</p>
                    <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap shrink-0">
                      {formatNotificationFeedTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{notif.description}</p>
                </div>
                <button
                  onClick={() => dismiss(notif.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">All caught up</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">No fresh updates or assignments</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {visible.length > 0 && (
        <div className="px-5 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {visible.length} active
          </p>
          <button
            onClick={dismissAll}
            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
