import { useEffect, useRef } from 'react';

import { toast } from 'sonner';

import { supabase } from '@/components/supabaseClient';
import {
  getWorkspaceAlertOrigin,
  initializeWorkspaceAlertAudio,
  isWorkspaceAlertRelevant,
  playWorkspaceAlertSound,
  sendDesktopWorkspaceAlert,
  shouldShowWorkspaceAlert,
  type WorkspaceAlertPayload,
  WORKSPACE_ALERT_CHANNEL,
  WORKSPACE_ALERT_EVENT,
} from '@/lib/realtimeAlerts';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

type UseRealtimeWorkspaceAlertsParams = {
  hasLoadedWorkspace: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  refreshWorkspaceData: () => Promise<void>;
  userEmail: string;
};

export function useRealtimeWorkspaceAlerts({
  hasLoadedWorkspace,
  isAdmin,
  isAuthenticated,
  refreshWorkspaceData,
  userEmail,
}: UseRealtimeWorkspaceAlertsParams) {
  const { preferences } = useNotificationPreferences();
  const seenAlertsRef = useRef<string[]>([]);
  const refreshTimeoutRef = useRef<number | null>(null);
  const latestRefreshWorkspaceDataRef = useRef(refreshWorkspaceData);
  const latestPreferencesRef = useRef(preferences);
  const latestUserEmailRef = useRef(userEmail);
  const latestIsAdminRef = useRef(isAdmin);

  useEffect(() => {
    latestRefreshWorkspaceDataRef.current = refreshWorkspaceData;
  }, [refreshWorkspaceData]);

  useEffect(() => {
    latestPreferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    latestUserEmailRef.current = userEmail;
  }, [userEmail]);

  useEffect(() => {
    latestIsAdminRef.current = isAdmin;
  }, [isAdmin]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace || !userEmail) {
      return undefined;
    }

    initializeWorkspaceAlertAudio();

    const origin = getWorkspaceAlertOrigin();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        void latestRefreshWorkspaceDataRef.current();
      }, 1400);
    };

    const channel = supabase.channel(`${WORKSPACE_ALERT_CHANNEL}:listener:${origin}`);

    channel
      .on('broadcast', { event: WORKSPACE_ALERT_EVENT }, ({ payload }) => {
        const alert = payload as WorkspaceAlertPayload | undefined;

        if (!alert?.id || alert.origin === origin || seenAlertsRef.current.includes(alert.id)) {
          return;
        }

        if (
          !isWorkspaceAlertRelevant(
            alert,
            latestUserEmailRef.current,
            latestIsAdminRef.current,
          )
        ) {
          return;
        }

        seenAlertsRef.current = [alert.id, ...seenAlertsRef.current].slice(0, 200);
        scheduleRefresh();

        const currentPreferences = latestPreferencesRef.current;

        if (!shouldShowWorkspaceAlert(alert, currentPreferences)) {
          return;
        }

        toast(alert.title, {
          description: alert.message,
          duration: 5000,
        });

        if (currentPreferences.soundAlerts) {
          void playWorkspaceAlertSound();
        }

        if (currentPreferences.desktopAlerts) {
          sendDesktopWorkspaceAlert(alert);
        }
      })
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [
    hasLoadedWorkspace,
    isAuthenticated,
    userEmail,
  ]);
}
