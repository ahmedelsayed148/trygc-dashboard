import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from '../lib/routerCompat';
import { AppContext } from './Root';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { getVisibleNavItems, NAV_SECTIONS } from '../lib/navigation';

interface SidebarProps {
  isAdmin: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ─── Tooltip wrapper ───
function NavTooltip({ label, children, show }: { label: string; children: React.ReactNode; show: boolean }) {
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

// ─── Single nav link ───
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
        className={({ isActive }) =>
          `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
            isActive
              ? 'bg-white text-black shadow-lg'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
          } ${isCollapsed ? 'justify-center' : ''}`
        }
      >
        {({ isActive }) => (
          <>
            <item.icon
              className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                isActive ? 'text-black' : 'text-zinc-400 group-hover:text-white'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 overflow-hidden truncate whitespace-nowrap text-sm font-bold">
                {item.label}
              </span>
            )}
            {!isCollapsed && item.badge && !isActive && (
              <span className="ml-auto text-[8px] font-black bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {item.badge}
              </span>
            )}
            {isActive && (
              <div className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-black" />
            )}
          </>
        )}
      </NavLink>
    </NavTooltip>
  );
}

// ─── Section label ───
function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  return (
    <div className={`mt-4 mb-1 ${isCollapsed ? 'flex justify-center' : 'px-3'}`}>
      {isCollapsed ? (
        <div className="w-4 h-px bg-zinc-800" />
      ) : (
        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
          {label}
        </p>
      )}
    </div>
  );
}

// ─── Main Sidebar ───
export function Sidebar({ isAdmin, isCollapsed, onToggleCollapse }: SidebarProps) {
  const ctx = useContext(AppContext);
  const userFeatures = ctx?.userFeatures as string[] | null;
  const userEmail = ctx?.userEmail || '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navItems = getVisibleNavItems({ isAdmin, userEmail, userFeatures });

  // Build sections only with available items
  const builtSections = NAV_SECTIONS.map(s => ({
    label: s.label,
    items: navItems.filter(item => s.items.includes(item.to)),
  })).filter(s => s.items.length > 0);

  const sidebarContent = (collapsed: boolean, mobile = false) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex-shrink-0 flex items-center border-b border-zinc-800 ${collapsed ? 'justify-center p-4' : 'justify-between p-5'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? '' : ''}`}>
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-black" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-black tracking-tight leading-none text-white whitespace-nowrap">Trygc</h1>
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">OPS Command</span>
            </div>
          )}
        </div>
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors ml-2">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
        {builtSections.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <SectionLabel label={section.label} isCollapsed={collapsed} />}
            {si === 0 && !collapsed && (
              <p className="px-3 py-1 mb-1 text-[8px] font-black text-zinc-600 uppercase tracking-widest">{section.label}</p>
            )}
            {si === 0 && collapsed && <div className="mb-1" />}
            {section.items.map(item => (
              <SidebarLink
                key={item.to}
                item={item}
                isCollapsed={collapsed}
                onClick={mobile ? () => setMobileOpen(false) : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="flex-shrink-0 p-3 border-t border-zinc-800">
        {!mobile && (
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <span className="text-xs font-bold">Collapse</span>
                <ChevronLeft className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-2xl border border-zinc-800"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-zinc-800 bg-black text-white shadow-2xl">
            {sidebarContent(false, true)}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col overflow-hidden border-r border-zinc-800 bg-black text-white transition-[width] duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {sidebarContent(isCollapsed)}
      </aside>
    </>
  );
}
