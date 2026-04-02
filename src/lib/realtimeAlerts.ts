import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/components/supabaseClient';
import type { NotificationPreferences } from '@/lib/notificationPreferences';

export type WorkspaceAlertPayload = {
  createdAt: string;
  id: string;
  message: string;
  origin: string;
  targetUser?: string;
  title: string;
  type: 'success' | 'task_assigned';
};

type AssignmentNotificationLike = {
  assignedBy?: string;
  assignedTo?: string;
  assignedToName?: string;
  id: string;
  taskDescription?: string;
  taskName?: string;
  timestamp?: string;
};

type SuccessLogLike = {
  detail?: string;
  id?: string | number;
  time?: string;
  timestamp?: string;
  title?: string;
};

export const WORKSPACE_ALERT_CHANNEL = 'platform-workspace-alerts';
export const WORKSPACE_ALERT_EVENT = 'workspace-alert';

let alertPublisherChannel: RealtimeChannel | null = null;
let alertPublisherPromise: Promise<RealtimeChannel> | null = null;
let memoryOrigin: string | null = null;
let audioContext: AudioContext | null = null;

function createOrigin() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `origin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getWorkspaceAlertOrigin() {
  if (typeof window === 'undefined') {
    if (!memoryOrigin) {
      memoryOrigin = createOrigin();
    }
    return memoryOrigin;
  }

  try {
    const existing = window.sessionStorage.getItem('trygc-workspace-alert-origin');
    if (existing) {
      return existing;
    }

    const nextOrigin = createOrigin();
    window.sessionStorage.setItem('trygc-workspace-alert-origin', nextOrigin);
    return nextOrigin;
  } catch {
    if (!memoryOrigin) {
      memoryOrigin = createOrigin();
    }
    return memoryOrigin;
  }
}

async function ensureAlertPublisherChannel() {
  if (alertPublisherChannel) {
    return alertPublisherChannel;
  }

  if (alertPublisherPromise) {
    return alertPublisherPromise;
  }

  alertPublisherPromise = new Promise<RealtimeChannel>((resolve, reject) => {
    const channel = supabase.channel(`${WORKSPACE_ALERT_CHANNEL}:publisher`);
    const timeoutId = window.setTimeout(() => {
      alertPublisherPromise = null;
      reject(new Error('Timed out connecting to workspace alerts'));
    }, 5000);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        window.clearTimeout(timeoutId);
        alertPublisherChannel = channel;
        alertPublisherPromise = null;
        resolve(channel);
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        window.clearTimeout(timeoutId);
        alertPublisherPromise = null;
        reject(new Error(`Workspace alert channel failed: ${status}`));
      }
    });
  });

  return alertPublisherPromise;
}

export async function publishWorkspaceAlert(
  alert: Omit<WorkspaceAlertPayload, 'origin'>,
) {
  if (typeof window === 'undefined') return;

  try {
    const channel = await ensureAlertPublisherChannel();
    await channel.send({
      type: 'broadcast',
      event: WORKSPACE_ALERT_EVENT,
      payload: {
        ...alert,
        origin: getWorkspaceAlertOrigin(),
      } satisfies WorkspaceAlertPayload,
    });
  } catch (error) {
    console.error('Error publishing workspace alert:', error);
  }
}

export function createAssignmentAlertPayload(
  notification: AssignmentNotificationLike,
): Omit<WorkspaceAlertPayload, 'origin'> {
  const assigneeLabel = notification.assignedToName || notification.assignedTo || 'A teammate';

  return {
    createdAt: notification.timestamp || new Date().toISOString(),
    id: `assignment:${notification.id}`,
    message:
      `${notification.taskName || 'Task'} · ${notification.taskDescription || 'New assignment'}`,
    targetUser: notification.assignedTo?.toLowerCase(),
    title: `Assigned to ${assigneeLabel}`,
    type: 'task_assigned',
  };
}

export function createSuccessAlertPayload(
  successLog: SuccessLogLike,
): Omit<WorkspaceAlertPayload, 'origin'> {
  return {
    createdAt: successLog.timestamp || new Date().toISOString(),
    id: `success:${String(successLog.id || Date.now())}`,
    message: successLog.detail || 'A new workspace update was posted.',
    title: successLog.title || 'New team update',
    type: 'success',
  };
}

export function isWorkspaceAlertRelevant(
  alert: WorkspaceAlertPayload,
  userEmail: string,
  isAdmin: boolean,
) {
  if (alert.type === 'task_assigned') {
    const normalizedTarget = alert.targetUser?.toLowerCase();
    return Boolean(isAdmin || !normalizedTarget || normalizedTarget === userEmail.toLowerCase());
  }

  return true;
}

export function shouldShowWorkspaceAlert(
  alert: WorkspaceAlertPayload,
  preferences: NotificationPreferences,
) {
  if (alert.type === 'task_assigned') {
    return preferences.taskAssignments;
  }

  if (alert.type === 'success') {
    return preferences.successLogs;
  }

  return false;
}

export function sendDesktopWorkspaceAlert(alert: WorkspaceAlertPayload) {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    window.Notification.permission !== 'granted'
  ) {
    return false;
  }

  try {
    new window.Notification(alert.title, {
      body: alert.message,
      tag: alert.id,
    });
    return true;
  } catch {
    return false;
  }
}

export async function playWorkspaceAlertSound() {
  if (typeof window === 'undefined') return;

  const ContextConstructor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!ContextConstructor) return;

  try {
    audioContext = audioContext || new ContextConstructor();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const startAt = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(660, startAt + 0.16);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + 0.2);
  } catch {
    // Ignore audio failures. Some browsers require a prior user gesture.
  }
}
