import React, { useCallback, useContext, useDeferredValue, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";

import { AppContext } from "./Root";
import { DateRangeFilter } from "./DateRangeFilter";
import { TaskEditorModal } from "./operations/TaskEditorModal";
import { appendAssignmentNotification } from "../lib/taskNotifications";
import { emptyDateRange, filterByDateRange } from "../lib/dateFilters";
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
} from "../lib/operations";
import type { CommunityWorkspace } from "../lib/communityWorkspace";

type TaskModalState = {
  campaignId: string;
  defaultTeamId: string;
  task?: CampaignTeamTask;
} | null;

type QuickFilter = "all" | "mine" | "overdue" | "blocked" | "critical";

type TeamMember = { email: string; name: string; teamName?: string };
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

const EMPTY_CAMPAIGNS: OpsCampaign[] = [];
const EMPTY_TEAM_MEMBERS: TeamMember[] = [];
const EMPTY_OPERATIONAL_TASKS: FlattenedOperationalTask[] = [];
const EMPTY_DISABLED_TEAMS: string[] = [];
const NOOP_SET_OPS_CAMPAIGNS: React.Dispatch<React.SetStateAction<OpsCampaign[]>> = () => undefined;
const NOOP_SET_COMMUNITY_WORKSPACE: React.Dispatch<React.SetStateAction<CommunityWorkspace>> = () => undefined;
const NOOP_SET_TASK_NOTIFICATIONS: React.Dispatch<React.SetStateAction<TaskNotificationRecord[]>> = () => undefined;

const STATUS_STYLES: Record<string, { dot: string; pill: string; panel: string }> = {
  Pending: {
    dot: "bg-zinc-400",
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    panel: "border-zinc-200/80 dark:border-zinc-800/80",
  },
  "In Progress": {
    dot: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    panel: "border-amber-500/20",
  },
  Blocked: {
    dot: "bg-rose-500",
    pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    panel: "border-rose-500/20",
  },
  Done: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    panel: "border-emerald-500/20",
  },
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  High: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  Medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  Low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
};

function isTaskOverdue(task: FlattenedOperationalTask) {
  if (!task.dueDate || task.status === "Done") {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate.getTime() < today.getTime();
}

function formatDateLabel(value?: string) {
  if (!value) {
    return "No due date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: parsed.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function getTaskAgeLabel(task: FlattenedOperationalTask) {
  const reference = task.updatedAt || task.createdAt || task.startDateTime;
  const stamp = new Date(reference).getTime();

  if (Number.isNaN(stamp)) {
    return "Unknown";
  }

  const hours = Math.max(1, Math.round((Date.now() - stamp) / (1000 * 60 * 60)));
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

export function AllTasks() {
  const ctx = useContext(AppContext);
  const opsCampaigns = useMemo(
    () => normalizeOpsCampaigns(ctx?.opsCampaigns ?? EMPTY_CAMPAIGNS),
    [ctx?.opsCampaigns],
  );
  const operationalTasks = (ctx?.operationalTasks as unknown as FlattenedOperationalTask[] | undefined) ?? EMPTY_OPERATIONAL_TASKS;
  const teamMembers = (ctx?.teamMembers as TeamMember[] | undefined) ?? EMPTY_TEAM_MEMBERS;
  const disabledTeams = ctx?.disabledTeams ?? EMPTY_DISABLED_TEAMS;
  const setOpsCampaigns = ctx?.setOpsCampaigns ?? NOOP_SET_OPS_CAMPAIGNS;
  const setCommunityWorkspace = ctx?.setCommunityWorkspace ?? NOOP_SET_COMMUNITY_WORKSPACE;
  const setTaskNotifications = ctx?.setTaskNotifications ?? NOOP_SET_TASK_NOTIFICATIONS;
  const userEmail = ctx?.userEmail || "";

  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [taskModalState, setTaskModalState] = useState<TaskModalState>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const visibleTasks = useMemo(() => {
    let nextTasks = operationalTasks.filter((task) => !disabledTeams.includes(task.teamId));

    nextTasks = nextTasks.filter((task) => {
      const searchHaystack = [
        task.campaign,
        task.title,
        task.description,
        task.teamName,
        task.assignedLabel,
        task.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (deferredSearch && !searchHaystack.includes(deferredSearch)) {
        return false;
      }

      if (campaignFilter !== "all" && task.campaignId !== campaignFilter) {
        return false;
      }

      if (teamFilter !== "all" && task.teamId !== teamFilter) {
        return false;
      }

      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      return true;
    });

    nextTasks = filterByDateRange(nextTasks, dateRange, (task) => task.dueDate || task.updatedAt || task.createdAt);

    if (quickFilter === "mine") {
      const lookup = userEmail.toLowerCase();
      nextTasks = nextTasks.filter((task) => {
        const label = getAssigneeLabel(task, task.teamName).toLowerCase();
        return task.assignedToEmail?.toLowerCase() === lookup || label.includes(lookup.split("@")[0]);
      });
    }

    if (quickFilter === "overdue") {
      nextTasks = nextTasks.filter(isTaskOverdue);
    }

    if (quickFilter === "blocked") {
      nextTasks = nextTasks.filter((task) => task.status === "Blocked");
    }

    if (quickFilter === "critical") {
      nextTasks = nextTasks.filter((task) => task.priority === "Critical" || task.priority === "High");
    }

    return [...nextTasks].sort((left, right) => {
      const leftOverdue = isTaskOverdue(left) ? 1 : 0;
      const rightOverdue = isTaskOverdue(right) ? 1 : 0;
      if (leftOverdue !== rightOverdue) {
        return rightOverdue - leftOverdue;
      }

      const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const priorityDelta = (priorityRank[left.priority] ?? 9) - (priorityRank[right.priority] ?? 9);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return new Date(left.dueDate || left.updatedAt).getTime() - new Date(right.dueDate || right.updatedAt).getTime();
    });
  }, [
    campaignFilter,
    dateRange,
    deferredSearch,
    disabledTeams,
    operationalTasks,
    priorityFilter,
    quickFilter,
    statusFilter,
    teamFilter,
    userEmail,
  ]);

  const selectedTask = useMemo(() => {
    if (!visibleTasks.length) {
      return null;
    }

    return visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0];
  }, [selectedTaskId, visibleTasks]);

  const summary = useMemo(() => {
    const total = visibleTasks.length;
    const overdue = visibleTasks.filter(isTaskOverdue).length;
    const blocked = visibleTasks.filter((task) => task.status === "Blocked").length;
    const completed = visibleTasks.filter((task) => task.status === "Done").length;
    const inProgress = visibleTasks.filter((task) => task.status === "In Progress").length;
    const unassigned = visibleTasks.filter((task) => task.assignmentMode === "unassigned").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, overdue, blocked, completed, inProgress, unassigned, completionRate };
  }, [visibleTasks]);

  const boardColumns = useMemo(
    () =>
      TASK_STATUSES.map((status) => ({
        status,
        tasks: visibleTasks.filter((task) => task.status === status),
      })),
    [visibleTasks],
  );

  const campaigns = useMemo<[string, string][]>(
    () => [["all", "All Campaigns"] as [string, string], ...opsCampaigns.map((campaign) => [campaign.id, campaign.name] as [string, string])],
    [opsCampaigns],
  );
  const teams = useMemo<[string, string][]>(
    () => [["all", "All Teams"] as [string, string], ...OPERATIONS_TEAMS.map((team) => [team.id, team.name] as [string, string])],
    [],
  );

  const defaultCampaign = opsCampaigns[0];

  const patchTask = useCallback(
    (task: FlattenedOperationalTask, patch: Partial<CampaignTeamTask>) => {
      if (task.campaignId.startsWith("community-")) {
        setCommunityWorkspace((current: CommunityWorkspace) => ({
          ...current,
          updatedAt: new Date().toISOString(),
          countries: current.countries.map((country) => {
            if (`community-${country.id}` !== task.campaignId) {
              return country;
            }

            return {
              ...country,
              tasks: country.tasks.map((entry: CampaignTeamTask) =>
                entry.id === task.id
                  ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
                  : entry,
              ),
            };
          }),
        }));
        return;
      }

      setOpsCampaigns((current: OpsCampaign[]) =>
        current.map((campaign) => {
          if (campaign.id !== task.campaignId) {
            return campaign;
          }

          return {
            ...campaign,
            updatedAt: new Date().toISOString(),
            teamPlans: campaign.teamPlans.map((plan) => {
              if (plan.teamId !== task.teamId) {
                return plan;
              }

              return {
                ...plan,
                tasks: plan.tasks.map((entry) =>
                  entry.id === task.id
                    ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
                    : entry,
                ),
              };
            }),
          };
        }),
      );
    },
    [setCommunityWorkspace, setOpsCampaigns],
  );

  const handleDeleteTask = useCallback(
    (task: FlattenedOperationalTask) => {
      if (task.campaignId.startsWith("community-")) {
        setCommunityWorkspace((current: CommunityWorkspace) => ({
          ...current,
          updatedAt: new Date().toISOString(),
          countries: current.countries.map((country) => {
            if (`community-${country.id}` !== task.campaignId) {
              return country;
            }

            return {
              ...country,
              tasks: country.tasks.filter((entry: CampaignTeamTask) => entry.id !== task.id),
            };
          }),
        }));
      } else {
        setOpsCampaigns((current: OpsCampaign[]) =>
          current.map((campaign) => {
            if (campaign.id !== task.campaignId) {
              return campaign;
            }

            return {
              ...campaign,
              updatedAt: new Date().toISOString(),
              teamPlans: campaign.teamPlans.map((plan) =>
                plan.teamId === task.teamId
                  ? { ...plan, tasks: plan.tasks.filter((entry) => entry.id !== task.id) }
                  : plan,
              ),
            };
          }),
        );
      }

      if (selectedTaskId === task.id) {
        setSelectedTaskId(null);
      }

      toast.success("Task removed");
    },
    [selectedTaskId, setCommunityWorkspace, setOpsCampaigns],
  );

  const handleSaveTask = useCallback(
    (nextTask: CampaignTeamTask) => {
      if (!taskModalState) {
        return;
      }

      if (taskModalState.campaignId.startsWith("community-")) {
        setCommunityWorkspace((current: CommunityWorkspace) => ({
          ...current,
          updatedAt: new Date().toISOString(),
          countries: current.countries.map((country) => {
            if (`community-${country.id}` !== taskModalState.campaignId) {
              return country;
            }

            const withoutTask = country.tasks.filter((entry: CampaignTeamTask) => entry.id !== nextTask.id);
            return { ...country, tasks: [nextTask, ...withoutTask] };
          }),
        }));
      } else {
        const campaign = opsCampaigns.find((entry) => entry.id === taskModalState.campaignId);

        setOpsCampaigns((current: OpsCampaign[]) =>
          current.map((entry) => {
            if (entry.id !== taskModalState.campaignId) {
              return entry;
            }

            return {
              ...entry,
              updatedAt: new Date().toISOString(),
              teamPlans: entry.teamPlans.map((plan) => {
                const withoutTask = plan.tasks.filter((item) => item.id !== nextTask.id);
                if (plan.teamId === nextTask.teamId) {
                  return { ...plan, tasks: [nextTask, ...withoutTask] };
                }
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
      }

      setTaskModalState(null);
      toast.success(taskModalState.task ? "Task updated" : "Task created");
    },
    [opsCampaigns, setCommunityWorkspace, setOpsCampaigns, setTaskNotifications, taskModalState, userEmail],
  );

  const openNewTask = () => {
    if (!defaultCampaign) {
      toast.error("Create a campaign first");
      return;
    }

    setTaskModalState({
      campaignId: defaultCampaign.id,
      defaultTeamId: defaultCampaign.teamPlans[0]?.teamId || OPERATIONS_TEAMS[0].id,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setCampaignFilter("all");
    setTeamFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setQuickFilter("all");
    setDateRange(emptyDateRange);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-6"
    >
      <section className="app-hero-panel rounded-[var(--app-card-radius)] border p-6 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="app-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
              <Sparkles className="h-3.5 w-3.5" />
              Task Command Center
            </div>
            <h1 className="app-hero-title mt-4 text-3xl font-black tracking-tight md:text-4xl">All Tasks</h1>
            <p className="app-hero-copy mt-2 text-sm leading-6 md:text-base">
              Triage the full operation from one place. Filter quickly, focus on blockers, and take action without losing context.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
            <HeroKpi label="Visible" value={summary.total} icon={<Target className="h-4 w-4" />} />
            <HeroKpi label="Overdue" value={summary.overdue} icon={<AlertCircle className="h-4 w-4" />} tone="danger" />
            <HeroKpi label="Blocked" value={summary.blocked} icon={<Clock3 className="h-4 w-4" />} tone="warning" />
            <HeroKpi label="Done" value={`${summary.completionRate}%`} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-4">
          <div className="app-panel rounded-[var(--app-card-radius)] border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="app-control-surface flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by campaign, task, assignee, notes, or team"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilters((current) => !current)}
                  className="app-control-surface rounded-xl border px-3 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-[hsl(var(--muted)/0.72)] dark:text-zinc-300"
                >
                  <Filter className="mr-1.5 inline h-3.5 w-3.5" />
                  Filters
                </button>
                <ViewToggle active={viewMode} onChange={setViewMode} />
                <button onClick={openNewTask} className="app-accent-button rounded-xl px-4 py-2 text-xs font-black">
                  <Plus className="mr-1.5 inline h-3.5 w-3.5" />
                  Add Task
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {([
                { id: "all", label: "All", value: summary.total },
                { id: "mine", label: "My Queue", value: visibleTasks.filter((task) => task.assignedToEmail === userEmail).length },
                { id: "overdue", label: "Overdue", value: summary.overdue },
                { id: "blocked", label: "Blocked", value: summary.blocked },
                { id: "critical", label: "Critical", value: visibleTasks.filter((task) => task.priority === "Critical" || task.priority === "High").length },
              ] as Array<{ id: QuickFilter; label: string; value: number }>).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setQuickFilter(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition-all ${
                    quickFilter === item.id
                      ? "app-accent-button"
                      : "app-control-surface border text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {item.label}
                  <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[10px] dark:bg-white/10">{item.value}</span>
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="app-control-surface mt-4 grid gap-3 rounded-[1.25rem] border p-4 md:grid-cols-2 xl:grid-cols-5">
                <CompactFilter label="Campaign" value={campaignFilter} onChange={setCampaignFilter} options={campaigns} />
                <CompactFilter label="Team" value={teamFilter} onChange={setTeamFilter} options={teams} />
                <CompactFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={[["all", "All Statuses"], ...TASK_STATUSES.map((item) => [item, item] as [string, string])]} />
                <CompactFilter label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={[["all", "All Priorities"], ...TASK_PRIORITIES.map((item) => [item, item] as [string, string])]} />
                <div className="space-y-2">
                  <DateRangeFilter label="Date Range" value={dateRange} onChange={setDateRange} />
                  <button onClick={clearFilters} className="text-xs font-bold text-zinc-500 underline underline-offset-2 dark:text-zinc-400">
                    Reset all filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <InsightCard title="Needs action" value={summary.overdue + summary.blocked} description="Overdue + blocked tasks that need direct attention" tone="danger" />
            <InsightCard title="In motion" value={summary.inProgress} description="Tasks actively moving across the team" tone="warning" />
            <InsightCard title="Unassigned" value={summary.unassigned} description="Work that still needs an owner" />
            <InsightCard title="Delivered" value={summary.completed} description="Completed tasks inside the current view" tone="success" />
          </div>

          {viewMode === "list" ? (
            <TaskListView
              tasks={visibleTasks}
              selectedTaskId={selectedTask?.id || null}
              onDelete={handleDeleteTask}
              onEdit={(task) => setTaskModalState({ campaignId: task.campaignId, defaultTeamId: task.teamId, task })}
              onQuickStatus={(task, status) => patchTask(task, { status })}
              onQuickPriority={(task, priority) => patchTask(task, { priority })}
              onSelect={setSelectedTaskId}
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-4">
              {boardColumns.map((column) => (
                <BoardColumn
                  key={column.status}
                  status={column.status}
                  tasks={column.tasks}
                  selectedTaskId={selectedTask?.id || null}
                  onSelect={setSelectedTaskId}
                />
              ))}
            </div>
          )}
        </div>

        <TaskFocusPanel
          task={selectedTask}
          onDelete={handleDeleteTask}
          onEdit={(task) => setTaskModalState({ campaignId: task.campaignId, defaultTeamId: task.teamId, task })}
          onQuickPriority={(task, priority) => patchTask(task, { priority })}
          onQuickStatus={(task, status) => patchTask(task, { status })}
        />
      </section>

      <TaskEditorModal
        isOpen={Boolean(taskModalState)}
        task={taskModalState?.task}
        defaultTeamId={taskModalState?.defaultTeamId || OPERATIONS_TEAMS[0].id}
        teamMembers={teamMembers}
        onClose={() => setTaskModalState(null)}
        onSave={handleSaveTask}
      />
    </motion.div>
  );
}

function HeroKpi({
  icon,
  label,
  tone,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "success" | "warning" | "danger";
  value: number | string;
}) {
  const toneClass =
    tone === "danger"
      ? "app-hero-stat bg-rose-500/14"
      : tone === "warning"
      ? "app-hero-stat bg-amber-500/14"
      : tone === "success"
      ? "app-hero-stat bg-emerald-500/14"
      : "app-hero-stat";

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="app-hero-kicker text-[11px] font-black uppercase tracking-[0.18em]">{label}</span>
        <div className={`rounded-xl p-2 ${toneClass}`}>{icon}</div>
      </div>
      <div className="app-hero-title mt-3 text-2xl font-black">{value}</div>
    </div>
  );
}

function ViewToggle({
  active,
  onChange,
}: {
  active: "list" | "board";
  onChange: (value: "list" | "board") => void;
}) {
  return (
    <div className="app-control-surface flex rounded-xl border p-1">
      <button
        onClick={() => onChange("list")}
        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${active === "list" ? "app-accent-button" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        <List className="mr-1 inline h-3.5 w-3.5" />
        List
      </button>
      <button
        onClick={() => onChange("board")}
        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${active === "board" ? "app-accent-button" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        <LayoutGrid className="mr-1 inline h-3.5 w-3.5" />
        Board
      </button>
    </div>
  );
}

function InsightCard({
  description,
  title,
  tone,
  value,
}: {
  description: string;
  title: string;
  tone?: "success" | "warning" | "danger";
  value: number;
}) {
  const valueClass =
    tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-zinc-900 dark:text-zinc-100";

  return (
    <div className="app-panel rounded-[1.4rem] border p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{title}</div>
      <div className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</div>
      <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function TaskListView({
  onDelete,
  onEdit,
  onQuickPriority,
  onQuickStatus,
  onSelect,
  selectedTaskId,
  tasks,
}: {
  onDelete: (task: FlattenedOperationalTask) => void;
  onEdit: (task: FlattenedOperationalTask) => void;
  onQuickPriority: (task: FlattenedOperationalTask, priority: TaskPriority) => void;
  onQuickStatus: (task: FlattenedOperationalTask, status: TaskStatus) => void;
  onSelect: (taskId: string) => void;
  selectedTaskId: string | null;
  tasks: FlattenedOperationalTask[];
}) {
  if (tasks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="app-panel overflow-hidden rounded-[var(--app-card-radius)] border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-[hsl(var(--muted)/0.56)] text-left">
            <tr className="border-b border-[rgba(var(--app-primary-rgb),0.08)]">
              {["Task", "Campaign", "Team", "Assignee", "Status", "Priority", "Due", "Actions"].map((label) => (
                <th key={label} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              const overdue = isTaskOverdue(task);
              return (
                <tr
                  key={task.id}
                  onClick={() => onSelect(task.id)}
                  className={`cursor-pointer border-b border-[rgba(var(--app-primary-rgb),0.05)] transition-colors hover:bg-[hsl(var(--muted)/0.35)] ${
                    isSelected ? "bg-[rgba(var(--app-primary-rgb),0.05)]" : ""
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="max-w-[260px]">
                      <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">{task.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{task.description || "No description"}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="max-w-[180px] text-sm font-semibold text-zinc-700 dark:text-zinc-300">{task.campaign}</div>
                    <div className="text-[11px] text-zinc-400">{task.campaignPhase}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-600 dark:text-zinc-300">{task.teamName}</td>
                  <td className="px-4 py-3.5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--muted)/0.7)] px-2.5 py-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--card))] text-[10px] font-black text-zinc-500">
                        {getAssigneeLabel(task, task.teamName).charAt(0).toUpperCase()}
                      </div>
                      <span className="max-w-[120px] truncate text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {getAssigneeLabel(task, task.teamName)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={task.status}
                      onChange={(event) => onQuickStatus(task, event.target.value as TaskStatus)}
                      onClick={(event) => event.stopPropagation()}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[task.status]?.pill ?? STATUS_STYLES.Pending.pill}`}
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={task.priority}
                      onChange={(event) => onQuickPriority(task, event.target.value as TaskPriority)}
                      onClick={(event) => event.stopPropagation()}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.Low}`}
                    >
                      {TASK_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className={`text-sm font-bold ${overdue ? "text-rose-600 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {formatDateLabel(task.dueDate)}
                    </div>
                    <div className="text-[11px] text-zinc-400">{getTaskAgeLabel(task)}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(task);
                        }}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-[hsl(var(--muted))] hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(task);
                        }}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BoardColumn({
  onSelect,
  selectedTaskId,
  status,
  tasks,
}: {
  onSelect: (taskId: string) => void;
  selectedTaskId: string | null;
  status: string;
  tasks: FlattenedOperationalTask[];
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Pending;

  return (
    <div className={`app-panel flex min-h-[360px] flex-col rounded-[1.5rem] border p-3 ${style.panel}`}>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{status}</h3>
        </div>
        <span className="rounded-full bg-[hsl(var(--muted)/0.8)] px-2 py-1 text-[10px] font-black text-zinc-500">{tasks.length}</span>
      </div>

      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onSelect(task.id)}
              className={`w-full rounded-[1.2rem] border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                selectedTaskId === task.id
                  ? "border-[rgba(var(--app-primary-rgb),0.4)] bg-[rgba(var(--app-primary-rgb),0.05)]"
                  : "border-[rgba(var(--app-primary-rgb),0.07)] bg-[hsl(var(--card)/0.82)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">{task.title}</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{task.campaign}</div>
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>{task.teamName}</span>
                <span>{formatDateLabel(task.dueDate)}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-[rgba(var(--app-primary-rgb),0.08)] px-4 py-8 text-center text-xs font-semibold text-zinc-400">
            No tasks here
          </div>
        )}
      </div>
    </div>
  );
}

function TaskFocusPanel({
  onDelete,
  onEdit,
  onQuickPriority,
  onQuickStatus,
  task,
}: {
  onDelete: (task: FlattenedOperationalTask) => void;
  onEdit: (task: FlattenedOperationalTask) => void;
  onQuickPriority: (task: FlattenedOperationalTask, priority: TaskPriority) => void;
  onQuickStatus: (task: FlattenedOperationalTask, status: TaskStatus) => void;
  task: FlattenedOperationalTask | null;
}) {
  return (
    <aside className="app-panel h-fit rounded-[var(--app-card-radius)] border p-5">
      {task ? (
        <>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[task.status]?.dot ?? STATUS_STYLES.Pending.dot}`} />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{task.status}</span>
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{task.title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{task.description || "No description provided."}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MiniMeta label="Campaign" value={task.campaign} />
            <MiniMeta label="Team" value={task.teamName} />
            <MiniMeta label="Assignee" value={getAssigneeLabel(task, task.teamName)} />
            <MiniMeta label="Due" value={formatDateLabel(task.dueDate)} />
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--muted)/0.45)] p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Quick Actions</div>
            <div className="mt-3 grid gap-2">
              <label className="text-xs font-bold text-zinc-500">
                Status
                <select
                  value={task.status}
                  onChange={(event) => onQuickStatus(task, event.target.value as TaskStatus)}
                  className="mt-1 w-full rounded-xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.88)] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-zinc-500">
                Priority
                <select
                  value={task.priority}
                  onChange={(event) => onQuickPriority(task, event.target.value as TaskPriority)}
                  className="mt-1 w-full rounded-xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.88)] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => onEdit(task)} className="app-accent-button rounded-xl px-4 py-2 text-sm font-black">
              <Pencil className="mr-1.5 inline h-4 w-4" />
              Edit Task
            </button>
            <button
              onClick={() => onDelete(task)}
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-black text-rose-600 dark:text-rose-400"
            >
              <Trash2 className="mr-1.5 inline h-4 w-4" />
              Delete
            </button>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-[rgba(var(--app-primary-rgb),0.08)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Notes & Execution</div>
              <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />
            </div>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <PanelSection label="Criteria" value={task.criteria || task.campaignCriteria || "No criteria captured."} />
              <PanelSection label="Methodology" value={task.methodology || task.campaignMethodology || "No methodology captured."} />
              <PanelSection label="Notes" value={task.notes || "No notes added yet."} />
            </div>
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </aside>
  );
}

function PanelSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-1 whitespace-pre-wrap leading-6">{value}</div>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--muted)/0.45)] px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low}`}>
      {priority}
    </span>
  );
}

function CompactFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-input w-full rounded-xl px-3 py-2 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[rgba(var(--app-primary-rgb),0.12)] px-6 py-12 text-center">
      <Users className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
      <div className="mt-3 text-lg font-black text-zinc-900 dark:text-zinc-100">No tasks match the current view</div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Adjust your filters, change the view, or create a new task to start moving work forward.
      </p>
      <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        <ChevronRight className="h-3.5 w-3.5" />
        Refine filters or add work
      </div>
    </div>
  );
}
