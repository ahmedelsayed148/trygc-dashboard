import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, Line
} from 'recharts';
import {
  CheckCircle2, Clock, AlertCircle, Target, TrendingUp, Award,
  Zap, Shield, BarChart3, Calendar, ChevronRight, Flame,
  ArrowUpRight, ArrowDownRight, MoreVertical, User, Trophy, Star
} from 'lucide-react';
import { DateRangeFilter } from './DateRangeFilter';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';

// ─── RANK LEVELS ───
const RANK_LEVELS = [
  { name: 'Morata', minPoints: 0, color: '#a1a1aa', icon: '⚽' },
  { name: 'Salah', minPoints: 500, color: '#71717a', icon: '🇪🇬' },
  { name: 'Neymar', minPoints: 1000, color: '#52525b', icon: '🇧🇷' },
  { name: 'Lewandowski', minPoints: 2000, color: '#3f3f46', icon: '🇵🇱' },
  { name: 'Ronaldinho', minPoints: 3500, color: '#27272a', icon: '✨' },
  { name: 'Zidane', minPoints: 5000, color: '#18181b', icon: '🇫🇷' },
  { name: 'Maradona', minPoints: 7500, color: '#09090b', icon: '🇦🇷' },
  { name: 'Pelé', minPoints: 10000, color: '#000000', icon: '👑' },
];

function getRankInfo(points: number) {
  for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
    if (points >= RANK_LEVELS[i].minPoints) {
      const currentRank = RANK_LEVELS[i];
      const nextRank = RANK_LEVELS[i + 1] || null;
      const pointsInCurrentRank = points - currentRank.minPoints;
      const pointsToNext = nextRank ? nextRank.minPoints - points : 0;
      const progressPercent = nextRank 
        ? ((pointsInCurrentRank) / (nextRank.minPoints - currentRank.minPoints)) * 100
        : 100;
      
      return {
        currentRank,
        nextRank,
        pointsToNext,
        progressPercent: Math.min(progressPercent, 100),
      };
    }
  }
  return {
    currentRank: RANK_LEVELS[0],
    nextRank: RANK_LEVELS[1],
    pointsToNext: RANK_LEVELS[1].minPoints,
    progressPercent: 0,
  };
}

interface Task {
  id: number;
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
  [key: string]: any;
}

interface PersonalDashboardProps {
  tasks: Task[];
  allTasks: Task[];
  userName: string;
  userEmail: string;
  onEditTask: (task: Task) => void;
  successLogs: any[];
}

function calculateAging(start: string, end?: string) {
  if (!start) return 0;
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();
  return parseFloat(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1));
}

const tooltipStyle = { backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: 12, fontSize: 11, fontWeight: 600, color: 'var(--foreground)' };

export function PersonalDashboard({ tasks, allTasks, userName, userEmail, onEditTask, successLogs }: PersonalDashboardProps) {
  const [activeView, setActiveView] = useState<'overview' | 'tasks' | 'insights'>('overview');
  const [dateRange, setDateRange] = useState(emptyDateRange);

  const filteredTasks = useMemo(
    () => filterByDateRange(tasks, dateRange, (task: Task) => task.endDateTime || task.startDateTime || task.createdAt),
    [dateRange, tasks],
  );
  const filteredAllTasks = useMemo(
    () => filterByDateRange(allTasks, dateRange, (task: Task) => task.endDateTime || task.startDateTime || task.createdAt),
    [allTasks, dateRange],
  );
  const filteredSuccessLogs = useMemo(
    () => filterByDateRange(successLogs, dateRange, (log: any) => log.timestamp || log.createdAt || log.date),
    [dateRange, successLogs],
  );

  const myStats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter(t => t.status === 'Done').length;
    const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
    const pending = filteredTasks.filter(t => t.status === 'Pending').length;
    const blocked = filteredTasks.filter(t => t.status === 'Blocked').length;
    const high = filteredTasks.filter(t => t.priority === 'High' && t.status !== 'Done').length;
    
    const totalCON = filteredTasks.reduce((a, t) => a + (t.metricCON || 0), 0);
    const totalTarget = filteredTasks.reduce((a, t) => a + (t.metricTarget || 0), 0);
    const totalCOV = filteredTasks.reduce((a, t) => a + (t.metricCOV || 0), 0);
    const todayCON = filteredTasks.reduce((a, t) => a + (t.metricConfirmationToday || 0), 0);

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const conRate = totalTarget > 0 ? Math.round((totalCON / totalTarget) * 100) : 0;

    const onTime = filteredTasks.filter(t => {
      if (t.status !== 'Done') return false;
      return calculateAging(t.startDateTime, t.endDateTime) <= t.slaHrs;
    }).length;
    const slaRate = done > 0 ? Math.round((onTime / done) * 100) : 100;

    const overdue = filteredTasks.filter(t => {
      if (t.status === 'Done') return false;
      return calculateAging(t.startDateTime, t.endDateTime) > t.slaHrs;
    }).length;

    return { total, done, inProgress, pending, blocked, high, totalCON, totalTarget, totalCOV, todayCON, completionRate, conRate, slaRate, overdue, onTime };
  }, [filteredTasks]);

  const myRank = useMemo(() => {
    const agents = [...new Set(filteredAllTasks.map(t => t.assignedTo))].filter(Boolean);
    const scores = agents.map(name => {
      const at = filteredAllTasks.filter(t => t.assignedTo === name);
      const done = at.filter(t => t.status === 'Done').length;
      const con = at.reduce((a, t) => a + (t.metricCON || 0), 0);
      const onTime = at.filter(t => {
        if (t.status !== 'Done') return false;
        return calculateAging(t.startDateTime, t.endDateTime) <= t.slaHrs;
      }).length;
      const score = (done * 30) + (con * 0.1) + (onTime * 20);
      return { name, score: Math.round(score) };
    }).sort((a, b) => b.score - a.score);
    
    const myIndex = scores.findIndex(s => s.name === userName);
    return { rank: myIndex >= 0 ? myIndex + 1 : agents.length, total: agents.length, score: myIndex >= 0 ? scores[myIndex].score : 0 };
  }, [filteredAllTasks, userName]);

  const statusData = useMemo(() => {
    const colors: Record<string, string> = { Done: '#18181b', 'In Progress': '#52525b', Pending: '#a1a1aa', Blocked: '#3f3f46' };
    const counts: Record<string, number> = {};
    filteredTasks.forEach(t => { 
      if (t.status) { // Only count tasks with a valid status
        counts[t.status] = (counts[t.status] || 0) + 1; 
      }
    });
    return Object.entries(counts)
      .filter(([name]) => name && name.trim()) // Filter out empty/null names
      .map(([name, value], index) => ({ 
        name, 
        value, 
        fill: colors[name] || '#a1a1aa', 
        // Use both name and index to ensure uniqueness
        uniqueId: `pd-status-${index}-${name.replace(/\s+/g, '-').toLowerCase()}-${value}` 
      }));
  }, [filteredTasks]);

  const campaignProgress = useMemo(() => {
    const campaigns = [...new Set(filteredTasks.map(t => t.campaign))].filter(Boolean);
    return campaigns
      .filter(name => name && name.trim()) // Filter out empty campaigns
      .map((name, index) => {
        const ct = filteredTasks.filter(t => t.campaign === name);
        const con = ct.reduce((a, t) => a + (t.metricCON || 0), 0);
        const target = ct.reduce((a, t) => a + (t.metricTarget || 0), 0);
        const done = ct.filter(t => t.status === 'Done').length;
        const shortName = name.length > 30 ? name.substring(0, 30) + '...' : name;
        return { 
          name: shortName, 
          fullName: name, 
          CON: con, 
          Target: target, 
          done, 
          total: ct.length, 
          // Use timestamp and full name to ensure unique ID
          uniqueId: `pd-campaign-${index}-${Date.now()}-${name.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}` 
        };
      });
  }, [filteredTasks]);

  const dailyActivity = useMemo(() => {
    const dayMap: Record<string, { tasks: number; con: number }> = {};
    filteredTasks.forEach(t => {
      if (t.startDateTime) {
        const day = t.startDateTime.split('T')[0];
        if (!dayMap[day]) dayMap[day] = { tasks: 0, con: 0 };
        dayMap[day].tasks++;
        dayMap[day].con += (t.metricConfirmationToday || 0);
      }
    });
    const sortedEntries = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10);

    // Use fullDate (ISO string) as the unique key for XAxis to avoid
    // timezone-induced duplicate display strings colliding as Recharts keys
    return sortedEntries.map(([date, data], index) => ({
      fullDate: date,          // unique ISO string — used as XAxis dataKey
      Tasks: data.tasks,
      CON: data.con,
      uniqueId: `pd-daily-${date}-${index}`,
    }));
  }, [filteredTasks]);

  const urgentTasks = useMemo(() => {
    return filteredTasks
      .filter(t => t.status !== 'Done')
      .map(t => ({ ...t, aging: calculateAging(t.startDateTime, t.endDateTime), isOverdue: calculateAging(t.startDateTime, t.endDateTime) > t.slaHrs }))
      .sort((a, b) => {
        if (a.status === 'Blocked' && b.status !== 'Blocked') return -1;
        if (a.isOverdue && !b.isOverdue) return -1;
        if (a.priority === 'High' && b.priority !== 'High') return -1;
        return b.aging - a.aging;
      });
  }, [filteredTasks]);

  const mySuccesses = useMemo(() => {
    return filteredSuccessLogs.filter(log => 
      log.agent?.toLowerCase().includes(userName.toLowerCase().split(' ')[0]) ||
      log.agent?.toLowerCase() === userName.toLowerCase()
    );
  }, [filteredSuccessLogs, userName]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ========== WELCOME BANNER ========== */}
      <div className="bg-gradient-to-br from-black to-zinc-800 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl font-black border border-white/20">
                {userName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Welcome, {userName.split(' ')[0]}!</h1>
                <p className="text-white/50 text-sm font-medium">{userEmail}</p>
              </div>
            </div>
            <p className="text-white/60 font-medium text-sm max-w-lg">
              Here's your personal workspace overview. You have {myStats.total} tasks assigned with {myStats.inProgress} currently in progress.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10 text-center">
              <p className="text-3xl font-black">{myStats.completionRate}%</p>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Completion</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10 text-center">
              <p className="text-3xl font-black">#{myRank.rank}</p>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Team Rank</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10 text-center">
              <p className="text-3xl font-black">{myRank.score}</p>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Points</p>
            </div>
          </div>
        </div>
      </div>

      <DateRangeFilter
        label="Personal Date Range"
        value={dateRange}
        onChange={setDateRange}
      />

      {/* ========== RANK PROGRESSION WIDGET ========== */}
      <RankProgressionWidget points={myRank.score} />

      {/* ========== VIEW TABS ========== */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 p-1.5 rounded-3xl w-fit shadow-sm border border-zinc-200 dark:border-zinc-800">
        {[
          { id: 'overview' as const, label: 'My Overview', icon: BarChart3 },
          { id: 'tasks' as const, label: 'My Tasks', icon: CheckCircle2 },
          { id: 'insights' as const, label: 'My Insights', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-xs font-black transition-all ${activeView === tab.id ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black shadow-md' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ========== OVERVIEW VIEW ========== */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
            <QuickStat icon={Target}     label="My Tasks"    value={myStats.total} />
            <QuickStat icon={CheckCircle2} label="Completed" value={myStats.done} />
            <QuickStat icon={Clock}      label="In Progress" value={myStats.inProgress} />
            <QuickStat icon={Zap}        label="Today CON"   value={myStats.todayCON} />
            <QuickStat icon={Shield}     label="SLA Rate"    value={`${myStats.slaRate}%`} />
            <QuickStat icon={Flame}      label="Overdue"     value={myStats.overdue} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">My Task Status</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={4}>
                      {statusData.map((entry) => <Cell key={entry.uniqueId} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">My Daily Activity</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyActivity} margin={{ left: 10, right: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="personalDashMyDailyActivityTasks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="personalDashMyDailyActivityCON" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="fullDate"
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickFormatter={(val: string) => {
                        // Parse as noon local time to avoid UTC midnight timezone shifts
                        const d = new Date(`${val}T12:00:00`);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(val: string) => {
                        const d = new Date(`${val}T12:00:00`);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="Tasks" stroke="#18181b" fill="url(#personalDashMyDailyActivityTasks)" strokeWidth={2} />
                    <Area type="monotone" dataKey="CON" stroke="#a1a1aa" fill="url(#personalDashMyDailyActivityCON)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {urgentTasks.length > 0 && (
            <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-zinc-500" /> Tasks Needing Attention
                </h3>
                <span className="text-[10px] font-black text-zinc-400">{urgentTasks.length} open</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {urgentTasks.slice(0, 6).map(task => (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
                  >
                    <div className={`w-2 h-2 rounded-full ${task.status === 'Blocked' ? 'bg-zinc-800 dark:bg-zinc-200' : task.isOverdue ? 'bg-zinc-600 dark:bg-zinc-400' : task.priority === 'High' ? 'bg-zinc-700 dark:bg-zinc-300' : 'bg-zinc-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{task.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{task.campaign}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.priority === 'High' ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black' :
                          task.priority === 'Low' ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' :
                          'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                        }`}>{task.priority}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.status === 'In Progress' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' :
                          task.status === 'Blocked' ? 'bg-zinc-300 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200' :
                          'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'
                        }`}>{task.status}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${task.isOverdue ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{task.aging}h</p>
                      <p className="text-[9px] font-bold text-zinc-400">/ {task.slaHrs}h SLA</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== TASKS VIEW ========== */}
      {activeView === 'tasks' && (
        <div className="space-y-4">
          {['In Progress', 'Pending', 'Blocked', 'Done'].map(status => {
            const statusTasks = filteredTasks.filter(t => t.status === status);
            if (statusTasks.length === 0) return null;
            return (
              <div key={status} className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status === 'Done' ? <CheckCircle2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200" /> :
                     status === 'In Progress' ? <Clock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" /> :
                     status === 'Blocked' ? <AlertCircle className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /> :
                     <Clock className="w-4 h-4 text-zinc-400" />}
                    <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">{status}</h3>
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{statusTasks.length}</span>
                  </div>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {statusTasks.map(task => {
                    const aging = calculateAging(task.startDateTime, task.endDateTime);
                    const isOver = task.status !== 'Done' && aging > task.slaHrs;
                    return (
                      <div
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 truncate mb-1">{task.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{task.campaign}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              task.priority === 'High' ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black' :
                              task.priority === 'Low' ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' :
                              'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                            }`}>{task.priority}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex gap-2">
                            <MiniMetric label="CON" value={task.metricCON || 0} />
                            <MiniMetric label="COV" value={task.metricCOV || 0} />
                            <MiniMetric label="TGT" value={task.metricTarget || 0} />
                          </div>
                          <div className={`text-center px-3 py-1.5 rounded-xl border ${isOver ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}>
                            <p className={`text-sm font-black ${isOver ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{aging}h</p>
                            <p className="text-[8px] font-bold text-zinc-400">/{task.slaHrs}h</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-16 text-center">
              <User className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-black text-zinc-400">No Tasks Assigned</h3>
              <p className="text-sm text-zinc-400 mt-1">Your admin hasn't assigned any tasks to you yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ========== INSIGHTS VIEW ========== */}
      {activeView === 'insights' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-8">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award className="w-4 h-4 text-zinc-500" /> My Performance Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <PerformanceGauge label="Task Completion" value={myStats.completionRate} />
              <PerformanceGauge label="CON Achievement" value={myStats.conRate} />
              <PerformanceGauge label="SLA Compliance" value={myStats.slaRate} />
              <PerformanceGauge label="Efficiency" value={myStats.total > 0 ? Math.round(((myStats.total - myStats.blocked) / myStats.total) * 100) : 100} />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-zinc-500" /> My Campaign Progress
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {campaignProgress.map((c) => (
                <div key={c.fullName || c.name} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 truncate max-w-[60%]">{c.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{c.done}/{c.total} tasks</span>
                      <span className="text-[10px] font-bold text-zinc-500">{c.CON}/{c.Target} CON</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-700" style={{ width: `${c.Target > 0 ? Math.min((c.CON / c.Target) * 100, 100) : 0}%` }} />
                  </div>
                </div>
              ))}
              {campaignProgress.length === 0 && <p className="text-center text-sm text-zinc-400 py-8">No campaign data available</p>}
            </div>
          </div>

          {mySuccesses.length > 0 && (
            <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <h3 className="text-xs font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4" /> My Recorded Wins
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {mySuccesses.map(log => (
                  <div key={log.id} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-start gap-3">
                    <Award className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{log.detail}</p>
                      <p className="text-[10px] font-bold text-zinc-400 mt-1">{log.type} • {log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== SUB-COMPONENTS ==========

function QuickStat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-white dark:text-black" />
      </div>
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-zinc-800 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-black text-zinc-400 uppercase">{label}</p>
      <p className="text-xs font-black text-zinc-700 dark:text-zinc-300">{value}</p>
    </div>
  );
}

function PerformanceGauge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 text-center border border-zinc-100 dark:border-zinc-800">
      <div className="relative w-20 h-20 mx-auto mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path className="text-zinc-200 dark:text-zinc-700" d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
          <path className="text-zinc-800 dark:text-zinc-200" d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${value}, 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-zinc-800 dark:text-zinc-100">{value}%</span>
        </div>
      </div>
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ========== RANK PROGRESSION WIDGET ==========

function RankProgressionWidget({ points }: { points: number }) {
  const rankInfo = getRankInfo(points);
  const currentRank = rankInfo.currentRank;
  const nextRank = rankInfo.nextRank;
  const pointsToNext = rankInfo.pointsToNext;
  const progressPercent = rankInfo.progressPercent;

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4 text-zinc-500" /> Rank Progression
      </h3>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-sm">
          {currentRank.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">{currentRank.name}</p>
          <p className="text-[9px] font-bold text-zinc-400">Points: {points}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-sm">
          {nextRank ? nextRank.icon : '🏆'}
        </div>
      </div>
      <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
        <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="text-[9px] font-bold text-zinc-400 mt-1">Points to {nextRank ? nextRank.name : 'Legend'}: {pointsToNext}</p>
    </div>
  );
}
