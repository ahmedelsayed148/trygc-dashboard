import React, { Suspense, useContext, useMemo, useState } from 'react';
import { AppContext } from './Root';
import { useNavigate } from '../lib/routerCompat';
import { isTaskAssignedToUser } from '../lib/operations';
import { DateRangeFilter } from './DateRangeFilter';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle2,
  Target,
  AlertCircle,
  Users,
  Calendar,
  ArrowRight,
  Activity,
  Award,
  Zap,
  BarChart3,
  ChevronRight,
  Flame,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LazyActiveUsersWidget = React.lazy(() =>
  import('./ActiveUsersWidget').then((module) => ({ default: module.ActiveUsersWidget })),
);

const EASE = [0.22, 1, 0.36, 1] as const;
const NOW_MS = 1000 * 60 * 60;

type TaskLike = {
  id?: string | number;
  campaign?: string;
  title?: string;
  status?: string;
  assignedTo?: string;
  metricCON?: number;
  metricTarget?: number;
  slaHrs?: number;
  startDateTime?: string;
  endDateTime?: string;
  createdAt?: string;
};

type SuccessLike = {
  id?: string;
  agent?: string;
  detail?: string;
  time?: string;
  timestamp?: string;
  createdAt?: string;
  date?: string;
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } } },
};

export function Dashboard() {
  const ctx = useContext(AppContext);
  const operationalTasks = ctx?.operationalTasks;
  const fallbackTasks = ctx?.tasks;
  const rawSuccessLogs = ctx?.successLogs;
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';
  const isAdmin = ctx?.isAdmin || false;
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(emptyDateRange);

  const toMs = (value?: string) => {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const myTasks = useMemo(() => {
    const sourceTasks = (operationalTasks?.length ? operationalTasks : fallbackTasks) ?? [];
    const typedTasks = sourceTasks as TaskLike[];
    if (isAdmin) return typedTasks;
    return typedTasks.filter((task) => isTaskAssignedToUser(task, { userEmail, userName }));
  }, [fallbackTasks, isAdmin, operationalTasks, userEmail, userName]);

  const filteredSuccessesSource = useMemo(
    () => (rawSuccessLogs ?? []) as SuccessLike[],
    [rawSuccessLogs],
  );

  const filteredTasks = useMemo(
    () => filterByDateRange(myTasks, dateRange, (task: TaskLike) => task.endDateTime || task.startDateTime || task.createdAt),
    [dateRange, myTasks],
  );

  const filteredSuccesses = useMemo(
    () => filterByDateRange(filteredSuccessesSource, dateRange, (log: SuccessLike) => log.timestamp || log.createdAt || log.date),
    [dateRange, filteredSuccessesSource],
  );

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    let done = 0;
    let inProgress = 0;
    let blocked = 0;
    let overdue = 0;
    let totalCON = 0;
    let totalTarget = 0;

    const now = Date.now();
    for (const task of filteredTasks as TaskLike[]) {
      const status = task.status || '';
      if (status === 'Done') done += 1;
      if (status === 'In Progress') inProgress += 1;
      if (status === 'Blocked') blocked += 1;

      totalCON += task.metricCON || 0;
      totalTarget += task.metricTarget || 0;

      if (status !== 'Done' && (task.slaHrs || 0) > 0) {
        const startMs = toMs(task.startDateTime);
        const endMs = toMs(task.endDateTime) || now;
        const agingHrs = (endMs - startMs) / NOW_MS;
        if (startMs > 0 && agingHrs > (task.slaHrs || 0)) overdue += 1;
      }
    }

    const achievementRate = totalTarget > 0 ? Math.min(Math.round((totalCON / totalTarget) * 100), 100) : 0;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, blocked, overdue, totalCON, totalTarget, achievementRate, completionRate };
  }, [filteredTasks]);

  const recentTasks = useMemo(() => {
    return [...filteredTasks]
      .sort((a: TaskLike, b: TaskLike) => new Date(b.startDateTime || b.createdAt || 0).getTime() - new Date(a.startDateTime || a.createdAt || 0).getTime())
      .slice(0, 6);
  }, [filteredTasks]);

  const recentSuccesses = useMemo(() => filteredSuccesses.slice(0, 5), [filteredSuccesses]);

  const teamPerformance = useMemo(() => {
    if (!isAdmin) return [];
    const byAgent = new Map<string, { total: number; done: number }>();
    for (const task of filteredTasks as TaskLike[]) {
      const name = task.assignedTo;
      if (!name) continue;
      const prev = byAgent.get(name) || { total: 0, done: 0 };
      prev.total += 1;
      if (task.status === 'Done') prev.done += 1;
      byAgent.set(name, prev);
    }

    return Array.from(byAgent.entries())
      .map(([name, counts]) => ({
        name,
        total: counts.total,
        done: counts.done,
        score: counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [filteredTasks, isAdmin]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = (userName || userEmail).split(' ')[0] || 'there';
  const focusChips = useMemo(() => {
    const items = [];
    items.push(`${stats.done} cleared`);
    if (stats.inProgress > 0) items.push(`${stats.inProgress} active`);
    if (stats.overdue > 0) items.push(`${stats.overdue} urgent`);
    if (stats.achievementRate > 0) items.push(`${stats.achievementRate}% target hit`);
    return items.slice(0, 4);
  }, [stats.achievementRate, stats.done, stats.inProgress, stats.overdue]);

  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="app-dashboard-grid-glow space-y-6"
    >
      {/* Hero Header */}
      <motion.div variants={stagger.item}>
        <div className="app-hero-panel relative overflow-hidden rounded-[var(--app-card-radius)] border p-6 md:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(var(--app-primary-contrast-rgb), 0.22) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
            }}
          />
          <div
            className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full blur-3xl"
            style={{ background: 'rgba(var(--app-secondary-rgb), 0.22)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-0 h-56 w-56 rounded-full blur-3xl"
            style={{ background: 'rgba(var(--app-primary-rgb), 0.18)' }}
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="app-hero-kicker mb-1 text-xs font-bold uppercase tracking-[0.2em]">{greeting}</p>
              <h1 className="app-hero-title text-2xl font-black tracking-tight md:text-3xl">
                {displayName}
              </h1>
              <p className="app-hero-copy mt-1.5 max-w-2xl text-sm font-medium">
                {isAdmin
                  ? `${stats.total} tasks across the team · ${stats.overdue > 0 ? `${stats.overdue} overdue` : 'all on track'}`
                  : `${stats.total} tasks assigned · ${stats.completionRate}% completion rate`}
              </p>
              {focusChips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {focusChips.map((chip) => (
                    <span key={chip} className="app-hero-chip rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="app-hero-chip rounded-xl border px-3 py-2 text-xs font-bold backdrop-blur-sm flex items-center gap-2">
                <Calendar className="app-hero-kicker h-3.5 w-3.5" />
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              {stats.overdue > 0 && (
                <div className="app-hero-chip rounded-xl border bg-red-500/16 px-3 py-2 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {stats.overdue} overdue
                </div>
              )}
            </div>
          </div>

          {/* Mini progress bar */}
          {stats.total > 0 && (
            <div className="relative mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="app-hero-kicker text-[11px] font-bold uppercase tracking-wider">Team Progress</span>
                <span className="app-hero-copy text-[11px] font-black">{stats.completionRate}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.completionRate}%` }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: 'rgb(var(--app-secondary-rgb))' }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Date Filter */}
      <motion.div variants={stagger.item}>
        <DateRangeFilter label="Date Range" value={dateRange} onChange={setDateRange} />
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={stagger.item} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Tasks"
          value={stats.total}
          icon={ClipboardList}
          sub={`${stats.completionRate}% done`}
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <StatCard
          label="Completed"
          value={stats.done}
          icon={CheckCircle2}
          sub="finished"
          accent
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={Activity}
          sub="active now"
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          sub={stats.overdue > 0 ? 'needs attention' : 'all on track'}
          danger={stats.overdue > 0}
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
      </motion.div>

      {/* Active Users Widget — admin only */}
      {isAdmin && (
        <motion.div variants={stagger.item}>
          <Suspense fallback={<div className="h-[268px] rounded-[var(--app-card-radius)] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />}>
            <LazyActiveUsersWidget userEmail={userEmail} userName={userName} />
          </Suspense>
        </motion.div>
      )}

      {/* Middle Row */}
      <motion.div variants={stagger.item} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Achievement */}
        <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Achievement</span>
            <Target className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-4xl font-black text-zinc-900 dark:text-zinc-50 mb-1">{stats.achievementRate}%</div>
          <p className="text-xs font-medium text-zinc-500 mb-4">Target vs CON</p>
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.achievementRate}%` }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3">
              <div className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">CON</div>
              <div className="text-lg font-black text-zinc-800 dark:text-zinc-100">{stats.totalCON.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3">
              <div className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">Target</div>
              <div className="text-lg font-black text-zinc-800 dark:text-zinc-100">{stats.totalTarget.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Quick Actions</span>
            <Zap className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="space-y-2">
            <ActionRow label="View All Tasks" to={isAdmin ? '/tasks' : '/personal'} navigate={navigate} primary />
            {isAdmin && (
              <>
                <ActionRow label="Team Analytics" to="/analytics" navigate={navigate} />
                <ActionRow label="Live Ops Surface" to="/live-ops" navigate={navigate} />
                <ActionRow label="Member Views" to="/member-views" navigate={navigate} />
              </>
            )}
            <ActionRow label="Successes Feed" to="/successes" navigate={navigate} />
            {isAdmin && <ActionRow label="Coverage Board" to="/coverage" navigate={navigate} />}
          </div>
        </div>

        {/* Blocked / Status breakdown */}
        <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Status Breakdown</span>
            <BarChart3 className="w-4 h-4 text-zinc-400" />
          </div>
          {stats.total > 0 ? (
            <div className="space-y-3">
              {[
                { label: 'Done', value: stats.done, total: stats.total, color: 'bg-zinc-900 dark:bg-zinc-100' },
                { label: 'In Progress', value: stats.inProgress, total: stats.total, color: 'bg-zinc-500' },
                { label: 'Blocked', value: stats.blocked, total: stats.total, color: 'bg-zinc-300 dark:bg-zinc-600' },
                { label: 'Overdue', value: stats.overdue, total: stats.total, color: 'bg-red-500' },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{label}</span>
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{value}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
                      transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
                      className={cn('h-full rounded-full', color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
              <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium">No data yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={stagger.item} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Tasks */}
        <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Recent Tasks</span>
            <button
              onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
              className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentTasks.length > 0 ? (
              recentTasks.map((task: TaskLike) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 hover:border-[rgba(var(--app-primary-rgb),0.08)] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <StatusDot status={task.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{task.campaign || task.title || 'Untitled'}</div>
                    <div className="text-xs text-zinc-500 truncate">{task.assignedTo || 'Unassigned'}</div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))
            ) : (
              <EmptyState icon={ClipboardList} message="No tasks yet" />
            )}
          </div>
        </div>

        {/* Team Performance (admin) or Recent Successes (member) */}
        {isAdmin ? (
          <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Top Performers</span>
              <button
                onClick={() => navigate('/analytics')}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Analytics <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {teamPerformance.length > 0 ? (
                teamPerformance.map((member, idx) => (
                  <div key={member.name} className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 hover:border-[rgba(var(--app-primary-rgb),0.08)] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                      idx === 0 ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' :
                      idx === 1 ? 'bg-zinc-600 text-white' :
                      idx === 2 ? 'bg-zinc-400 text-white' :
                      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    )}>
                      {idx === 0 ? <Flame className="w-3.5 h-3.5" /> : `#${idx + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{member.name}</div>
                      <div className="text-xs text-zinc-500">{member.done}/{member.total} tasks</div>
                    </div>
                    <div className="text-sm font-black text-zinc-800 dark:text-zinc-100">{member.score}%</div>
                  </div>
                ))
              ) : (
                <EmptyState icon={Users} message="No team data yet" />
              )}
            </div>
          </div>
        ) : (
          <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Recent Successes</span>
              <button
                onClick={() => navigate('/successes')}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {recentSuccesses.length > 0 ? (
                recentSuccesses.map((success: SuccessLike) => (
                  <div key={success.id} className="flex items-start gap-3 rounded-2xl border border-transparent px-3 py-3 hover:border-[rgba(var(--app-primary-rgb),0.08)] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Star className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{success.agent}</div>
                      <div className="text-xs text-zinc-500 truncate-2">{success.detail}</div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 whitespace-nowrap mt-0.5">{success.time}</span>
                  </div>
                ))
              ) : (
                <EmptyState icon={Award} message="No successes logged yet" />
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, sub, accent, danger, onClick }: {
  label: string; value: number; icon: LucideIcon; sub: string;
  accent?: boolean; danger?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-[var(--app-card-radius)] border p-4 md:p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
        danger && value > 0
          ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20'
          : accent
          ? 'app-dashboard-metric-strong border-transparent text-[rgb(var(--app-primary-contrast-rgb))]'
          : 'app-dashboard-metric'
      )}
    >
      <div className="absolute inset-x-4 top-0 h-1 rounded-b-full bg-[rgba(var(--app-primary-rgb),0.12)]" />
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'w-10 h-10 rounded-2xl flex items-center justify-center',
          danger && value > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
          accent ? 'bg-white/18 text-white' :
          'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <ChevronRight className={cn(
          'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity',
          accent ? 'text-white/60 dark:text-zinc-900/60' : 'text-zinc-400'
        )} />
      </div>
      <div className={cn(
        'text-3xl font-black mb-0.5',
        danger && value > 0 ? 'text-red-600 dark:text-red-400' :
          accent ? 'text-white' :
          'text-zinc-900 dark:text-zinc-50'
      )}>
        {value}
      </div>
      <div className={cn(
        'text-[11px] font-black uppercase tracking-wider mb-0.5',
        accent ? 'text-white/70' : 'text-zinc-400'
      )}>
        {label}
      </div>
      <div className={cn(
        'text-[11px] font-medium',
        accent ? 'text-white/50' : 'text-zinc-400'
      )}>
        {sub}
      </div>
    </button>
  );
}

type NavigateFn = ReturnType<typeof useNavigate>;

function ActionRow({ label, to, navigate, primary }: { label: string; to: string; navigate: NavigateFn; primary?: boolean }) {
  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all group',
        primary
          ? 'rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
          : 'rounded-2xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
      )}
    >
      {label}
      <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <div className={cn(
      'w-2 h-2 rounded-full shrink-0',
      status === 'Done' ? 'bg-zinc-900 dark:bg-zinc-100' :
      status === 'In Progress' ? 'bg-zinc-500' :
      status === 'Blocked' ? 'bg-red-500' :
      'bg-zinc-300 dark:bg-zinc-600'
    )} />
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[10px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap',
      status === 'Done' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' :
      status === 'In Progress' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' :
      status === 'Blocked' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
      'bg-zinc-50 dark:bg-zinc-900 text-zinc-400'
    )}>
      {status}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
      <Icon className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}
