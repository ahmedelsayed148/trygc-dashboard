import { useEffect, useRef } from 'react';

import { toast } from 'sonner';

import { supabase } from '@/components/supabaseClient';
import {
  getWorkspaceAlertOrigin,
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
  const seenAlertsRef = useRef<Set<string>>(new Set());
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedWorkspace || !userEmail) {
      return undefined;
    }

    const origin = getWorkspaceAlertOrigin();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        void refreshWorkspaceData();
      }, 1400);
    };

    const channel = supabase.channel(`${WORKSPACE_ALERT_CHANNEL}:listener:${origin}`);

    channel
      .on('broadcast', { event: WORKSPACE_ALERT_EVENT }, ({ payload }) => {
        const alert = payload as WorkspaceAlertPayload | undefined;

        if (!alert?.id || alert.origin === origin || seenAlertsRef.current.has(alert.id)) {
          return;
        }

        if (!isWorkspaceAlertRelevant(alert, userEmail, isAdmin)) {
          return;
        }

        seenAlertsRef.current.add(alert.id);
        scheduleRefresh();

        if (!shouldShowWorkspaceAlert(alert, preferences)) {
          return;
        }

        toast(alert.title, {
          description: alert.message,
          duration: 5000,
        });

        if (preferences.soundAlerts) {
          void playWorkspaceAlertSound();
        }

        if (preferences.desktopAlerts) {
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
    isAdmin,
    isAuthenticated,
    preferences,
    refreshWorkspaceData,
    userEmail,
  ]);
}
