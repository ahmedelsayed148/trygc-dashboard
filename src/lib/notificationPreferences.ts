export type NotificationPreferences = {
  desktopAlerts: boolean;
  soundAlerts: boolean;
  successLogs: boolean;
  taskAssignments: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  desktopAlerts: false,
  soundAlerts: true,
  successLogs: true,
  taskAssignments: true,
};

export const NOTIFICATION_PREFERENCES_STORAGE_KEY = 'trygc-notification-preferences';
export const NOTIFICATION_PREFERENCES_EVENT = 'trygc:notification-preferences-changed';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeNotificationPreferences(value: unknown): NotificationPreferences {
  if (!isRecord(value)) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    desktopAlerts:
      typeof value.desktopAlerts === 'boolean'
        ? value.desktopAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.desktopAlerts,
    soundAlerts:
      typeof value.soundAlerts === 'boolean'
        ? value.soundAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.soundAlerts,
    successLogs:
      typeof value.successLogs === 'boolean'
        ? value.successLogs
        : DEFAULT_NOTIFICATION_PREFERENCES.successLogs,
    taskAssignments:
      typeof value.taskAssignments === 'boolean'
        ? value.taskAssignments
        : DEFAULT_NOTIFICATION_PREFERENCES.taskAssignments,
  };
}

export function readNotificationPreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    const rawValue = window.localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    return rawValue
      ? sanitizeNotificationPreferences(JSON.parse(rawValue))
      : DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function writeNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof window === 'undefined') {
    return preferences;
  }

  const sanitized = sanitizeNotificationPreferences(preferences);

  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify(sanitized),
    );
    window.dispatchEvent(new Event(NOTIFICATION_PREFERENCES_EVENT));
  } catch {
    // Ignore write failures and keep the in-memory preferences active.
  }

  return sanitized;
}

export async function requestDesktopNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported' as const;
  }

  try {
    return await window.Notification.requestPermission();
  } catch {
    return window.Notification.permission;
  }
}
