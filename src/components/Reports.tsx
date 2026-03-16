import React, { useContext, useDeferredValue, useState, useMemo, useEffect, useRef } from 'react';
import { AppContext } from './Root';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar,
  CartesianGrid, Legend,
} from 'recharts';
import {
  FileText, Download, Calendar, Filter, TrendingUp, BarChart3,
  Users, Target, AlertCircle, CheckCircle2, Clock, Zap,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Activity,
} from 'lucide-react';

// ─── Animated counter hook ───
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return value;
}

// ─── Animated stat card ───
function StatCard({
  label, value, icon: Icon, trend, trendLabel, delay = 0,
}: { label: string; value: number | string; icon: React.ElementType; trend?: 'up' | 'down' | 'flat'; trendLabel?: string; delay?: number }) {
  const numericVal = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  const animated  = useCountUp(numericVal, 900 + delay * 100);
  const display   = typeof value === 'string' && value.endsWith('%')
    ? `${animated}%`
    : animated.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.4 }}
      className="bg-white dark:bg-zinc-950 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-white dark:text-black" />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            trend === 'up'   ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' :
            trend === 'down' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'                   :
                               'bg-zinc-50  dark:bg-zinc-900  text-zinc-400'
          }`}>
            {trend === 'up'   && <ArrowUpRight   className="w-3 h-3" />}
            {trend === 'down' && <ArrowDownRight  className="w-3 h-3" />}
            {trend === 'flat' && <Minus           className="w-3 h-3" />}
            {trendLabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
        <p className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mt-1 tabular-nums">{display}</p>
      </div>
    </motion.div>
  );
}

// ─── Custom tooltip for recharts ───
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-xl px-3 py-2 shadow-2xl text-xs font-bold space-y-1 border border-zinc-700 dark:border-zinc-300">
      {label && <p className="text-zinc-400 dark:text-zinc-600 text-[10px] uppercase tracking-wider mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.stroke || '#fff' }} />
          {p.name}: <span className="font-black">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3 },
  { id: 'tasks',        label: 'Tasks',        icon: FileText },
  { id: 'performance',  label: 'Performance',  icon: TrendingUp },
  { id: 'team',         label: 'Team',         icon: Users },
];

const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all',   label: 'All Time' },
];

const MONO_PALETTE = ['#09090b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];

export function Reports() {
  const ctx = useContext(AppContext);
  const tasks       = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const successLogs = ctx?.successLogs || [];
  const isAdmin     = ctx?.isAdmin     || false;
  const deferredTasks = useDeferredValue(tasks);
  const deferredSuccessLogs = useDeferredValue(successLogs);

  const [tab,       setTab]       = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ─── Filter tasks by date range ───
  const filteredTasks = useMemo(() => {
    if (dateRange === 'all') return deferredTasks;
    const now  = new Date();
    const cutoff = new Date(now);
    if (dateRange === 'today') cutoff.setHours(0, 0, 0, 0);
    else if (dateRange === 'week')  cutoff.setDate(now.getDate() - 7);
    else if (dateRange === 'month') cutoff.setDate(now.getDate() - 30);
    return deferredTasks.filter((t: any) => {
      const d = t.createdAt || t.timestamp;
      return d ? new Date(d) >= cutoff : true;
    });
  }, [deferredTasks, dateRange]);

  // ─── Computed stats ───
  const stats = useMemo(() => {
    const total        = filteredTasks.length;
    const done         = filteredTasks.filter((t: any) => t.status === 'Done').length;
    const inProgress   = filteredTasks.filter((t: any) => t.status === 'In Progress').length;
    const pending      = filteredTasks.filter((t: any) => t.status === 'Pending').length;
    const blocked      = filteredTasks.filter((t: any) => t.status === 'Blocked').length;
    const totalCON     = filteredTasks.reduce((a: number, b: any) => a + (b.metricCON    || 0), 0);
    const totalTarget  = filteredTasks.reduce((a: number, b: any) => a + (b.metricTarget || 0), 0);
    const highPriority = filteredTasks.filter((t: any) => t.priority === 'High').length;
    const agents       = [...new Set(filteredTasks.map((t: any) => t.assignedTo))].filter(Boolean).length;
    const completionRate  = total > 0 ? Math.round((done / total) * 100) : 0;
    const conAchievement  = totalTarget > 0 ? Math.round((totalCON / totalTarget) * 100) : 0;
    return { total, done, inProgress, pending, blocked, totalCON, totalTarget, highPriority, agents, completionRate, conAchievement };
  }, [filteredTasks]);

  // ─── Status distribution chart ───
  const statusData = useMemo(() => [
    { name: 'Done',        value: stats.done,       fill: '#09090b' },
    { name: 'In Progress', value: stats.inProgress, fill: '#52525b' },
    { name: 'Pending',     value: stats.pending,    fill: '#a1a1aa' },
    { name: 'Blocked',     value: stats.blocked,    fill: '#d4d4d8' },
  ].filter(d => d.value > 0), [stats]);

  // ─── Priority distribution ───
  const priorityData = useMemo(() => {
    const high   = filteredTasks.filter((t: any) => t.priority === 'High').length;
    const medium = filteredTasks.filter((t: any) => t.priority === 'Medium').length;
    const low    = filteredTasks.filter((t: any) => t.priority === 'Low').length;
    return [
      { name: 'High',   value: high,   fill: '#09090b' },
      { name: 'Medium', value: medium, fill: '#71717a' },
      { name: 'Low',    value: low,    fill: '#d4d4d8' },
    ].filter(d => d.value > 0);
  }, [filteredTasks]);

  // ─── Team workload chart ───
  const teamData = useMemo(() => {
    const map: Record<string, { name: string; total: number; done: number }> = {};
    filteredTasks.forEach((t: any) => {
      const agent = t.assignedTo || 'Unassigned';
      if (!map[agent]) map[agent] = { name: agent.split(' ')[0], total: 0, done: 0 };
      map[agent].total++;
      if (t.status === 'Done') map[agent].done++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filteredTasks]);

  // ─── Campaign distribution ───
  const campaignData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTasks.forEach((t: any) => {
      const c = t.campaign || 'Unknown';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.slice(0, 20), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredTasks]);

  // ─── Success logs over time ───
  const successTimeData = useMemo(() => {
    const buckets: Record<string, number> = {};
    deferredSuccessLogs.forEach((s: any) => {
      const key = s.date || 'Today';
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .slice(-10)
      .map(([date, count]) => ({ date, count }));
  }, [deferredSuccessLogs]);

  // ─── CSV export ───
  const exportCSV = (type: string) => {
    let csv = `--- TRYGC ${type.toUpperCase()} REPORT ---\n`;
    csv += `Generated: ${new Date().toLocaleString()}\nDate Range: ${dateRange}\n\n`;
    if (type === 'tasks') {
      csv += 'ID,Campaign,Description,Owner,Status,Priority,SLA(h),CON,COV,Target,Result\n';
      filteredTasks.forEach((t: any) => {
        csv += `${t.id},"${t.campaign}","${t.description}","${t.assignedTo}","${t.status}","${t.priority}",${t.slaHrs},${t.metricCON},${t.metricCOV},${t.metricTarget},"${t.resultSummary}"\n`;
      });
    } else {
      csv += `Total Tasks,${stats.total}\nCompleted,${stats.done}\nCompletion Rate,${stats.completionRate}%\nCON Achievement,${stats.conAchievement}%\nTeam Members,${stats.agents}\nSuccess Logs,${successLogs.length}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Trygc_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-zinc-400 dark:text-zinc-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mb-1">Admin Access Required</h2>
          <p className="text-sm text-zinc-500">Reports are only accessible to administrators.</p>
        </motion.div>
      </div>
    );
  }

  const hasData = filteredTasks.length > 0;

  return (
    <div className="px-4 py-6 md:px-6 space-y-7 max-w-7xl mx-auto">

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100">Reports</h1>
          <p className="text-zinc-500 font-medium mt-1">
            Live analytics · {filteredTasks.length.toLocaleString()} tasks · {successLogs.length} successes
          </p>
        </div>
        <button
          onClick={() => exportCSV('overview')}
          className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </motion.div>

      {/* ─── Date Range ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mr-1">
          <Calendar className="w-3.5 h-3.5" /> Range
        </span>
        {DATE_RANGES.map(r => (
          <button
            key={r.id}
            onClick={() => setDateRange(r.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
              dateRange === r.id
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </motion.div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks"    value={stats.total}          icon={Activity}   delay={0} />
        <StatCard label="Completed"      value={stats.done}           icon={CheckCircle2} trend="up" trendLabel={`${stats.completionRate}%`} delay={1} />
        <StatCard label="CON Rate"       value={`${stats.conAchievement}%`} icon={Target} trend={stats.conAchievement >= 80 ? 'up' : 'flat'} trendLabel="target" delay={2} />
        <StatCard label="Team Members"   value={stats.agents}         icon={Users}       delay={3} />
      </div>

      {/* ─── Tab Bar ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1.5 w-fit"
      >
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                active ? 'text-black dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="tabBg"
                  className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-xl shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10 hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* ─── Tab Panels ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab + dateRange}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Completion radial + status bar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Radial Completion */}
                <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col items-center justify-center">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Completion Rate</p>
                  {mounted && (
                    <ResponsiveContainer width="100%" height={180}>
                      <RadialBarChart
                        cx="50%" cy="50%" innerRadius="60%" outerRadius="85%"
                        startAngle={90} endAngle={90 - 360 * (stats.completionRate / 100)}
                        data={[{ value: stats.completionRate, fill: '#09090b' }]}
                      >
                        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f4f4f5' }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  )}
                  <p className="text-5xl font-black text-zinc-800 dark:text-zinc-100 -mt-4">{stats.completionRate}%</p>
                  <p className="text-xs text-zinc-400 mt-1">{stats.done} of {stats.total} done</p>
                </div>

                {/* Status bars */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Status Distribution
                  </p>
                  {hasData ? (
                    <div className="space-y-3.5">
                      {statusData.map((d, i) => (
                        <div key={d.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{d.name}</span>
                            <span className="text-sm font-black text-zinc-500">{d.value}</span>
                          </div>
                          <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.total > 0 ? (d.value / stats.total) * 100 : 0}%` }}
                              transition={{ delay: 0.1 * i, duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: d.fill }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState label="No task data" />
                  )}
                </div>
              </div>

              {/* Pie chart + success timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Priority pie */}
                <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Priority Breakdown
                  </p>
                  {hasData && priorityData.length > 0 && mounted ? (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={priorityData} cx="50%" cy="50%" innerRadius={44} outerRadius={70} dataKey="value" paddingAngle={3}>
                            {priorityData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2.5">
                        {priorityData.map(d => (
                          <div key={d.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{d.name}</span>
                            <span className="text-sm font-black text-zinc-500 ml-auto">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState label="No priority data" />
                  )}
                </div>

                {/* Successes over time */}
                <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Success Feed Activity
                  </p>
                  {successTimeData.length > 0 && mounted ? (
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={successTimeData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#09090b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#09090b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="count" stroke="#09090b" strokeWidth={2} fill="url(#areaGrad)" name="Successes" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState label="No success activity" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TASKS TAB */}
          {tab === 'tasks' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Done',        value: stats.done,        icon: CheckCircle2 },
                  { label: 'In Progress', value: stats.inProgress,  icon: RefreshCw },
                  { label: 'Pending',     value: stats.pending,     icon: Clock },
                  { label: 'Blocked',     value: stats.blocked,     icon: AlertCircle },
                ].map((s, i) => (
                  <StatCard key={s.label} {...s} delay={i} />
                ))}
              </div>

              {/* Campaign bar chart */}
              <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-4 h-4" /> Tasks by Campaign
                  </p>
                  <button
                    onClick={() => exportCSV('tasks')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>
                {campaignData.length > 0 && mounted ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={campaignData} margin={{ top: 4, right: 4, bottom: 30, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]}>
                        {campaignData.map((_, i) => (
                          <Cell key={i} fill={MONO_PALETTE[i % MONO_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState label="No campaign data" />
                )}
              </div>

              {/* Task table preview */}
              {filteredTasks.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Latest Tasks Preview (top 10)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800">
                          {['Campaign', 'Owner', 'Status', 'Priority'].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.slice(0, 10).map((t: any, i: number) => (
                          <motion.tr
                            key={t.id || i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                          >
                            <td className="px-5 py-3 font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">{t.campaign || '—'}</td>
                            <td className="px-5 py-3 text-zinc-500 truncate max-w-[140px]">{t.assignedTo || '—'}</td>
                            <td className="px-5 py-3">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="px-5 py-3">
                              <PriorityBadge priority={t.priority} />
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {tab === 'performance' && (
            <div className="space-y-6">
              {/* KPI meters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KpiMeter label="Task Completion Rate" value={stats.completionRate} />
                <KpiMeter label="CON Achievement"       value={stats.conAchievement} />
              </div>

              {/* Stacked bar: done vs total per team member */}
              <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Team Member Workload
                </p>
                {teamData.length > 0 && mounted ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={teamData} margin={{ top: 4, right: 4, bottom: 30, left: -20 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                      <Bar dataKey="total" name="Assigned" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="done"  name="Done"     fill="#09090b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState label="No team data" />
                )}
              </div>

              {/* Metrics summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'High Priority Tasks', value: stats.highPriority,                                       icon: Zap },
                  { label: 'Avg Tasks / Member',   value: stats.agents > 0 ? (stats.total / stats.agents).toFixed(1) : 0, icon: Users },
                  { label: 'Total CON Volume',     value: stats.totalCON,                                          icon: TrendingUp },
                ].map((s, i) => (
                  <StatCard key={s.label} {...s} value={typeof s.value === 'string' ? parseFloat(s.value) || 0 : s.value as number} delay={i} />
                ))}
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {tab === 'team' && (
            <div className="space-y-6">
              {/* Team cards */}
              {teamData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamData.map((member, i) => {
                    const pct = member.total > 0 ? Math.round((member.done / member.total) * 100) : 0;
                    return (
                      <motion.div
                        key={member.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center text-xs font-black text-white dark:text-black">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 truncate">{member.name}</p>
                            <p className="text-[10px] text-zinc-400">{member.total} tasks assigned</p>
                          </div>
                          <span className="text-lg font-black text-zinc-700 dark:text-zinc-300">{pct}%</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                            <span>Done: {member.done}</span>
                            <span>Remaining: {member.total - member.done}</span>
                          </div>
                          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: i * 0.06 + 0.2, duration: 0.6 }}
                              className="h-full bg-zinc-800 dark:bg-zinc-200 rounded-full"
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState label="No team member data yet" large />
              )}

              {/* Successes breakdown */}
              {successLogs.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Top Contributors (Successes)
                  </p>
                  {mounted && (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={Object.entries(
                          successLogs.reduce((acc: any, s: any) => {
                            acc[s.agent] = (acc[s.agent] || 0) + 1; return acc;
                          }, {})
                        ).map(([name, count]) => ({ name: name.split(' ')[0], count })).sort((a: any, b: any) => b.count - a.count).slice(0, 8)}
                        margin={{ top: 4, right: 4, bottom: 20, left: -20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Successes" fill="#09090b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── KPI Meter ───
function KpiMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
      <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">{label}</p>
      <div className="flex items-end justify-between mb-3">
        <p className="text-5xl font-black text-zinc-800 dark:text-zinc-100">{value}%</p>
        <div className={`text-xs font-black px-2 py-1 rounded-full ${
          value >= 80 ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black' :
          value >= 50 ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
        }`}>
          {value >= 80 ? '🔥 Excellent' : value >= 50 ? '⚡ Good' : '💡 Improve'}
        </div>
      </div>
      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
        />
      </div>
      <div className="flex justify-between mt-2 text-[9px] font-bold text-zinc-400">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  );
}

// ─── Status / Priority badges ───
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Done':        'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black',
    'In Progress': 'bg-zinc-600 dark:bg-zinc-400 text-white dark:text-black',
    'Pending':     'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300',
    'Blocked':     'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${map[status] || 'bg-zinc-100 text-zinc-400'}`}>
      {status || '—'}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    'High':   'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black',
    'Medium': 'bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200',
    'Low':    'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${map[priority] || 'bg-zinc-100 text-zinc-400'}`}>
      {priority || '—'}
    </span>
  );
}

// ─── Empty state ───
function EmptyState({ label, large }: { label: string; large?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${large ? 'py-20' : 'py-10'}`}>
      <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-3">
        <BarChart3 className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
      </div>
      <p className="text-sm font-bold text-zinc-400">{label}</p>
      <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">Upload tasks via XLSX to see live data</p>
    </div>
  );
}
