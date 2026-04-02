import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from '../lib/routerCompat';
import { AppContext } from './Root';
import { getVisibleNavItems } from '../lib/navigation';
import { cn } from '@/lib/utils';

const BOTTOM_NAV_ORDER = ['/', '/coverage', '/campaigns', '/successes', '/personal', '/tasks', '/settings'];

export function MobileBottomNav() {
  const ctx = useContext(AppContext);
  const userFeatures = ctx?.userFeatures as string[] | null;
  const userEmail = ctx?.userEmail || '';
  const isAdmin = ctx?.isAdmin || false;

  const allVisible = getVisibleNavItems({ isAdmin, userEmail, userFeatures });
  const bottomItems = BOTTOM_NAV_ORDER
    .map(to => allVisible.find(item => item.to === to))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 5);

  if (bottomItems.length === 0) return null;

  return (
    <motion.nav
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mobile-nav-safe lg:hidden fixed bottom-0 left-0 right-0 z-40 grid min-h-[var(--app-mobile-nav-height)] grid-flow-col auto-cols-fr items-center border-t border-zinc-200 bg-white/95 px-1 pt-1 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      {bottomItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-150',
              isActive ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="mobile-bottom-nav-active"
                  className="absolute inset-x-1 top-1 bottom-1 rounded-xl bg-zinc-100 dark:bg-zinc-800"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex h-7 w-8 items-center justify-center">
                <item.icon className={cn('h-[18px] w-[18px] transition-all duration-150', isActive && 'scale-110')} />
              </span>
              <span className={cn(
                'relative z-10 max-w-full truncate text-[9px] font-black uppercase tracking-[0.1em] leading-none transition-all duration-150',
                isActive ? 'opacity-100' : 'opacity-60'
              )}>
                {item.label.split(' ')[0]}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </motion.nav>
  );
}
