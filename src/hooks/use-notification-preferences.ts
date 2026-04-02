import { useCallback, useEffect, useState } from 'react';

import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCES_EVENT,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  readNotificationPreferences,
  writeNotificationPreferences,
} from '@/lib/notificationPreferences';

type NotificationPreferencesUpdater =
  | NotificationPreferences
  | ((current: NotificationPreferences) => NotificationPreferences);

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    readNotificationPreferences(),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncPreferences = () => {
      setPreferences(readNotificationPreferences());
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        event.key !== NOTIFICATION_PREFERENCES_STORAGE_KEY
      ) {
        return;
      }

      syncPreferences();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(NOTIFICATION_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(NOTIFICATION_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);

  const updatePreferences = useCallback((value: NotificationPreferencesUpdater) => {
    const current = readNotificationPreferences();
    const nextPreferences =
      typeof value === 'function'
        ? (value as (currentValue: NotificationPreferences) => NotificationPreferences)(current)
        : value;

    const persisted = writeNotificationPreferences(nextPreferences);
    setPreferences(persisted || DEFAULT_NOTIFICATION_PREFERENCES);
  }, []);

  return {
    preferences,
    updatePreferences,
  };
}
