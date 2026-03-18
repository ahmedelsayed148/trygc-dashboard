import React, { useContext, useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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

type TaskNotificationRecord = {
  id: string;
  type: string;
  taskId: string;
  taskName: string;
  taskDescription: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  timestamp: string;
  time: string;
  date: string;
  read: boolean;
};

type TeamMember = {
  email: string;
  name: string;
  teamName?: string;
};

const EMPTY_CAMPAIGNS: OpsCampaign[] = [];
const EMPTY_TEAM_MEMBERS: TeamMember[] = [];
const EMPTY_OPERATIONAL_TASKS: FlattenedOperationalTask[] = [];
const EMPTY_DISABLED_TEAMS: string[] = [];

export function AllTasks() {
  const ctx = useContext(AppContext);
  const opsCampaigns = normalizeOpsCampaigns(ctx?.opsCampaigns ?? EMPTY_CAMPAIGNS);
  const setOpsCampaigns = ctx?.setOpsCampaigns || (() => {});
  const teamMembers = (ctx?.teamMembers as TeamMember[] | undefined) ?? EMPTY_TEAM_MEMBERS;
  const operationalTasks =
    (ctx?.operationalTasks as unknown as FlattenedOperationalTask[] | undefined) ?? EMPTY_OPERATIONAL_TASKS;
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
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredTasks = useMemo(() => {
    const matchingTasks = operationalTasks.filter((task) => {
      const isCommunityTask = task.campaignId?.startsWith('community-');
      const matchesSearch =
        !deferredSearch ||
        task.campaign.toLowerCase().includes(deferredSearch) ||
        task.title.toLowerCase().includes(deferredSearch) ||
        task.teamName.toLowerCase().includes(deferredSearch) ||
        task.assignedLabel.toLowerCase().includes(deferredSearch) ||
        String(task.campaignCriteria || '').toLowerCase().includes(deferredSearch) ||
        String(task.campaignMethodology || '').toLowerCase().includes(deferredSearch) ||
        String(task.metricTarget || '').toLowerCase().includes(deferredSearch) ||
        String(task.metricCON || '').toLowerCase().includes(deferredSearch) ||
        String(task.metricCOV || '').toLowerCase().includes(deferredSearch) ||
        (isCommunityTask &&
          (String(task.criteria || '').toLowerCase().includes(deferredSearch) ||
            String(task.methodology || '').toLowerCase().includes(deferredSearch)));
      const matchesCampaign = campaignFilter === 'All' || task.campaignId === campaignFilter;
      const matchesTeam = teamFilter === 'All' || task.teamId === teamFilter;
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesEnabledTeam = !disabledTeams.includes(task.teamId);
      return matchesSearch && matchesCampaign && matchesTeam && matchesStatus && matchesPriority && matchesEnabledTeam;
    });

    return filterByDateRange(
      matchingTasks,
      dateRange,
      (task) => task.dueDate || task.updatedAt || task.createdAt,
    );
  }, [campaignFilter, dateRange, deferredSearch, disabledTeams, operationalTasks, priorityFilter, statusFilter, teamFilter]);

  const summary = useMemo(() => ({
    total: filteredTasks.length,
    done: filteredTasks.filter((task) => task.status === 'Done').length,
    blocked: filteredTasks.filter((task) => task.status === 'Blocked').length,
    assigned: filteredTasks.filter((task) => task.assignmentMode !== 'unassigned').length,
  }), [filteredTasks]);

  const defaultCampaign = opsCampaigns.find((campaign) => campaign.id === campaignFilter) || opsCampaigns[0];

  const updateCampaignTask = (nextTask: CampaignTeamTask) => {
    if (!taskModalState) return;
    const campaign = opsCampaigns.find((item) => item.id === taskModalState.campaignId);
    setOpsCampaigns((current: OpsCampaign[]) =>
      current.map((campaign) => {
        if (campaign.id !== taskModalState.campaignId) return campaign;
        return {
          ...campaign,
          updatedAt: new Date().toISOString(),
          teamPlans: campaign.teamPlans.map((plan) => {
            const withoutTask = plan.tasks.filter((task) => task.id !== nextTask.id);
            if (plan.teamId === nextTask.teamId) return { ...plan, tasks: [nextTask, ...withoutTask] };
            return { ...plan, tasks: withoutTask };
          }),
        };
      }),
    );
    if (campaign) {
      setTaskNotifications((current: TaskNotificationRecord[]) =>
        appendAssignmentNotification({
          currentNotifications: current,
          previousTask: taskModalState.task,
          nextTask,
          campaignId: campaign.id,
          campaignName: campaign.name,
          assignedBy: userEmail,
        }),
      );
    }
    toast.success(taskModalState.task ? 'Task updated' : 'Task created');
    setTaskModalState(null);
  };

  const patchTask = (campaignId: string, teamId: string, taskId: string, patch: Partial<CampaignTeamTask>) => {
    setOpsCampaigns((current: OpsCampaign[]) =>
      current.map((campaign) => {
        if (campaign.id !== campaignId) return campaign;
        return {
          ...campaign,
          updatedAt: new Date().toISOString(),
          teamPlans: campaign.teamPlans.map((plan) => {
            if (plan.teamId !== teamId) return plan;
            return {
              ...plan,
              tasks: plan.tasks.map((task) =>
                task.id === taskId ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task,
              ),
            };
          }),
        };
      }),
    );
  };

  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const task = operationalTasks.find((candidate) => candidate.id === inlineEdit.taskId);
    if (!task) { setInlineEdit(null); return; }

    const patch: Partial<CampaignTeamTask> = {};
    if (inlineEdit.field === 'status') {
      patch.status = inlineEdit.value as TaskStatus;
    } else if (inlineEdit.field === 'priority') {
      patch.priority = inlineEdit.value as TaskPriority;
    } else {
      patch.dueDate = inlineEdit.value;
    }

    patchTask(task.campaignId, task.teamId, task.id, patch);
    toast.success('Task updated');
    setInlineEdit(null);
  };

  const deleteTask = (campaignId: string, teamId: string, taskId: string) => {
    setOpsCampaigns((current: OpsCampaign[]) =>
      current.map((campaign) => {
        if (campaign.id !== campaignId) return campaign;
        return {
          ...campaign,
          updatedAt: new Date().toISOString(),
          teamPlans: campaign.teamPlans.map((plan) => {
            if (plan.teamId !== teamId) return plan;
            return { ...plan, tasks: plan.tasks.filter((task) => task.id !== taskId) };
          }),
        };
      }),
    );
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Master Task Registry</p>
              <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">All campaign subtasks across all teams</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Click any status, priority, or due date to edit inline. Use the pencil icon for full task editing.
              </p>
            </div>
            <button
              onClick={() => {
                if (!defaultCampaign) { toast.error('Create a campaign first'); return; }
                setTaskModalState({ campaignId: defaultCampaign.id, defaultTeamId: defaultCampaign.teamPlans[0]?.teamId || OPERATIONS_TEAMS[0].id });
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <StatTile label="Visible Tasks" value={summary.total} />
            <StatTile label="Done" value={summary.done} />
            <StatTile label="Blocked" value={summary.blocked} />
            <StatTile label="Assigned" value={summary.assigned} />
          </div>

          <div className="mt-6 grid gap-3 xl:grid-cols-[1.5fr,repeat(4,minmax(0,1fr))]">
            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by campaign, task, assignee, metrics…"
                className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </label>
            <FilterSelect label="Campaign" value={campaignFilter} onChange={setCampaignFilter}
              options={[['All', 'All Campaigns'], ...opsCampaigns.map((c): [string, string] => [c.id, c.name])]} />
            <FilterSelect label="Team" value={teamFilter} onChange={setTeamFilter}
              options={[['All', 'All Teams'], ...OPERATIONS_TEAMS.filter((t) => !disabledTeams.includes(t.id)).map((t): [string, string] => [t.id, t.name])]} />
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}
              options={[['All', 'All Statuses'], ...TASK_STATUSES.map((s): [string, string] => [s, s])]} />
            <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter}
              options={[['All', 'All Priorities'], ...TASK_PRIORITIES.map((p): [string, string] => [p, p])]} />
          </div>
          <div className="mt-4">
            <DateRangeFilter label="Task Date Range" value={dateRange} onChange={setDateRange} />
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr className="text-left">
                  {['Campaign', 'Team', 'Task', 'Assignment', 'Status', 'Priority', 'Due Date', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-zinc-100 text-sm last:border-b-0 dark:border-zinc-900 group">
                    <td className="px-6 py-5">
                      <div className="font-black text-zinc-900 dark:text-zinc-100">{task.campaign}</div>
                      <div className="mt-1 text-xs text-zinc-500">{task.campaignPhase}</div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-zinc-700 dark:text-zinc-300">{task.teamName}</td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{task.title}</div>
                      <div className="mt-1 max-w-md text-xs text-zinc-500">{task.description || 'No description yet'}</div>
                      {(task.metricTarget || task.metricCON || task.metricCOV) && (
                        <div className="mt-2 max-w-md space-y-1 text-[11px] text-zinc-500">
                          {task.metricTarget > 0 && <div><span className="font-bold text-zinc-700 dark:text-zinc-300">Target:</span> {task.metricTarget}</div>}
                          {task.metricCON > 0 && <div><span className="font-bold text-zinc-700 dark:text-zinc-300">Confirmations:</span> {task.metricCON}</div>}
                          {task.metricCOV > 0 && <div><span className="font-bold text-zinc-700 dark:text-zinc-300">Coverage:</span> {task.metricCOV}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {getAssigneeLabel(task, task.teamName)}
                    </td>

                    {/* Inline-editable Status */}
                    <td className="px-6 py-5">
                      {inlineEdit?.taskId === task.id && inlineEdit.field === 'status' ? (
                        <div className="flex items-center gap-1">
                          <select
                            autoFocus
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            className="rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 px-2 py-1 outline-none"
                          >
                            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={commitInlineEdit} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setInlineEdit(null)} className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setInlineEdit({ taskId: task.id, field: 'status', value: task.status })}
                          className="group/pill"
                          title="Click to edit status"
                        >
                          <Pill tone="muted">{task.status}</Pill>
                        </button>
                      )}
                    </td>

                    {/* Inline-editable Priority */}
                    <td className="px-6 py-5">
                      {inlineEdit?.taskId === task.id && inlineEdit.field === 'priority' ? (
                        <div className="flex items-center gap-1">
                          <select
                            autoFocus
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            className="rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 px-2 py-1 outline-none"
                          >
                            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <button onClick={commitInlineEdit} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setInlineEdit(null)} className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setInlineEdit({ taskId: task.id, field: 'priority', value: task.priority })}
                          title="Click to edit priority"
                        >
                          <Pill tone={task.priority === 'Critical' || task.priority === 'High' ? 'strong' : 'muted'}>
                            {task.priority}
                          </Pill>
                        </button>
                      )}
                    </td>

                    {/* Inline-editable Due Date */}
                    <td className="px-6 py-5">
                      {inlineEdit?.taskId === task.id && inlineEdit.field === 'dueDate' ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="date"
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            className="rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 px-2 py-1 outline-none"
                          />
                          <button onClick={commitInlineEdit} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setInlineEdit(null)} className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setInlineEdit({ taskId: task.id, field: 'dueDate', value: task.dueDate || '' })}
                          className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-2 transition-colors"
                          title="Click to edit due date"
                        >
                          {task.dueDate || <span className="text-zinc-400 italic">Set date</span>}
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTaskModalState({ campaignId: task.campaignId, defaultTeamId: task.teamId, task })}
                          className="rounded-xl p-2 text-zinc-500 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Full edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.campaignId, task.teamId, task.id)}
                          className="rounded-xl p-2 text-zinc-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="p-12 text-center">
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">No tasks matched the current filters</h3>
              <p className="mt-2 text-sm text-zinc-500">Try another campaign, team, or status filter.</p>
            </div>
          )}
        </section>
      </div>

      <TaskEditorModal
        isOpen={Boolean(taskModalState)}
        task={taskModalState?.task}
        defaultTeamId={taskModalState?.defaultTeamId || OPERATIONS_TEAMS[0].id}
        teamMembers={teamMembers}
        onClose={() => setTaskModalState(null)}
        onSave={updateCampaignTask}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
      <div className="mt-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: 'strong' | 'muted' }) {
  const className = tone === 'strong'
    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black'
    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className} hover:opacity-80 transition-opacity cursor-pointer`}>
      {children}
    </span>
  );
}
