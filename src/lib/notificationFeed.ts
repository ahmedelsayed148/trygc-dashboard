import type { OrganizedUpdateRecord } from '@/lib/workspaceTools';

type SuccessLogLike = {
  agent?: string;
  createdAt?: string;
  detail?: string;
  id?: string | number;
  time?: string;
  timestamp?: string;
  title?: string;
};

type TaskNotificationLike = {
  assignedTo?: string;
  date?: string;
  id?: string | number;
  taskDescription?: string;
  taskName?: string;
  time?: string;
  timestamp?: string;
};

export type NotificationFeedItem = {
  category: 'assignment' | 'update';
  createdAt: string;
  description: string;
  id: string;
  title: string;
};

function toTimestamp(value?: string) {
  if (!value) return 0;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toIsoString(value?: string) {
  const timestamp = toTimestamp(value);
  return timestamp > 0 ? new Date(timestamp).toISOString() : new Date(0).toISOString();
}

function truncate(value: string, limit: number) {
  const normalized = value.trim();
  return normalized.length > limit
    ? `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
    : normalized;
}

export function buildLatestNotificationFeed({
  maxItems = 12,
  organizedUpdates,
  successLogs,
  taskNotifications,
  userEmail,
}: {
  maxItems?: number;
  organizedUpdates: OrganizedUpdateRecord[];
  successLogs: SuccessLogLike[];
  taskNotifications: TaskNotificationLike[];
  userEmail: string;
}) {
  const normalizedEmail = userEmail.trim().toLowerCase();

  const assignmentItems: NotificationFeedItem[] = taskNotifications
    .filter((notification) =>
      normalizedEmail
        ? notification.assignedTo?.trim().toLowerCase() === normalizedEmail
        : true,
    )
    .map((notification) => ({
      category: 'assignment',
      createdAt: toIsoString(notification.timestamp),
      description: truncate(
        `${notification.taskName || 'Task'} - ${notification.taskDescription || 'No description'}`,
        120,
      ),
      id:
        notification.id !== undefined && notification.id !== null
          ? String(notification.id)
          : `assignment-${notification.timestamp || notification.time || notification.date || 'unknown'}`,
      title: 'Latest assigned task',
    }));

  const organizedUpdateItems: NotificationFeedItem[] = organizedUpdates.map((update) => ({
    category: 'update',
    createdAt: toIsoString(update.updatedAt || update.createdAt),
    description: truncate(update.organizedOutput || update.rawInput || 'Workspace update', 120),
    id: `update-${update.id}`,
    title: update.title || 'Latest workspace update',
  }));

  const successLogItems: NotificationFeedItem[] = successLogs.map((log) => ({
    category: 'update',
    createdAt: toIsoString(log.timestamp || log.createdAt),
    description: truncate(log.detail || 'Team update', 120),
    id: `success-${String(log.id || log.timestamp || log.title || 'unknown')}`,
    title: log.title || log.agent || 'Team update',
  }));

  const combinedUpdates = [...organizedUpdateItems, ...successLogItems];
  const dedupedUpdates = Array.from(
    new Map(combinedUpdates.map((item) => [item.id, item])).values(),
  );
  const dedupedAssignments = Array.from(
    new Map(assignmentItems.map((item) => [item.id, item])).values(),
  );

  return [...dedupedUpdates, ...dedupedAssignments]
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
    .slice(0, maxItems);
}

export function formatNotificationFeedTime(value: string) {
  const timestamp = toTimestamp(value);
  if (timestamp <= 0) {
    return 'Recently';
  }

  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}
