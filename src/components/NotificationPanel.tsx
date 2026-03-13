import React, { useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from './Root';
import { Bell, CheckCircle2, Clock, AlertCircle, Trophy, X, ClipboardList } from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

interface Notification {
  id: string;
  type: 'task_done' | 'task_overdue' | 'task_blocked' | 'success' | 'task_new';
  title: string;
  description: string;
  time: string;
  icon: any;
}

export function NotificationPanel({ isOpen, onClose, triggerRef }: NotificationPanelProps) {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const successLogs = ctx?.successLogs || [];
  const taskNotifications = ctx?.taskNotifications || [];
  const userEmail = ctx?.userEmail || '';
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedPanel = panelRef.current?.contains(target);
      const clickedTrigger = triggerRef?.current?.contains(target);

      if (!clickedPanel && !clickedTrigger) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Generate notifications from data
  const notifications = useMemo<Notification[]>(() => {
    const notifs: Notification[] = [];

    // Recent success logs
    successLogs.slice(0, 3).forEach((log: any) => {
      notifs.push({
        id: `success-${log.id}`,
        type: 'success',
        title: `${log.agent} logged a win`,
        description: log.detail?.substring(0, 80) || 'Success recorded',
        time: log.time || 'Recently',
        icon: Trophy,
      });
    });

    // Overdue tasks
    tasks.filter((t: any) => {
      if (t.status === 'Done') return false;
      if (!t.startDateTime) return false;
      const aging = (new Date().getTime() - new Date(t.startDateTime).getTime()) / (1000 * 60 * 60);
      return aging > t.slaHrs;
    }).slice(0, 3).forEach((t: any) => {
      notifs.push({
        id: `overdue-${t.id}`,
        type: 'task_overdue',
        title: 'SLA Breach',
        description: `${t.campaign} - assigned to ${t.assignedTo || 'unassigned'}`,
        time: 'Overdue',
        icon: AlertCircle,
      });
    });

    // Recently completed tasks
    tasks.filter((t: any) => t.status === 'Done' && t.endDateTime)
      .sort((a: any, b: any) => new Date(b.endDateTime).getTime() - new Date(a.endDateTime).getTime())
      .slice(0, 3).forEach((t: any) => {
        notifs.push({
          id: `done-${t.id}`,
          type: 'task_done',
          title: 'Task Completed',
          description: `${t.campaign} by ${t.assignedTo || 'unknown'}`,
          time: new Date(t.endDateTime).toLocaleDateString(),
          icon: CheckCircle2,
        });
      });

    // Blocked tasks
    tasks.filter((t: any) => t.status === 'Blocked').slice(0, 2).forEach((t: any) => {
      notifs.push({
        id: `blocked-${t.id}`,
        type: 'task_blocked',
        title: 'Task Blocked',
        description: `${t.campaign} - ${t.assignedTo || 'unassigned'}`,
        time: 'Attention needed',
        icon: AlertCircle,
      });
    });

    // Task assignment notifications (only for current user)
    taskNotifications
      .filter((n: any) => n.assignedTo?.toLowerCase() === userEmail.toLowerCase())
      .slice(0, 5)
      .forEach((n: any) => {
        notifs.push({
          id: n.id,
          type: 'task_new',
          title: 'New Task Assigned',
          description: `${n.taskName} - ${n.taskDescription?.substring(0, 60) || 'No description'}`,
          time: n.time || n.date || 'Recently',
          icon: ClipboardList,
        });
      });

    return notifs.slice(0, 10);
  }, [tasks, successLogs, taskNotifications, userEmail]);

  const unreadCount = notifications.length;

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
          <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <div
                key={notif.id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-b-0"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  notif.type === 'success' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' :
                  notif.type === 'task_done' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' :
                  notif.type === 'task_overdue' ? 'bg-zinc-900 dark:bg-zinc-200 text-white dark:text-black' :
                  'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{notif.title}</p>
                    <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap">{notif.time}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{notif.description}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <ClipboardList className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-400">No notifications yet</p>
            <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">Activity will appear here</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <p className="text-[10px] font-bold text-zinc-400 text-center uppercase tracking-wider">
            Showing {notifications.length} recent activities
          </p>
        </div>
      )}
    </div>
  );
}
