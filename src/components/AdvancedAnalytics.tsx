import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Users, AlertTriangle, CheckCircle2,
  Clock, Zap, Award, BarChart3, ArrowUpRight, ArrowDownRight, Flame,
  Shield, Activity, Eye
} from 'lucide-react';

interface Task {
  id: number | string;
  campaign: string;
  description: string;
  assignedTo: string;
  priority: string;
  status: string;
  category: string;
  slaHrs: number;
  startDateTime: string;
  endDateTime?: string;
  metricTarget?: number;
  metricCON?: number;
  metricCOV?: number;
  metricMissingDate?: number;
  metricWithDate?: number;
  metricMissingCOV?: number;
  metricConfirmationToday?: number;
  [key: string]: unknown;
}

interface SuccessLog {
  id?: number | string;
  agent?: string;
  createdAt?: string;
  date?: string;
  detail?: string;
  time?: string;
  timestamp?: string;
  type?: string;
  [key: string]: unknown;
}

interface AdvancedAnalyticsProps {
  tasks: Task[];
  successLogs: SuccessLog[];
}

// Monochrome chart palette
const CHART_COLORS = ['#000000', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#52525b', '#27272a'];

function calculateAging(start: string, end?: string) {
  if (!start) return 0;
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();
  return parseFloat(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1));
}

export function AdvancedAnalytics({ tasks, successLogs }: AdvancedAnalyticsProps) {
  // ========== CORE METRICS ==========
  const coreMetrics = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'Done').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const blocked = tasks.filter(t => t.status === 'Blocked').length;
    
    const totalCON = tasks.reduce((a, t) => a + (t.metricCON || 0), 0);
    const totalTarget = tasks.reduce((a, t) => a + (t.metricTarget || 0), 0);
    const totalCOV = tasks.reduce((a, t) => a + (t.metricCOV || 0), 0);
    const totalToday = tasks.reduce((a, t) => a + (t.metricConfirmationToday || 0), 0);
    const totalMissingDate = tasks.reduce((a, t) => a + (t.metricMissingDate || 0), 0);
    const totalWithDate = tasks.reduce((a, t) => a + (t.metricWithDate || 0), 0);
    const totalMissingCOV = tasks.reduce((a, t) => a + (t.metricMissingCOV || 0), 0);
    
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const conAchievementRate = totalTarget > 0 ? Math.round((totalCON / totalTarget) * 100) : 0;
    const coverageRate = totalCON > 0 ? Math.round((totalCOV / totalCON) * 100) : 0;
    
    const overdue = tasks.filter(t => {
      if (t.status === 'Done') return false;
      const aging = calculateAging(t.startDateTime, t.endDateTime);
      return aging > t.slaHrs;
    }).length;
    
    const avgSlaHrs = total > 0 ? (tasks.reduce((a, t) => a + (t.slaHrs || 0), 0) / total).toFixed(1) : '0';
    
    const slaCompliant = tasks.filter(t => {
      if (t.status !== 'Done') return false;
      const aging = calculateAging(t.startDateTime, t.endDateTime);
      return aging <= t.slaHrs;
    }).length;
    const slaComplianceRate = done > 0 ? Math.round((slaCompliant / done) * 100) : 100;

    return {
      total, done, inProgress, pending, blocked, totalCON, totalTarget, totalCOV,
      totalToday, totalMissingDate, totalWithDate, totalMissingCOV,
      completionRate, conAchievementRate, coverageRate, overdue, avgSlaHrs,
      slaComplianceRate, slaCompliant
    };
  }, [tasks]);

  // ========== CON vs TARGET per Campaign ==========
  const conVsTarget = useMemo(() => {
    const campaigns = [...new Set(tasks.map(t => t.campaign))].filter(Boolean);
    const uniqueData = campaigns.map((name, index) => {
      const ct = tasks.filter(t => t.campaign === name);
      const con = ct.reduce((a, t) => a + (t.metricCON || 0), 0);
      const target = ct.reduce((a, t) => a + (t.metricTarget || 0), 0);
      const cov = ct.reduce((a, t) => a + (t.metricCOV || 0), 0);
      const shortName = name.length > 25 ? name.substring(0, 25) + '...' : name;
      return { 
        name: `${shortName}`, // Ensure unique display name
        fullName: name, 
        CON: con, 
        Target: target, 
        COV: cov, 
        achievement: target > 0 ? Math.round((con / target) * 100) : 0,
        uniqueId: `campaign-${index}-${name.replace(/\s+/g, '-')}` // Unique identifier
      };
    }).sort((a, b) => b.CON - a.CON).slice(0, 10);
    
    // Deduplicate by name
    const seen = new Set();
    return uniqueData.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  }, [tasks]);

  // ========== AGENT PERFORMANCE RADAR ==========
  const agentRadar = useMemo(() => {
    const agents = [...new Set(tasks.map(t => t.assignedTo))].filter(Boolean);
    return agents.map(name => {
      const at = tasks.filter(t => t.assignedTo === name);
      const done = at.filter(t => t.status === 'Done').length;
      const total = at.length;
      const con = at.reduce((a, t) => a + (t.metricCON || 0), 0);
      const onTime = at.filter(t => {
        if (t.status !== 'Done') return false;
        return calculateAging(t.startDateTime, t.endDateTime) <= t.slaHrs;
      }).length;
      const blocked = at.filter(t => t.status === 'Blocked').length;
      
      return {
        name,
        Completion: total > 0 ? Math.round((done / total) * 100) : 0,
        SLA: done > 0 ? Math.round((onTime / done) * 100) : 100,
        Volume: Math.min(total * 10, 100),
        CON: Math.min(Math.round(con / 10), 100),
        Efficiency: total > 0 ? Math.round(((total - blocked) / total) * 100) : 100,
      };
    }).sort((a, b) => b.Completion - a.Completion).slice(0, 6);
  }, [tasks]);

  // ========== DAILY TASK TREND ==========
  const dailyTrend = useMemo(() => {
    const dayMap: Record<string, { created: number; completed: number; conToday: number }> = {};
    tasks.forEach(t => {
      if (t.startDateTime) {
        const day = t.startDateTime.split('T')[0];
        if (!dayMap[day]) dayMap[day] = { created: 0, completed: 0, conToday: 0 };
        dayMap[day].created++;
        dayMap[day].conToday += (t.metricConfirmationToday || 0);
      }
      if (t.endDateTime) {
        const day = t.endDateTime.split('T')[0];
        if (!dayMap[day]) dayMap[day] = { created: 0, completed: 0, conToday: 0 };
        dayMap[day].completed++;
      }
    });
    const sortedEntries = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14);
    
    // Deduplicate formatted dates to ensure unique keys for Recharts
    const seenDates = new Set<string>();
    return sortedEntries.map(([date, data], index) => {
      const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const uniqueDate = seenDates.has(formattedDate) ? `${formattedDate} (${index})` : formattedDate;
      seenDates.add(formattedDate);
      return {
        date: uniqueDate,
        fullDate: date,
        Created: data.created,
        Completed: data.completed,
        'Daily CON': data.conToday,
        uniqueKey: `trend-${index}-${date}` // Add unique key for Recharts
      };
    });
  }, [tasks]);

  // ========== PRIORITY BREAKDOWN ==========
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
    const colors: Record<string, string> = { High: '#18181b', Medium: '#71717a', Low: '#d4d4d8' };
    return Object.entries(counts)
      .filter(([name]) => name) // Filter out any null/undefined
      .map(([name, value]) => ({ name, value, fill: colors[name] || '#a1a1aa' }));
  }, [tasks]);

  // ========== STATUS FLOW ==========
  const statusFlow = useMemo(() => {
    const colors: Record<string, string> = { Done: '#18181b', 'In Progress': '#52525b', Pending: '#a1a1aa', Blocked: '#3f3f46' };
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts)
      .filter(([name]) => name) // Filter out any null/undefined
      .map(([name, value]) => ({ name, value, fill: colors[name] || '#a1a1aa' }));
  }, [tasks]);

  // ========== TOP BLOCKERS ==========
  const blockedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'Blocked' || (t.status !== 'Done' && calculateAging(t.startDateTime, t.endDateTime) > t.slaHrs))
      .sort((a, b) => calculateAging(b.startDateTime, b.endDateTime) - calculateAging(a.startDateTime, a.endDateTime))
      .slice(0, 8);
  }, [tasks]);

  // ========== FUNCTION DISTRIBUTION ==========
  const functionDistribution = useMemo(() => {
    const funcMap: Record<string, number> = {};
    const rules: Record<string, string[]> = {
      'Operations': ['execution', 'send', 'deliver', 'dispatch', 'process', 'batch', 'approve', 'ops'],
      'Follow-up': ['follow', 'reminder', 'call', 'callback', 'reach', 'contact', 'chase'],
      'Quality & Audit': ['audit', 'quality', 'check', 'verify', 'sync', 'review', 'qa'],
      'Creative': ['design', 'creative', 'content', 'copy', 'visual', 'banner', 'video'],
      'Client Mgmt': ['client', 'approval', 'feedback', 'brief', 'meeting'],
      'Reporting': ['report', 'analytics', 'data', 'dashboard', 'metric', 'kpi'],
      'Tech': ['system', 'api', 'integration', 'platform', 'bug', 'deploy'],
    };
    tasks.forEach(t => {
      const text = `${t.description} ${t.category}`.toLowerCase();
      let best = 'Operations';
      let bestScore = 0;
      for (const [func, kws] of Object.entries(rules)) {
        const score = kws.filter(kw => text.includes(kw)).length;
        if (score > bestScore) { bestScore = score; best = func; }
      }
      funcMap[best] = (funcMap[best] || 0) + 1;
    });
    return Object.entries(funcMap)
      .filter(([name]) => name) // Filter out any null/undefined
      .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [tasks]);

  // ========== LEADERBOARD ==========
  const leaderboard = useMemo(() => {
    const agents = [...new Set(tasks.map(t => t.assignedTo))].filter(Boolean);
    return agents.map(name => {
      const at = tasks.filter(t => t.assignedTo === name);
      const done = at.filter(t => t.status === 'Done').length;
      const total = at.length;
      const con = at.reduce((a, t) => a + (t.metricCON || 0), 0);
      const onTime = at.filter(t => {
        if (t.status !== 'Done') return false;
        return calculateAging(t.startDateTime, t.endDateTime) <= t.slaHrs;
      }).length;
      const score = (done * 30) + (con * 0.1) + (onTime * 20);
      return { name, done, total, con, slaRate: done > 0 ? Math.round((onTime / done) * 100) : 100, score: Math.round(score) };
    }).sort((a, b) => b.score - a.score);
  }, [tasks]);

  // ========== COV ANALYSIS ==========
  const covAnalysis = useMemo(() => {
    const campaigns = [...new Set(tasks.map(t => t.campaign))].filter(Boolean);
    return campaigns.map(name => {
      const ct = tasks.filter(t => t.campaign === name);
      const con = ct.reduce((a, t) => a + (t.metricCON || 0), 0);
      const cov = ct.reduce((a, t) => a + (t.metricCOV || 0), 0);
      const missingCov = ct.reduce((a, t) => a + (t.metricMissingCOV || 0), 0);
      const shortName = name.length > 20 ? name.substring(0, 20) + '...' : name;
      return { name: shortName, Covered: cov, 'Missing COV': missingCov, rate: con > 0 ? Math.round((cov / con) * 100) : 0 };
    }).filter(c => c.Covered > 0 || c['Missing COV'] > 0).slice(0, 8);
  }, [tasks]);

  // Chart tooltip style
  const tooltipStyle = { backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: 12, fontSize: 11, fontWeight: 600, color: 'var(--foreground)' };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ========== KPI CARDS ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <KpiCard icon={Target} label="Total Tasks" value={coreMetrics.total} color="bg-black dark:bg-white dark:text-black" />
        <KpiCard icon={CheckCircle2} label="Completion" value={`${coreMetrics.completionRate}%`} color="bg-zinc-700 dark:bg-zinc-300 dark:text-black" trend={coreMetrics.completionRate >= 70 ? 'up' : 'down'} />
        <KpiCard icon={TrendingUp} label="CON Achievement" value={`${coreMetrics.conAchievementRate}%`} color="bg-zinc-600 dark:bg-zinc-400 dark:text-black" sub={`${coreMetrics.totalCON} / ${coreMetrics.totalTarget}`} trend={coreMetrics.conAchievementRate >= 80 ? 'up' : 'down'} />
        <KpiCard icon={Shield} label="SLA Compliance" value={`${coreMetrics.slaComplianceRate}%`} color="bg-zinc-500" sub={`${coreMetrics.slaCompliant} on-time`} trend={coreMetrics.slaComplianceRate >= 80 ? 'up' : 'down'} />
        <KpiCard icon={AlertTriangle} label="At Risk" value={coreMetrics.overdue + coreMetrics.blocked} color="bg-zinc-900 dark:bg-zinc-100 dark:text-black" sub={`${coreMetrics.overdue} overdue, ${coreMetrics.blocked} blocked`} />
        <KpiCard icon={Zap} label="Today's CON" value={coreMetrics.totalToday} color="bg-zinc-800 dark:bg-zinc-200 dark:text-black" />
      </div>

      {/* ========== EXECUTIVE INSIGHT BANNER ========== */}
      <div className="app-hero-panel p-8 rounded-[2rem] shadow-2xl relative overflow-hidden border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.05),transparent_70%)] dark:bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.05),transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 app-hero-kicker" />
            <h2 className="app-hero-kicker text-sm font-black uppercase tracking-widest">Executive Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InsightCard
              title="Overall Health"
              status={coreMetrics.completionRate >= 70 ? 'good' : coreMetrics.completionRate >= 40 ? 'warning' : 'critical'}
              message={coreMetrics.completionRate >= 70
                ? `Strong execution at ${coreMetrics.completionRate}% completion. Team is on track.`
                : coreMetrics.completionRate >= 40
                ? `Moderate progress at ${coreMetrics.completionRate}%. ${coreMetrics.pending} tasks pending attention.`
                : `Low completion at ${coreMetrics.completionRate}%. Immediate attention needed on ${coreMetrics.overdue} overdue tasks.`}
            />
            <InsightCard
              title="CON Pipeline"
              status={coreMetrics.conAchievementRate >= 80 ? 'good' : coreMetrics.conAchievementRate >= 50 ? 'warning' : 'critical'}
              message={`${coreMetrics.totalCON} confirmations achieved against ${coreMetrics.totalTarget} target (${coreMetrics.conAchievementRate}%). Coverage rate: ${coreMetrics.coverageRate}%.`}
            />
            <InsightCard
              title="Risk Assessment"
              status={coreMetrics.overdue === 0 && coreMetrics.blocked === 0 ? 'good' : coreMetrics.overdue <= 3 ? 'warning' : 'critical'}
              message={coreMetrics.overdue === 0 && coreMetrics.blocked === 0
                ? 'No critical risks detected. All tasks within SLA boundaries.'
                : `${coreMetrics.overdue} tasks breaching SLA and ${coreMetrics.blocked} blocked. ${coreMetrics.totalMissingDate} records missing date data.`}
            />
          </div>
        </div>
      </div>

      {/* ========== METRICS DEEP DIVE ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricBox label="Total CON" value={coreMetrics.totalCON} />
        <MetricBox label="Total Target" value={coreMetrics.totalTarget} />
        <MetricBox label="Total COV" value={coreMetrics.totalCOV} />
        <MetricBox label="Today CON" value={coreMetrics.totalToday} />
        <MetricBox label="Missing Date" value={coreMetrics.totalMissingDate} />
        <MetricBox label="With Date" value={coreMetrics.totalWithDate} />
        <MetricBox label="Missing COV" value={coreMetrics.totalMissingCOV} />
      </div>

      {/* ========== CHARTS ROW 1 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CON vs Target */}
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-zinc-500" /> CON vs Target by Campaign
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={conVsTarget} margin={{ left: 10, right: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="Target" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CON" fill="#18181b" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="COV" stroke="#71717a" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Trend */}
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500" /> Task Velocity & Daily CON
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ left: 10, right: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="advAnalyticsColorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="advAnalyticsColorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Area type="monotone" dataKey="Created" stroke="#18181b" fill="url(#advAnalyticsColorCreated)" strokeWidth={2} />
                <Area type="monotone" dataKey="Completed" stroke="#71717a" fill="url(#advAnalyticsColorCompleted)" strokeWidth={2} />
                <Line type="monotone" dataKey="Daily CON" stroke="#a1a1aa" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========== CHARTS ROW 2 ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Priority Pie */}
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Priority Breakdown</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={4}>
                  {priorityData.map((entry, i) => <Cell key={`priority-cell-${i}-${entry.name}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie */}
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Status Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusFlow} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={4}>
                  {statusFlow.map((entry, i) => <Cell key={`status-cell-${i}-${entry.name}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Function Distribution */}
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Function Classification</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={functionDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={3}>
                  {functionDistribution.map((entry, i) => <Cell key={`func-cell-${i}-${entry.name}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========== COV ANALYSIS ========== */}
      {covAnalysis.length > 0 && (
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-500" /> Coverage (COV) Analysis
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={covAnalysis} margin={{ left: 10, right: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="Covered" stackId="a" fill="#3f3f46" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Missing COV" stackId="a" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ========== LEADERBOARD + AGENT RADAR ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <h3 className="text-xs font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4" /> Performance Leaderboard
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {leaderboard.map((agent, i) => (
              <div key={agent.name} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${i === 0 ? 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700' : i <= 2 ? 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-black text-white dark:bg-white dark:text-black' : i === 1 ? 'bg-zinc-600 text-white dark:bg-zinc-400 dark:text-black' : i === 2 ? 'bg-zinc-400 text-white dark:bg-zinc-500 dark:text-white' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase truncate">{agent.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{agent.done}/{agent.total} done</span>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{agent.con} CON</span>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{agent.slaRate}% SLA</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-zinc-800 dark:text-zinc-100">{agent.score}</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Points</p>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-center text-sm text-zinc-400 py-8">No agents assigned yet</p>}
          </div>
        </div>

        {/* Agent Radar */}
        {agentRadar.length > 0 && (
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" /> Agent Performance Radar
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={agentRadar.slice(0, 4)} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#d4d4d8" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a', fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                  <Radar name="Completion" dataKey="Completion" stroke="#18181b" fill="#18181b" fillOpacity={0.2} />
                  <Radar name="SLA" dataKey="SLA" stroke="#71717a" fill="#71717a" fillOpacity={0.1} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ========== AT-RISK TASKS ========== */}
      {blockedTasks.length > 0 && (
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border-2 border-zinc-300 dark:border-zinc-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3">
            <div className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded-xl"><Flame className="w-5 h-5 text-zinc-700 dark:text-zinc-300" /></div>
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">At-Risk & Blocked Tasks</h3>
              <p className="text-[10px] text-zinc-500 font-medium">{blockedTasks.length} tasks requiring immediate attention</p>
            </div>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {blockedTasks.map(task => {
              const aging = calculateAging(task.startDateTime, task.endDateTime);
              const isOverSLA = aging > task.slaHrs;
              return (
                <div key={task.id} className="px-6 py-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs ${task.status === 'Blocked' ? 'bg-zinc-900 dark:bg-zinc-200 dark:text-black' : 'bg-zinc-700 dark:bg-zinc-400 dark:text-black'}`}>
                    {task.status === 'Blocked' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 truncate">{task.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{task.campaign}</span>
                      <span className="text-[10px] font-bold text-zinc-500">{task.assignedTo}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${isOverSLA ? 'text-zinc-900 dark:text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{aging}h / {task.slaHrs}h</p>
                    <p className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${task.status === 'Blocked' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                      {task.status === 'Blocked' ? 'BLOCKED' : 'SLA BREACH'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== SUB-COMPONENTS ==========

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  color: string;
  sub?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend === 'up' ? 'Good' : 'Low'}
          </div>
        )}
      </div>
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
      <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 leading-none">{value}</p>
      {sub && <p className="text-[10px] font-bold text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

function InsightCard({ title, status, message }: { title: string; status: 'good' | 'warning' | 'critical'; message: string }) {
  const colors = {
    good: 'border-white/20 bg-white/5',
    warning: 'border-zinc-400/30 bg-zinc-400/5',
    critical: 'border-zinc-500/30 bg-zinc-500/10',
  };
  const dotColors = { good: 'bg-white', warning: 'bg-zinc-400', critical: 'bg-zinc-500' };
  return (
    <div className={`p-5 rounded-2xl border ${colors[status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${dotColors[status]} animate-pulse`} />
        <h4 className="text-xs font-black app-hero-kicker uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-sm app-hero-copy font-medium leading-relaxed">{message}</p>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-center shadow-sm">
      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter mb-1">{label}</p>
      <p className="text-xl font-black text-zinc-800 dark:text-zinc-100">{value.toLocaleString()}</p>
    </div>
  );
}
