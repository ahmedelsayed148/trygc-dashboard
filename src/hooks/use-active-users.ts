import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/components/supabaseClient';

export interface PresenceUser {
  user_id: string;
  email: string;
  name: string;
  online_at: string;
}

type PresenceRecord = PresenceUser & { presence_ref: string };

function normalizePresenceUsers(records: PresenceRecord[]) {
  const map = new Map<string, PresenceUser>();

  for (const record of records) {
    if (!record.email) continue;
    const { presence_ref, ...user } = record;
    map.set(user.email.toLowerCase(), user);
  }

  return Array.from(map.values()).sort((left, right) =>
    (left.name || left.email).localeCompare(right.name || right.email),
  );
}

function sameUsers(left: PresenceUser[], right: PresenceUser[]) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (
      left[index].email !== right[index].email ||
      left[index].name !== right[index].name ||
      left[index].user_id !== right[index].user_id ||
      left[index].online_at !== right[index].online_at
    ) {
      return false;
    }
  }

  return true;
}

export function useActiveUsers({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userEmail) return undefined;

    const channel = supabase.channel('platform-presence', {
      config: { presence: { key: userEmail.toLowerCase() } },
    });

    const syncUsers = () => {
      const state = channel.presenceState<PresenceUser>();
      const users = normalizePresenceUsers(
        Object.values(state).flat().filter((user): user is PresenceRecord => Boolean(user.email)),
      );

      setActiveUsers((current) => (sameUsers(current, users) ? current : users));
    };

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, syncUsers)
      .on('presence', { event: 'join' }, syncUsers)
      .on('presence', { event: 'leave' }, syncUsers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          await channel.track({
            user_id: userEmail.toLowerCase(),
            email: userEmail,
            name: userName || userEmail,
            online_at: new Date().toISOString(),
          });
          syncUsers();
          return;
        }

        setConnected(false);
      });

    return () => {
      channel.untrack().catch(() => undefined).finally(() => {
        void supabase.removeChannel(channel);
      });
    };
  }, [userEmail, userName]);

  return {
    activeUsers,
    connected,
    count: activeUsers.length,
  };
}
