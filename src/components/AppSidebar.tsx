import { useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, Megaphone, ListTodo, Users, FileInput, Shield,
  Link2, FileText, ArrowRightLeft, AlertTriangle, Trophy, Layers, BarChart3,
  Eye, FileBarChart, Archive, UserCog, Download, Upload, Settings, GraduationCap,
  ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Personal', path: '/personal', icon: User },
  { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
  { label: 'Tasks', path: '/tasks', icon: ListTodo },
  { label: 'Community Team', path: '/community-team', icon: Users },
  { label: 'Campaign Intake', path: '/campaign-intake', icon: FileInput },
  { label: 'Coverage', path: '/coverage', icon: Shield },
  { label: 'Widgets', path: '/widgets', icon: Link2 },
  { label: 'Update Organizer', path: '/update-organizer', icon: FileText },
  { label: 'Handover', path: '/handover', icon: ArrowRightLeft },
  { label: 'Mistakes', path: '/mistakes', icon: AlertTriangle },
  { label: 'Successes', path: '/successes', icon: Trophy },
  { label: 'Functions', path: '/functions', icon: Layers },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Member Views', path: '/member-views', icon: Eye, adminOnly: true },
  { label: 'Reports', path: '/reports', icon: FileBarChart, adminOnly: true },
  { label: 'Archive', path: '/archive', icon: Archive },
  { label: 'User Management', path: '/user-management', icon: UserCog, adminOnly: true },
  { label: 'Data Export', path: '/data-export', icon: Download },
  { label: 'Data Import', path: '/data-import', icon: Upload },
  { label: 'Settings', path: '/settings', icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 bottom-0 z-40 hidden lg:flex flex-col bg-sidebar-bg border-r border-sidebar-border"
    >
      <div className="flex items-center justify-between p-4 h-16">
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-black tracking-tight text-sidebar-fg-active">
            Trygc
          </motion.span>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border transition-colors">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2 space-y-0.5">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-sidebar-border text-sidebar-fg-active'
                  : 'text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar-bg border-sidebar-border p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex items-center justify-between p-4 h-16 border-b border-sidebar-border">
          <span className="text-lg font-black tracking-tight text-sidebar-fg-active">Trygc</span>
        </div>
        <nav className="overflow-y-auto scrollbar-thin py-2 px-2 space-y-0.5 h-[calc(100vh-64px)]">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-border text-sidebar-fg-active'
                    : 'text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50'
                )}
              >
                <item.icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
