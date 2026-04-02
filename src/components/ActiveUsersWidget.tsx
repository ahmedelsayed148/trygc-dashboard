import React from 'react';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveUsers } from '@/hooks/use-active-users';

interface ActiveUsersWidgetProps {
  userEmail: string;
  userName: string;
}

export function ActiveUsersWidget({ userEmail, userName }: ActiveUsersWidgetProps) {
  const { activeUsers, connected, count } = useActiveUsers({ userEmail, userName });

  return (
    <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Live Active Users
        </span>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Connecting…</span>
            </>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="flex items-end gap-3 mb-4">
        <motion.div
          key={count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-5xl font-black text-zinc-900 dark:text-zinc-50 leading-none"
        >
          {count}
        </motion.div>
        <div className="pb-1">
          <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400 leading-tight">
            {count === 1 ? 'user' : 'users'}
          </div>
          <div className="text-[11px] font-medium text-zinc-400 leading-tight">online now</div>
        </div>
      </div>

      {/* User list */}
      <div className="space-y-1.5">
        {activeUsers.length > 0 ? (
          activeUsers.map((user) => (
            <motion.div
              key={user.email}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-zinc-50 dark:bg-zinc-900"
            >
              {/* Avatar initials */}
              <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase">
                  {(user.name || user.email).charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                  {user.name || user.email}
                </div>
                {user.name && (
                  <div className="text-[10px] text-zinc-400 truncate">{user.email}</div>
                )}
              </div>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            </motion.div>
          ))
        ) : (
          <div className={cn('flex flex-col items-center justify-center py-6 text-zinc-400', !connected && 'opacity-50')}>
            <Radio className="w-7 h-7 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">{connected ? 'No other users online' : 'Connecting to presence…'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
