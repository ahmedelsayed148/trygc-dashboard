import React, { useContext, useDeferredValue, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, BarChart2,
  Check, ChevronDown, Clock, Filter, LayoutGrid, List,
  Pencil, Plus, Search, Trash2, X, Users,
  TrendingUp, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { AppContext } from './Root';
import { DateRangeFilter } from './DateRangeFilter';
import { TaskEditorModal } from './operations/TaskEditorModal';
import { appendAssignmentNotification } from '../lib/taskNotifications';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';
import {
  OPERATIONS_TEAMS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  getAssigneeLabel,
  normalizeOpsCampaigns,
  type CampaignTeamTask,
  type FlattenedOperationalTask,
  type OpsCampaign,
  type TaskPriority,
  type TaskStatus,
} from '../lib/operations';

type TaskModalState = {
  campaignId: string;
  defaultTeamId: string;
  task?: CampaignTeamTask;
} | null;

type InlineEdit = {
  taskId: string;
  field: 'status' | 'priority' | 'dueDate';
  value: string;
} | null;

type SortField = 'campaign' | 'title' | 'team' | 'status' | 'priority' | 'dueDate';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'campaign' | 'team' | 'status';
type QuickFilter = 'all' | 'mine' | 'overdue' | 'blocked' | 'unassigned';

type TaskNotificationRecord = {
  id: string; type: string; taskId: string; taskName: string;
  taskDescription: string; assignedTo: string; assignedToName: string;
  assignedBy: string; timestamp: string; time: string; date: string; read: boolean;
};

type TeamMember = { email: string; name: string; teamName?: string };

const EMPTY_CAMPAIGNS: OpsCampaign[] = [];
const EMPTY_TEAM_MEMBERS: TeamMember[] = [];
const EMPTY_OPERATIONAL_TASKS: FlattenedOperationalTask[] = [];
const EMPTY_DISABLED_TEAMS: string[] = [];

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_ORDER: Record<string, number> = { Blocked: 0, 'In Progress': 1, Review: 2, Pending: 3, Done: 4 };

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  'Done': { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  'In Progress': { dot: 'bg-amber-500', bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  'Blocked': { dot: 'bg-rose-500', bg: 'bg-rose-500/10 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
  'Pending': { dot: 'bg-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-700' },
  'Review': { dot: 'bg-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
};

const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'High': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Medium': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'Low': 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
};

const KANBAN_COLUMN_STYLES: Record<string, { header: string; border: string; count: string }> = {
  'Pending': { header: 'text-zinc-500', border: 'border-t-2 border-t-zinc-300 dark:border-t-zinc-600', count: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' },
  'In Progress': { header: 'text-amber-600 dark:text-amber-400', border: 'border-t-2 border-t-amber-400', count: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  'Review': { header: 'text-blue-600 dark:text-blue-400', border: 'border-t-2 border-t-blue-400', count: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  'Blocked': { header: 'text-rose-600 dark:text-rose-400', border: 'border-t-2 border-t-rose-400', count: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
  'Done': { header: 'text-emerald-600 dark:text-emerald-400', border: 'border-t-2 border-t-emerald-400', count: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
};

function isTaskOverdue(task: FlattenedOperationalTask): boolean {
  if (!task.dueDate || task.status === 'Done') return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

export function AllTasks() {
  const ctx = useContext(AppContext);
  const opsCampaigns = normalizeOpsCampaigns(ctx?.opsCampaigns ?? EMPTY_CAMPAIGNS);
  const setOpsCampaigns = ctx?.setOpsCampaigns || (() => {});
  const setCommunityWorkspace = ctx?.setCommunityWorkspace || (() => {});
  const teamMembers = (ctx?.teamMembers as TeamMember[] | undefined) ?? EMPTY_TEAM_MEMBERS;
  const operationalTasks = (ctx?.operationalTasks as unknown as FlattenedOperationalTask[] | undefined) ?? EMPTY_OPERATIONAL_TASKS;
  const setTaskNotifications = ctx?.setTaskNotifications || (() => {});
  const userEmail = ctx?.userEmail || '';
  const disabledTeams = ctx?.disabledTeams ?? EMPTY_DISABLED_TEAMS;

  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [taskModalState, setTaskModalState] = useState<TaskModalState>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEdit>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }, [sortField]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const filteredTasks = useMemo(() => {
    let tasks = operationalTasks.filter((task) => {
      const isCommunityTask = task.campaignId?.startsWith('community-');
      const matchesSearch = !deferredSearch ||
        task.campaign.toLowerCase().includes(deferredSearch) ||
        task.title.toLowerCase().includes(deferredSearch) ||
        task.teamName.toLowerCase().includes(deferredSearch) ||
        task.assignedLabel.toLowerCase().includes(deferredSearch) ||
        String(task.campaignCriteria || '').toLowerCase().includes(deferredSearch) ||
        String(task.campaignMethodology || '').toLowerCase().includes(deferredSearch) ||
        String(task.metricTarget || '').toLowerCase().includes(deferredSearch) ||
        (isCommunityTask && (
          String(task.criteria || '').toLowerCase().includes(deferredSearch) ||
          String(task.methodology || '').toLowerCase().includes(deferredSearch)
        ));
      const matchesCampaign = campaignFilter === 'All' || task.campaignId === campaignFilter;
      const matchesTeam = teamFilter === 'All' || task.teamId === teamFilter;
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesEnabledTeam = !disabledTeams.includes(task.teamId);
      return matchesSearch && matchesCampaign && matchesTeam && matchesStatus && matchesPriority && matchesEnabledTeam;
    });

    tasks = filterByDateRange(tasks, dateRange, (task) => task.dueDate || task.updatedAt || task.createdAt);

    // Quick filters
    if (quickFilter === 'mine') {
      const emailPrefix = userEmail.split('@')[0].toLowerCase();
      tasks = tasks.filter(t =>
        t.assignedTo === userEmail ||
        t.assignedLabel?.toLowerCase() === emailPrefix ||
        t.assignedLabel?.toLowerCase().includes(emailPrefix)
      );
    } else if (quickFilter === 'overdue') tasks = tasks.filter(isTaskOverdue);
    else if (quickFilter === 'blocked') tasks = tasks.filter(t => t.status === 'Blocked');
    else if (quickFilter === 'unassigned') tasks = tasks.filter(t => t.assignmentMode === 'unassigned');

    // Sorting
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'campaign': cmp = a.campaign.localeCompare(b.campaign); break;
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'team': cmp = a.teamName.localeCompare(b.teamName); break;
        case 'status': cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9); break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = aDate - bDate; break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [campaignFilter, dateRange, deferredSearch, disabledTeams, operationalTasks, priorityFilter, statusFilter, teamFilter, sortField, sortDir, quickFilter]);

  const summary = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter(t => t.status === 'Done').length;
    const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
    const blocked = filteredTasks.filter(t => t.status === 'Blocked').length;
    const overdue = filteredTasks.filter(isTaskOverdue).length;
    const assigned = filteredTasks.filter(t => t.assignmentMode !== 'unassigned').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, blocked, overdue, assigned, completionRate };
  }, [filteredTasks]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups = new Map<string, FlattenedOperationalTask[]>();
    filteredTasks.forEach(task => {
      const key = groupBy === 'campaign' ? task.campaign
        : groupBy === 'team' ? task.teamName
        : task.status;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      if (groupBy === 'status') return (STATUS_ORDER[a[0]] ?? 9) - (STATUS_ORDER[b[0]] ?? 9);
      return a[0].localeCompare(b[0]);
    });
  }, [filteredTasks, groupBy]);

  const activeFilterCount = [campaignFilter !== 'All', teamFilter !== 'All', statusFilter !== 'All', priorityFilter !== 'All'].filter(Boolean).length;
  const defaultCampaign = opsCampaigns.find(c => c.id === campaignFilter) || opsCampaigns[0];

  const myTaskCount = useMemo(() => {
    const emailPrefix = userEmail.split('@')[0].toLowerCase();
    return operationalTasks.filter(t =>
      !disabledTeams.includes(t.teamId) && (
        t.assignedTo === userEmail ||
        t.assignedLabel?.toLowerCase() === emailPrefix ||
        t.assignedLabel?.toLowerCase().includes(emailPrefix)
      )
    ).length;
  }, [operationalTasks, userEmail, disabledTeams]);

  const QUICK_FILTERS: Array<{ id: QuickFilter; label: string; count: number; color: string }> = [
    { id: 'all', label: 'All', count: operationalTasks.filter(t => !disabledTeams.includes(t.teamId)).length, color: 'zinc' },
    { id: 'mine', label: 'My Tasks', count: myTaskCount, color: 'violet' },
    { id: 'overdue', label: 'Overdue', count: operationalTasks.filter(t => isTaskOverdue(t) && !disabledTeams.includes(t.teamId)).length, color: 'rose' },
    { id: 'blocked', label: 'Blocked', count: operationalTasks.filter(t => t.status === 'Blocked' && !disabledTeams.includes(t.teamId)).length, color: 'orange' },
    { id: 'unassigned', label: 'Unassigned', count: operationalTasks.filter(t => t.assignmentMode === 'unassigned' && !disabledTeams.includes(t.teamId)).length, color: 'blue' },
  ];

  const updateCampaignTask = (nextTask: CampaignTeamTask) => {
    if (!taskModalState) return;
    const isCommunityTask = taskModalState.campaignId.startsWith('community-');
    if (isCommunityTask) {
      setCommunityWorkspace((current: any) => ({
        ...current, updatedAt: new Date().toISOString(),
        countries: current.countries.map((country: any) => {
          if (`community-${country.id}` !== taskModalState.campaignId) return country;
          const withoutTask = country.tasks.filter((t: any) => t.id !== nextTask.id);
          return { ...country, tasks: [nextTask, ...withoutTask] };
        }),
      }));
      toast.success(taskModalState.task ? 'Task updated' : 'Task created');
      setTaskModalState(null); return;
    }
    const campaign = opsCampaigns.find(item => item.id === taskModalState.campaignId);
    setOpsCampaigns((current: OpsCampaign[]) => current.map(campaign => {
      if (campaign.id !== taskModalState.campaignId) return campaign;
      return {
        ...campaign, updatedAt: new Date().toISOString(),
        teamPlans: campaign.teamPlans.map(plan => {
          const withoutTask = plan.tasks.filter(t => t.id !== nextTask.id);
          if (plan.teamId === nextTask.teamId) return { ...plan, tasks: [nextTask, ...withoutTask] };
          return { ...plan, tasks: withoutTask };
        }),
      };
    }));
    if (campaign) {
      setTaskNotifications((current: TaskNotificationRecord[]) =>
        appendAssignmentNotification({ currentNotifications: current, previousTask: taskModalState.task, nextTask, campaignId: campaign.id, campaignName: campaign.name, assignedBy: userEmail })
      );
    }
    toast.success(taskModalState.task ? 'Task updated' : 'Task created');
    setTaskModalState(null);
  };

  const patchTask = (campaignId: string, teamId: string, taskId: string, patch: Partial<CampaignTeamTask>) => {
    if (campaignId.startsWith('community-')) {
      setCommunityWorkspace((current: any) => ({
        ...current, updatedAt: new Date().toISOString(),
        countries: current.countries.map((country: any) => {
          if (`community-${country.id}` !== campaignId) return country;
          return { ...country, tasks: country.tasks.map((t: any) => t.id === taskId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t) };
        }),
      })); return;
    }
    setOpsCampaigns((current: OpsCampaign[]) => current.map(campaign => {
      if (campaign.id !== campaignId) return campaign;
      return {
        ...campaign, updatedAt: new Date().toISOString(),
        teamPlans: campaign.teamPlans.map(plan => {
          if (plan.teamId !== teamId) return plan;
          return { ...plan, tasks: plan.tasks.map(t => t.id === taskId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t) };
        }),
      };
    }));
  };

  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const task = operationalTasks.find(t => t.id === inlineEdit.taskId);
    if (!task) { setInlineEdit(null); return; }
    const patch: Partial<CampaignTeamTask> = {};
    if (inlineEdit.field === 'status') patch.status = inlineEdit.value as TaskStatus;
    else if (inlineEdit.field === 'priority') patch.priority = inlineEdit.value as TaskPriority;
    else patch.dueDate = inlineEdit.value;
    patchTask(task.campaignId, task.teamId, task.id, patch);
    toast.success('Task updated');
    setInlineEdit(null);
  };

  const deleteTask = (campaignId: string, teamId: string, taskId: string) => {
    if (campaignId.startsWith('community-')) {
      setCommunityWorkspace((current: any) => ({
        ...current, updatedAt: new Date().toISOString(),
        countries: current.countries.map((country: any) => {
          if (`community-${country.id}` !== campaignId) return country;
          return { ...country, tasks: country.tasks.filter((t: any) => t.id !== taskId) };
        }),
      }));
      toast.success('Task deleted'); return;
    }
    setOpsCampaigns((current: OpsCampaign[]) => current.map(campaign => {
      if (campaign.id !== campaignId) return campaign;
      return {
        ...campaign, updatedAt: new Date().toISOString(),
        teamPlans: campaign.teamPlans.map(plan => {
          if (plan.teamId !== teamId) return plan;
          return { ...plan, tasks: plan.tasks.filter(t => t.id !== taskId) };
        }),
      };
    }));
    toast.success('Task deleted');
  };

  const clearFilters = () => {
    setCampaignFilter('All'); setTeamFilter('All'); setStatusFilter('All');
    setPriorityFilter('All'); setSearch(''); setQuickFilter('all');
  };

  const tasksToRender = filteredTasks;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="px-4 py-5 md:px-6"
    >
      <div className="mx-auto max-w-screen-2xl space-y-4">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">All Tasks</h1>
              {summary.overdue > 0 && (
                <button onClick={() => setQuickFilter('overdue')}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors">
                  <AlertCircle className="w-3 h-3" /> {summary.overdue} overdue
                </button>
              )}
              {summary.blocked > 0 && (
                <button onClick={() => setStatusFilter('Blocked')}
                  className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors">
                  <AlertCircle className="w-3 h-3" /> {summary.blocked} blocked
                </button>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-500">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} across all campaigns
              {activeFilterCount > 0 && <span className="ml-1.5 font-bold text-zinc-900 dark:text-zinc-100">· {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Group by */}
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as GroupBy)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none"
            >
              <option value="none">No Grouping</option>
              <option value="campaign">Group by Campaign</option>
              <option value="team">Group by Team</option>
              <option value="status">Group by Status</option>
            </select>
            {/* View toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl">
              <button onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                title="Table view"
              ><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                title="Kanban view"
              ><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <button
              onClick={() => {
                if (!defaultCampaign) { toast.error('Create a campaign first'); return; }
                setTaskModalState({ campaignId: defaultCampaign.id, defaultTeamId: defaultCampaign.teamPlans[0]?.teamId || OPERATIONS_TEAMS[0].id });
              }}
              className="app-accent-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiTile label="Total Tasks" value={summary.total} icon={<BarChart2 className="w-4 h-4" />} />
          <KpiTile
            label="Completed"
            value={`${summary.completionRate}%`}
            sub={`${summary.done} of ${summary.total} done`}
            icon={<CheckCircle2 className="w-4 h-4" />}
            progress={summary.completionRate}
            progressColor={summary.completionRate >= 75 ? 'bg-emerald-500' : summary.completionRate >= 40 ? 'bg-amber-500' : 'bg-rose-500'}
          />
          <KpiTile label="In Progress" value={summary.inProgress} color="text-amber-500" icon={<TrendingUp className="w-4 h-4" />} clickable onClick={() => { setStatusFilter('In Progress'); setQuickFilter('all'); }} />
          <KpiTile label="Blocked" value={summary.blocked} color={summary.blocked > 0 ? 'text-rose-500' : 'text-zinc-400'} icon={<AlertCircle className="w-4 h-4" />} clickable onClick={() => { setStatusFilter('Blocked'); setQuickFilter('all'); }} />
          <KpiTile label="Overdue" value={summary.overdue} color={summary.overdue > 0 ? 'text-rose-600' : 'text-zinc-400'} icon={<Clock className="w-4 h-4" />} clickable onClick={() => setQuickFilter('overdue')} />
          <KpiTile label="My Tasks" value={myTaskCount} color={myTaskCount > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400'} icon={<Users className="w-4 h-4" />} clickable onClick={() => setQuickFilter('mine')} />
        </div>

        {/* ── Quick Filters ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_FILTERS.map(qf => {
            const isActive = quickFilter === qf.id;
            const activeCx =
              qf.id === 'mine' ? 'bg-violet-600 text-white border-transparent' :
              qf.id === 'overdue' ? 'bg-rose-600 text-white border-transparent' :
              qf.id === 'blocked' ? 'bg-orange-500 text-white border-transparent' :
              'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent';
            const badgeCx =
              isActive ? 'bg-white/20' :
              qf.id === 'overdue' && qf.count > 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
              qf.id === 'mine' && qf.count > 0 ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' :
              qf.id === 'blocked' && qf.count > 0 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
            return (
              <button key={qf.id} onClick={() => setQuickFilter(qf.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all border ${
                  isActive
                    ? activeCx
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-950'
                }`}
              >
                {qf.label}
                {qf.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${badgeCx}`}>
                    {qf.count}
                  </span>
                )}
              </button>
            );
          })}
          {(quickFilter !== 'all' || activeFilterCount > 0 || search) && (
            <button onClick={clearFilters} className="text-xs font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors ml-auto">
              Clear all ×
            </button>
          )}
        </div>

        {/* ── Search + Filter Bar ── */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks, campaigns, teams, assignees..."
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400"
              />
              {search && <button onClick={() => setSearch('')} className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X className="w-3.5 h-3.5" /></button>}
            </label>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${showFilters || activeFilterCount > 0 ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && <span className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">{activeFilterCount}</span>}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <CompactFilter label="Campaign" value={campaignFilter} onChange={setCampaignFilter}
                    options={[['All', 'All Campaigns'], ...opsCampaigns.map((c): [string, string] => [c.id, c.name])]} />
                  <CompactFilter label="Team" value={teamFilter} onChange={setTeamFilter}
                    options={[['All', 'All Teams'], ...OPERATIONS_TEAMS.filter(t => !disabledTeams.includes(t.id)).map((t): [string, string] => [t.id, t.name])]} />
                  <CompactFilter label="Status" value={statusFilter} onChange={setStatusFilter}
                    options={[['All', 'All Statuses'], ...TASK_STATUSES.map((s): [string, string] => [s, s])]} />
                  <CompactFilter label="Priority" value={priorityFilter} onChange={setPriorityFilter}
                    options={[['All', 'All Priorities'], ...TASK_PRIORITIES.map((p): [string, string] => [p, p])]} />
                </div>
                <div className="mt-3">
                  <DateRangeFilter label="Task Date Range" value={dateRange} onChange={setDateRange} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Task Views ── */}
        {viewMode === 'table' ? (
          groupBy !== 'none' && groupedTasks ? (
            /* Grouped Table */
            <div className="space-y-3">
              {groupedTasks.map(([groupKey, groupTasks]) => {
                const isExpanded = expandedGroups.has(groupKey) || expandedGroups.size === 0;
                const colors = STATUS_COLORS[groupKey] || STATUS_COLORS['Pending'];
                return (
                  <div key={groupKey} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {groupBy === 'status' && <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />}
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{groupKey}</span>
                        <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{groupTasks.length}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <TaskTable
                          tasks={groupTasks}
                          inlineEdit={inlineEdit}
                          setInlineEdit={setInlineEdit}
                          commitInlineEdit={commitInlineEdit}
                          setTaskModalState={setTaskModalState}
                          deleteTask={deleteTask}
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={handleSort}
                          userEmail={userEmail}
                          hideGroupCol={groupBy}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat Table */
            <section className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="overflow-x-auto">
                <TaskTable
                  tasks={tasksToRender}
                  inlineEdit={inlineEdit}
                  setInlineEdit={setInlineEdit}
                  commitInlineEdit={commitInlineEdit}
                  setTaskModalState={setTaskModalState}
                  deleteTask={deleteTask}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  userEmail={userEmail}
                />
              </div>
              {tasksToRender.length === 0 && (
                <div className="py-20 text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">No tasks found</p>
                  <p className="mt-1 text-sm text-zinc-500">Try adjusting your filters or add a new task.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </section>
          )
        ) : (
          /* ── Kanban View ── */
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {TASK_STATUSES.map(status => {
              const tasksInStatus = filteredTasks.filter(t => t.status === status);
              const colors = STATUS_COLORS[status] || STATUS_COLORS['Pending'];
              const colStyle = KANBAN_COLUMN_STYLES[status] || KANBAN_COLUMN_STYLES['Pending'];
              return (
                <div key={status} className="flex flex-col min-w-0">
                  <div className={`rounded-t-xl border border-b-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 ${colStyle.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${colStyle.header}`}>{status}</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colStyle.count}`}>{tasksInStatus.length}</span>
                        <button
                          onClick={() => {
                            if (!defaultCampaign) { toast.error('Create a campaign first'); return; }
                            setTaskModalState({ campaignId: defaultCampaign.id, defaultTeamId: defaultCampaign.teamPlans[0]?.teamId || OPERATIONS_TEAMS[0].id });
                          }}
                          className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title={`Add ${status} task`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[65vh] rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-2">
                    <AnimatePresence mode="popLayout">
                      {tasksInStatus.map(task => {
                        const overdue = isTaskOverdue(task);
                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            key={task.id}
                            onClick={() => setTaskModalState({ campaignId: task.campaignId, defaultTeamId: task.teamId, task })}
                            className={`bg-white dark:bg-zinc-950 p-3.5 rounded-xl border hover:shadow-md transition-all cursor-pointer group ${
                              overdue
                                ? 'border-rose-200 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800/60'
                                : 'border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md truncate max-w-[130px]" title={task.campaign}>{task.campaign}</span>
                              <PriorityBadge priority={task.priority} />
                            </div>
                            <h4 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 leading-snug mb-1.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">{task.title}</h4>
                            {task.description && <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2.5 leading-relaxed">{task.description}</p>}
                            <div className="flex items-center gap-1.5 mb-2.5">
                              <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded-md">{task.teamName}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                              <div className="flex items-center gap-1.5 text-zinc-500 min-w-0">
                                <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-black shrink-0 text-zinc-500">
                                  {getAssigneeLabel(task, task.teamName).charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate font-medium">{getAssigneeLabel(task, task.teamName)}</span>
                              </div>
                              <span className={`shrink-0 font-bold flex items-center gap-0.5 ${overdue ? 'text-rose-500' : 'text-zinc-400'}`}>
                                {overdue && <AlertCircle className="w-3 h-3" />}
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '–'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {tasksInStatus.length === 0 && (
                      <div className="py-8 text-center text-xs font-medium text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      <TaskEditorModal
        isOpen={Boolean(taskModalState)}
        task={taskModalState?.task}
        defaultTeamId={taskModalState?.defaultTeamId || OPERATIONS_TEAMS[0].id}
        teamMembers={teamMembers}
        onClose={() => setTaskModalState(null)}
        onSave={updateCampaignTask}
      />
    </motion.div>
  );
}

/* ── TaskTable ── */
function TaskTable({
  tasks,
  inlineEdit,
  setInlineEdit,
  commitInlineEdit,
  setTaskModalState,
  deleteTask,
  sortField,
  sortDir,
  onSort,
  userEmail: _userEmail,
  hideGroupCol,
}: {
  tasks: FlattenedOperationalTask[];
  inlineEdit: InlineEdit;
  setInlineEdit: (v: InlineEdit) => void;
  commitInlineEdit: () => void;
  setTaskModalState: (v: TaskModalState) => void;
  deleteTask: (cId: string, tId: string, id: string) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  userEmail: string;
  hideGroupCol?: GroupBy;
}) {
  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field
          ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 opacity-30" />
        }
      </div>
    </th>
  );

  return (
    <table className="w-full min-w-[900px]">
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 text-left sticky top-0">
          {hideGroupCol !== 'campaign' && <SortHeader field="campaign" label="Campaign" />}
          <SortHeader field="title" label="Task" />
          {hideGroupCol !== 'team' && <SortHeader field="team" label="Team" />}
          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assignee</th>
          {hideGroupCol !== 'status' && <SortHeader field="status" label="Status" />}
          <SortHeader field="priority" label="Priority" />
          <SortHeader field="dueDate" label="Due" />
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody>
        <AnimatePresence mode="popLayout">
          {tasks.map((task, index) => {
            const overdue = isTaskOverdue(task);
            return (
              <motion.tr
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.15, delay: index < 20 ? index * 0.015 : 0 }}
                key={task.id}
                className={`border-b text-sm transition-colors group ${
                  overdue
                    ? 'border-rose-50 dark:border-rose-900/20 bg-rose-50/30 dark:bg-rose-900/5 hover:bg-rose-50/50 dark:hover:bg-rose-900/10'
                    : 'border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30'
                }`}
              >
                {hideGroupCol !== 'campaign' && (
                  <td className="px-4 py-3.5 max-w-[150px]">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-xs">{task.campaign}</div>
                    {task.campaignPhase && <div className="text-[10px] text-zinc-400 mt-0.5">{task.campaignPhase}</div>}
                  </td>
                )}
                <td className="px-4 py-3.5 max-w-[260px]">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px] leading-snug">{task.title}</div>
                  {task.description && <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[240px]">{task.description}</div>}
                </td>
                {hideGroupCol !== 'team' && (
                  <td className="px-4 py-3.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">{task.teamName}</td>
                )}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0">
                      {getAssigneeLabel(task, task.teamName).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]">{getAssigneeLabel(task, task.teamName)}</span>
                  </div>
                </td>

                {/* Status */}
                {hideGroupCol !== 'status' && (
                  <td className="px-4 py-3.5">
                    {inlineEdit?.taskId === task.id && inlineEdit.field === 'status' ? (
                      <div className="flex items-center gap-1">
                        <select autoFocus value={inlineEdit.value}
                          onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                          className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-bold px-2 py-1 outline-none">
                          {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={commitInlineEdit} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setInlineEdit(null)} className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setInlineEdit({ taskId: task.id, field: 'status', value: task.status })} title="Click to change">
                        <StatusBadge status={task.status} />
                      </button>
                    )}
                  </td>
                )}

                {/* Priority */}
                <td className="px-4 py-3.5">
                  {inlineEdit?.taskId === task.id && inlineEdit.field === 'priority' ? (
                    <div className="flex items-center gap-1">
                      <select autoFocus value={inlineEdit.value}
                        onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-bold px-2 py-1 outline-none">
                        {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={commitInlineEdit} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setInlineEdit(null)} className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setInlineEdit({ taskId: task.id, field: 'priority', value: task.priority })} title="Click to change">
                      <PriorityBadge priority={task.priority} />
                    </button>
                  )}
                </td>

                {/* Due Date */}
                <td className="px-4 py-3.5">
                  {inlineEdit?.taskId === task.id && inlineEdit.field === 'dueDate' ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus type="date" value={inlineEdit.value}
                        onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-bold px-2 py-1 outline-none" />
                      <button onClick={commitInlineEdit} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setInlineEdit(null)} className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setInlineEdit({ taskId: task.id, field: 'dueDate', value: task.dueDate || '' })}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${overdue ? 'text-rose-500 hover:text-rose-700' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                    >
                      {overdue && <AlertCircle className="w-3 h-3" />}
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : <span className="text-zinc-300 dark:text-zinc-700 italic">No date</span>
                      }
                    </button>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setTaskModalState({ campaignId: task.campaignId, defaultTeamId: task.teamId, task })}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteTask(task.campaignId, task.teamId, task.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </AnimatePresence>
      </tbody>
    </table>
  );
}

/* ── Sub-components ── */

function KpiTile({
  label, value, sub, color, icon, progress, progressColor, clickable, onClick,
}: {
  label: string; value: number | string; sub?: string; color?: string;
  icon?: React.ReactNode; progress?: number; progressColor?: string;
  clickable?: boolean; onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-3.5 flex flex-col gap-1 ${clickable ? 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
        {icon && <div className="text-zinc-300 dark:text-zinc-700">{icon}</div>}
      </div>
      <div className={`text-xl font-black tabular-nums ${color || 'text-zinc-900 dark:text-zinc-100'}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-400">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor || 'bg-zinc-900'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS['Pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS['Low'];
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${color}`}>
      {priority}
    </span>
  );
}

function CompactFilter({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
