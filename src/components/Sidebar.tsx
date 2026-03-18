import React, { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from '../lib/routerCompat';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AppContext } from './Root';
import { getVisibleNavItems, NAV_SECTIONS } from '../lib/navigation';
import { ChevronLeft, ChevronRight, X, Zap } from 'lucide-react';

interface SidebarProps {
  isAdmin: boolean;
  isCollapsed: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (nextValue: boolean) => void;
  onToggleCollapse: () => void;
}

function NavTooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
      {show && hovered && (
        <div className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 pointer-events-none">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-2xl">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  item,
  isCollapsed,
  onClick,
}: {
  item: { to: string; label: string; icon: React.ElementType; end?: boolean; badge?: string };
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <NavTooltip label={item.label} show={isCollapsed}>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onClick}
        title={isCollapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 group relative app-sidebar-link',
            isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2',
            isActive
              ? ''
              : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-50'
          )
        }
      >
        {({ isActive }) => (
          <>
            <item.icon className={cn('w-4 h-4 shrink-0 transition-transform duration-150', isActive && 'scale-110')} />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {item.badge !== undefined && !isCollapsed && (
              <span
                className="ml-auto min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full flex items-center justify-center"
                style={isActive
                  ? { background: 'rgba(var(--app-primary-contrast-rgb,255 255 255),0.2)', color: 'rgb(var(--app-primary-contrast-rgb,255 255 255))' }
                  : { background: 'var(--app-primary,#18181b)', color: 'rgb(var(--app-primary-contrast-rgb,255 255 255))' }
                }
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    </NavTooltip>
  );
}

export function Sidebar({
  isAdmin,
  isCollapsed,
  mobileOpen,
  onMobileOpenChange,
  onToggleCollapse,
}: SidebarProps) {
  const ctx = useContext(AppContext);
  const userFeatures = ctx?.userFeatures as string[] | null;
  const userEmail = ctx?.userEmail || '';
  const location = useLocation();
  const navItems = useMemo(
    () => getVisibleNavItems({ isAdmin, userEmail, userFeatures }),
    [isAdmin, userEmail, userFeatures],
  );

  useEffect(() => {
    onMobileOpenChange(false);
  }, [location.pathname, onMobileOpenChange]);

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => onMobileOpenChange(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <button
                onClick={() => onMobileOpenChange(false)}
                className="absolute right-3 top-3.5 z-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent
                navItems={navItems}
                isCollapsed={false}
                onToggleCollapse={onToggleCollapse}
                onLinkClick={() => onMobileOpenChange(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: isCollapsed ? 'var(--app-sidebar-collapsed-width, 68px)' : 'var(--app-sidebar-width, 220px)' }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={cn(
          'relative hidden h-full md:flex md:flex-col bg-white dark:bg-zinc-950',
          'border-r border-zinc-200 dark:border-zinc-800',
          'overflow-hidden shrink-0'
        )}
      >
        <SidebarContent navItems={navItems} isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />
      </motion.aside>
    </>
  );
}

function SidebarContent({
  navItems,
  isCollapsed,
  onToggleCollapse,
  onLinkClick,
}: {
  navItems: Array<{ to: string; label: string; icon: React.ElementType; end?: boolean; badge?: string }>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLinkClick?: () => void;
}) {
  return (
    <>
      {/* Logo / Brand */}
      <div className={cn(
        'flex h-14 shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800',
        isCollapsed ? 'justify-center px-4' : 'px-4 gap-2.5'
      )}>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--app-primary, #18181b)' }}
        >
          <Zap className="w-4 h-4" style={{ color: 'rgb(var(--app-primary-contrast-rgb, 255 255 255))' }} />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <span className="text-sm font-black text-zinc-900 dark:text-zinc-50 whitespace-nowrap tracking-tight">TryGC OPS</span>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
                Command Center
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-none">
        {NAV_SECTIONS.map(section => {
          const sectionItems = navItems.filter(item => section.items.includes(item.to));
          if (!sectionItems.length) return null;

          return (
            <div key={section.label} className="mb-1">
              {!isCollapsed && (
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-600 px-2 pt-3 pb-1">
                  {section.label}
                </p>
              )}
              {isCollapsed && <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-800/60 mx-2" />}

              {sectionItems.map(item => (
                <SidebarLink key={item.to} item={item} isCollapsed={isCollapsed} onClick={onLinkClick} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-1">
        {/* ⌘K hint */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
            >
              <span className="text-[10px] font-semibold text-zinc-400">Command palette</span>
              <kbd className="text-[9px] font-black text-zinc-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center justify-center rounded-lg transition-all duration-150',
            'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            isCollapsed ? 'w-10 h-8 mx-auto' : 'w-full h-8 gap-2'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
