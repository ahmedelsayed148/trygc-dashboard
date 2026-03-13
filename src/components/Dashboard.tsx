import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from './Root';
import { useNavigate } from '../lib/routerCompat';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { isTaskAssignedToUser } from '../lib/operations';
import { 
  ClipboardList, 
  CheckCircle2, 
  Target, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Calendar,
  ArrowRight,
  Activity,
  Award,
  Zap,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  ListX
} from 'lucide-react';

export function Dashboard() {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const successLogs = ctx?.successLogs || [];
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';
  const isAdmin = ctx?.isAdmin || false;
  const setTasks = ctx?.setTasks || (() => {});
  const setSuccessLogs = ctx?.setSuccessLogs || (() => {});
  const setOpsCampaigns = ctx?.setOpsCampaigns || (() => {});
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearTasksModalOpen, setIsClearTasksModalOpen] = useState(false);
  const [isClearingTasks, setIsClearingTasks] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b626472b/reset-data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (response.ok) {
        setTasks([]);
        setSuccessLogs([]);
        setOpsCampaigns([]);
        setIsClearModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to clear data', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearTasks = async () => {
    setIsClearingTasks(true);
    try {
      const [tasksResponse, campaignsResponse] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b626472b/tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tasks: [] })
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b626472b/ops-campaigns`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ opsCampaigns: [] })
        })
      ]);
      if (tasksResponse.ok && campaignsResponse.ok) {
        setTasks([]);
        setOpsCampaigns([]);
        setIsClearTasksModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to clear tasks', error);
    } finally {
      setIsClearingTasks(false);
    }
  };

  // Calculate aging
  const calculateAging = (start: string, end?: string) => {
    if (!start) return 0;
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    return Number(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1));
  };

  // My tasks for members
  const myTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter((t: any) => isTaskAssignedToUser(t, { userEmail, userName }));
  }, [tasks, isAdmin, userName, userEmail]);

  // Stats
  const stats = useMemo(() => {
    const relevantTasks = isAdmin ? tasks : myTasks;
    const total = relevantTasks.length;
    const done = relevantTasks.filter((t: any) => t.status === 'Done').length;
    const inProgress = relevantTasks.filter((t: any) => t.status === 'In Progress').length;
    const overdue = relevantTasks.filter((t: any) => {
      const aging = calculateAging(t.startDateTime, t.endDateTime);
      return t.status !== 'Done' && aging > t.slaHrs;
    }).length;
    const totalCON = relevantTasks.reduce((a: number, b: any) => a + (b.metricCON || 0), 0);
    const totalTarget = relevantTasks.reduce((a: number, b: any) => a + (b.metricTarget || 0), 0);
    const achievementRate = totalTarget > 0 ? ((totalCON / totalTarget) * 100).toFixed(0) : 0;

    return { total, done, inProgress, overdue, totalCON, totalTarget, achievementRate };
  }, [tasks, myTasks, isAdmin]);

  // Recent activities
  const recentTasks = useMemo(() => {
    return [...myTasks]
      .sort((a: any, b: any) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime())
      .slice(0, 5);
  }, [myTasks]);

  // Recent successes
  const recentSuccesses = useMemo(() => {
    return successLogs.slice(0, 5);
  }, [successLogs]);

  // Team performance (admin only)
  const teamPerformance = useMemo(() => {
    if (!isAdmin) return [];
    const agents = [...new Set(tasks.map((t: any) => t.assignedTo))].filter(Boolean);
    return agents.map((name: string) => {
      const agentTasks = tasks.filter((t: any) => t.assignedTo === name);
      const done = agentTasks.filter((t: any) => t.status === 'Done').length;
      const score = agentTasks.length > 0 ? (done / agentTasks.length) * 100 : 0;
      return { name, total: agentTasks.length, done, score: score.toFixed(0) };
    }).sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).slice(0, 5);
  }, [tasks, isAdmin]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-black to-zinc-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">
              Welcome back, {userName || userEmail}!
            </h1>
            <p className="text-zinc-300 text-lg font-medium">
              {isAdmin 
                ? "Here's an overview of your team's performance and activities."
                : "Here's a quick overview of your tasks and achievements."}
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
            <Calendar className="w-5 h-5 inline mr-2" />
            <span className="font-bold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Tasks"
          value={stats.total}
          icon={ClipboardList}
          color="bg-black"
          trend="+12% from last week"
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <MetricCard
          label="Completed"
          value={stats.done}
          icon={CheckCircle2}
          color="bg-zinc-700"
          trend={`${stats.total > 0 ? ((stats.done / stats.total) * 100).toFixed(0) : 0}% completion rate`}
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <MetricCard
          label="In Progress"
          value={stats.inProgress}
          icon={Activity}
          color="bg-zinc-500"
          trend="Active workflows"
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <MetricCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          color="bg-zinc-900"
          trend={stats.overdue > 0 ? 'Needs attention' : 'All on track!'}
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievement Progress */}
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100">Achievement Progress</h2>
            <Target className="w-6 h-6 text-black dark:text-white" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Target vs CON</span>
                <span className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{stats.achievementRate}%</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-black to-zinc-600 dark:from-white dark:to-zinc-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(parseInt(stats.achievementRate.toString()), 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4">
                <div className="text-xs font-bold text-zinc-400 uppercase mb-1">Total CON</div>
                <div className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{stats.totalCON.toLocaleString()}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4">
                <div className="text-xs font-bold text-zinc-400 uppercase mb-1">Total Target</div>
                <div className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{stats.totalTarget.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100">Quick Actions</h2>
            <Zap className="w-6 h-6 text-zinc-500" />
          </div>
          <div className="space-y-3">
            <QuickActionButton
              label="View All Tasks"
              onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
              color="bg-black dark:bg-white dark:text-black"
            />
            {isAdmin && (
              <>
                <QuickActionButton
                  label="Function Kanban"
                  onClick={() => navigate('/functions')}
                  color="bg-zinc-800 dark:bg-zinc-200 dark:text-black"
                />
                <QuickActionButton
                  label="Team Analytics"
                  onClick={() => navigate('/analytics')}
                  color="bg-zinc-700 dark:bg-zinc-300 dark:text-black"
                />
                <QuickActionButton
                  label="Member Views"
                  onClick={() => navigate('/member-views')}
                  color="bg-zinc-600 dark:bg-zinc-400 dark:text-black"
                />
              </>
            )}
            <QuickActionButton
              label="View Successes"
              onClick={() => navigate('/successes')}
              color="bg-zinc-500 dark:bg-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Recent Activity & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100">Recent Tasks</h2>
            <button 
              onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
              className="text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                  <div className={`w-2 h-2 rounded-full ${task.status === 'Done' ? 'bg-black dark:bg-white' : task.status === 'In Progress' ? 'bg-zinc-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{task.campaign}</div>
                    <div className="text-xs font-medium text-zinc-500">{task.assignedTo}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    task.status === 'Done' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' :
                    task.status === 'In Progress' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' :
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No tasks yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Performance or Recent Successes */}
        {isAdmin ? (
          <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100">Top Performers</h2>
              <button 
                onClick={() => navigate('/analytics')}
                className="text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                View Analytics <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {teamPerformance.length > 0 ? (
                teamPerformance.map((member, idx) => (
                  <div key={member.name} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                      idx === 0 ? 'bg-black text-white dark:bg-white dark:text-black' :
                      idx === 1 ? 'bg-zinc-600 text-white dark:bg-zinc-400 dark:text-black' :
                      idx === 2 ? 'bg-zinc-400 text-white dark:bg-zinc-500 dark:text-white' :
                      'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{member.name}</div>
                      <div className="text-xs font-medium text-zinc-500">{member.done} of {member.total} tasks</div>
                    </div>
                    <div className="text-lg font-black text-zinc-800 dark:text-zinc-100">{member.score}%</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No team data yet</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100">Recent Successes</h2>
              <button 
                onClick={() => navigate('/successes')}
                className="text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {recentSuccesses.length > 0 ? (
                recentSuccesses.map((success: any) => (
                  <div key={success.id} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <Award className="w-5 h-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{success.agent}</div>
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-1">{success.detail}</div>
                      <div className="text-xs font-bold text-zinc-400 mt-1">{success.time}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No successes logged yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Admin Actions</h3>
          
          {/* Clear All Tasks */}
          <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Clear All Tasks</h4>
              <p className="text-xs text-zinc-500">Remove all tasks from the system. Success logs will be preserved.</p>
            </div>
            <button
              onClick={() => setIsClearTasksModalOpen(true)}
              className="px-5 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <ListX className="w-4 h-4" />
              Clear Tasks
            </button>
          </div>

          {/* Clear All Data */}
          <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Clear All Data</h4>
              <p className="text-xs text-zinc-500">Irreversibly delete all tasks, success logs, and metrics.</p>
            </div>
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          </div>
        </div>
      )}

      {/* Clear All Data Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-800 dark:text-zinc-200">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">Are you sure?</h2>
              </div>
              <button 
                onClick={() => setIsClearModalOpen(false)} 
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
            
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 font-medium">
              This action will permanently delete all tasks, success logs, and metrics. This cannot be undone.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[1.5rem] font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="flex-1 py-4 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-[1.5rem] font-bold shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isClearing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Tasks Confirmation Modal */}
      {isClearTasksModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-800 dark:text-zinc-200">
                  <ListX className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">Clear All Tasks?</h2>
              </div>
              <button 
                onClick={() => setIsClearTasksModalOpen(false)} 
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
            
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 font-medium">
              This will remove all {stats.total} tasks from the system. Success logs and other data will be preserved.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setIsClearTasksModalOpen(false)}
                className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[1.5rem] font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearTasks}
                disabled={isClearingTasks}
                className="flex-1 py-4 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-[1.5rem] font-bold shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isClearingTasks ? <Loader2 className="w-5 h-5 animate-spin" /> : <ListX className="w-5 h-5" />}
                Clear Tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, trend, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-xl transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
        <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
      </div>
      <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-2">{value}</div>
      <div className="text-xs font-medium text-zinc-500">{trend}</div>
    </button>
  );
}

function QuickActionButton({ label, onClick, color }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full ${color} text-white rounded-2xl px-6 py-4 font-bold flex items-center justify-between hover:shadow-lg transition-all group`}
    >
      <span>{label}</span>
      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}
