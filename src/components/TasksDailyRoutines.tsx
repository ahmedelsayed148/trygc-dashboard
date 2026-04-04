import React, { useContext, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { AlarmClockCheck, ArrowDown, ArrowUp, CheckCircle2, CircleAlert, ClipboardList, Pencil, Plus, RotateCcw, Save, Search, Sparkles, Trash2, X } from "lucide-react";
import { AppContext } from "./Root";
import { DateRangeFilter } from "./DateRangeFilter";
import { emptyDateRange, filterByDateRange } from "../lib/dateFilters";
import { OPERATIONS_TEAMS, TASK_PRIORITIES, TASK_STATUSES, normalizeOpsCampaigns, type AssignmentMode, type TaskPriority, type TaskStatus } from "../lib/operations";

export type PMOTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  teamId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignmentMode: AssignmentMode;
  assignedToName: string;
  assignedToEmail: string;
  notes: string;
  linkedCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskFormValues = {
  title: string;
  description: string;
  category: string;
  teamId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignmentMode: AssignmentMode;
  assigneeEmail: string;
  notes: string;
  linkedCampaignId: string;
};

type RoutineItem = { id: string; title: string; description: string; completed: boolean };

const PMO_CATEGORIES = ["Planning", "Briefing", "Execution", "Monitoring & Control", "Reporting", "Review", "Risk & Issues", "Stakeholder", "Admin", "Other"] as const;
const DEFAULT_ROUTINES = [
  { id: "ops-priority-scan", title: "Priority scan", description: "Review blocked, overdue, and critical work first." },
  { id: "campaign-followups", title: "Campaign follow-ups", description: "Close confirmations, approvals, and owner replies." },
  { id: "quality-check", title: "Quality check", description: "Audit risky live work before it becomes rework." },
  { id: "handover-readiness", title: "Handover readiness", description: "Prepare the next shift with clear blockers and next steps." },
] as const;

const STATUS_STYLES: Record<TaskStatus, string> = {
  Pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  Medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const getRoutinesKey = (email: string) => `trygc-daily-routines:${email || "workspace"}`;
const createDefaultRoutines = (): RoutineItem[] => DEFAULT_ROUTINES.map((item) => ({ ...item, completed: false }));

function normalizeRoutines(raw: unknown): RoutineItem[] {
  if (!Array.isArray(raw)) return createDefaultRoutines();
  return raw.map((item) => ({
    id: typeof item?.id === "string" && item.id ? item.id : uid("routine"),
    title: typeof item?.title === "string" ? item.title : "New routine",
    description: typeof item?.description === "string" ? item.description : "",
    completed: Boolean(item?.completed),
  }));
}

function moveItem<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const nextIndex = index + direction;
  if (index === -1 || nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function blankTask(overrides?: Partial<PMOTask>): PMOTask {
  const now = new Date().toISOString();
  return { id: uid("pmo"), title: "", description: "", category: "Execution", teamId: OPERATIONS_TEAMS[0].id, status: "Pending", priority: "Medium", dueDate: "", assignmentMode: "unassigned", assignedToName: "", assignedToEmail: "", notes: "", linkedCampaignId: null, createdAt: now, updatedAt: now, ...overrides };
}

const todayKey = () => new Date().toISOString().slice(0, 10);
const isDueToday = (task: PMOTask) => Boolean(task.dueDate) && task.dueDate.slice(0, 10) === todayKey();
const isOverdue = (task: PMOTask) => Boolean(task.dueDate) && task.dueDate < todayKey() && task.status !== "Done";
const taskScore = (task: PMOTask) => (task.status === "Blocked" ? 100 : 0) + (task.priority === "Critical" ? 60 : task.priority === "High" ? 35 : 0) + (isOverdue(task) ? 50 : 0) + (isDueToday(task) ? 30 : 0) + (task.status === "In Progress" ? 15 : 0) - (task.status === "Done" ? 100 : 0);
const assigneeLabel = (task: PMOTask, teamName: string) => task.assignmentMode === "person" ? task.assignedToName || task.assignedToEmail || "Unassigned" : task.assignmentMode === "team" ? teamName : "Unassigned";

export function TasksDailyRoutines() {
  const ctx = useContext(AppContext);
  const rawOpsCampaigns = ctx?.opsCampaigns;
  const rawTeamMembers = ctx?.teamMembers;
  const rawPmoTasks = ctx?.standaloneTasks;
  const rawDisabledTeams = ctx?.disabledTeams;
  const opsCampaigns = useMemo(() => normalizeOpsCampaigns(rawOpsCampaigns || []), [rawOpsCampaigns]);
  const teamMembers: Array<{ email: string; name: string; teamName?: string }> = rawTeamMembers ?? [];
  const pmoTasks = useMemo(() => (rawPmoTasks ?? []) as PMOTask[], [rawPmoTasks]);
  const setPmoTasks = ctx?.setStandaloneTasks || (() => {});
  const userEmail = ctx?.userEmail || "";
  const disabledTeams = useMemo(() => (rawDisabledTeams ?? []) as string[], [rawDisabledTeams]);
  const enabledTeams = useMemo(() => OPERATIONS_TEAMS.filter((team) => !disabledTeams.includes(team.id)), [disabledTeams]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [editingTask, setEditingTask] = useState<PMOTask | null | "new">(null);
  const [routines, setRoutines] = useState<RoutineItem[]>(createDefaultRoutines);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(getRoutinesKey(userEmail));
      setRoutines(raw ? normalizeRoutines(JSON.parse(raw)) : createDefaultRoutines());
    } catch {
      setRoutines(createDefaultRoutines());
    }
  }, [userEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getRoutinesKey(userEmail), JSON.stringify(routines));
  }, [routines, userEmail]);

  const filteredTasks = useMemo(() => {
    const matched = pmoTasks.filter((task) => {
      if (deferredSearch && ![task.title, task.description, task.category, task.assignedToName, task.assignedToEmail, task.notes].join(" ").toLowerCase().includes(deferredSearch)) return false;
      if (disabledTeams.includes(task.teamId)) return false;
      if (categoryFilter !== "All" && task.category !== categoryFilter) return false;
      if (teamFilter !== "All" && task.teamId !== teamFilter) return false;
      if (statusFilter !== "All" && task.status !== statusFilter) return false;
      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;
      if (campaignFilter !== "All") {
        if (campaignFilter === "__none__" && task.linkedCampaignId) return false;
        if (campaignFilter !== "__none__" && task.linkedCampaignId !== campaignFilter) return false;
      }
      return true;
    });

    return [...filterByDateRange(matched, dateRange, (task) => task.dueDate || task.updatedAt || task.createdAt)].sort((a, b) => taskScore(b) - taskScore(a));
  }, [campaignFilter, categoryFilter, dateRange, deferredSearch, disabledTeams, pmoTasks, priorityFilter, statusFilter, teamFilter]);

  const summary = useMemo(() => {
    const done = filteredTasks.filter((task) => task.status === "Done").length;
    const blocked = filteredTasks.filter((task) => task.status === "Blocked").length;
    const inProgress = filteredTasks.filter((task) => task.status === "In Progress").length;
    const dueToday = filteredTasks.filter((task) => isDueToday(task) && task.status !== "Done").length;
    const overdue = filteredTasks.filter((task) => isOverdue(task)).length;
    const critical = filteredTasks.filter((task) => task.priority === "Critical" && task.status !== "Done").length;
    return { total: filteredTasks.length, done, blocked, inProgress, dueToday, overdue, critical, completionRate: filteredTasks.length ? Math.round((done / filteredTasks.length) * 100) : 0 };
  }, [filteredTasks]);

  const focusBuckets = useMemo(() => ([
    { label: "Blocked now", helper: "Needs escalation or dependency clearance.", tasks: filteredTasks.filter((task) => task.status === "Blocked").slice(0, 4), count: filteredTasks.filter((task) => task.status === "Blocked").length, accent: "border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20" },
    { label: "Overdue", helper: "Past target date and still open.", tasks: filteredTasks.filter((task) => isOverdue(task)).slice(0, 4), count: filteredTasks.filter((task) => isOverdue(task)).length, accent: "border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20" },
    { label: "Due today", helper: "Should close before shift ends.", tasks: filteredTasks.filter((task) => isDueToday(task) && task.status !== "Done").slice(0, 4), count: filteredTasks.filter((task) => isDueToday(task) && task.status !== "Done").length, accent: "border-sky-200 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/20" },
    { label: "Critical priority", helper: "High-impact work still open.", tasks: filteredTasks.filter((task) => task.priority === "Critical" && task.status !== "Done").slice(0, 4), count: filteredTasks.filter((task) => task.priority === "Critical" && task.status !== "Done").length, accent: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70" },
  ]), [filteredTasks]);

  const board = useMemo(() => {
    const focus = filteredTasks.filter((task) => task.status !== "Done" && (task.status === "Blocked" || task.priority === "Critical" || isOverdue(task))).slice(0, 8);
    const focusIds = new Set(focus.map((task) => task.id));
    const execution = filteredTasks.filter((task) => !focusIds.has(task.id) && task.status !== "Done").slice(0, 10);
    const done = filteredTasks.filter((task) => task.status === "Done").slice(0, 8);
    return [
      { title: "Focus queue", helper: "Start here before lower-risk work.", tasks: focus },
      { title: "Execution lane", helper: "Live work that needs follow-through.", tasks: execution },
      { title: "Recently closed", helper: "Useful for updates and handover.", tasks: done },
    ];
  }, [filteredTasks]);

  const routinesDone = routines.filter((routine) => routine.completed).length;
  const routinesPercent = routines.length ? Math.round((routinesDone / routines.length) * 100) : 0;
  const recommendations = useMemo(() => {
    const next: string[] = [];
    if (summary.blocked > 0) next.push(`Resolve or escalate ${summary.blocked} blocked item${summary.blocked === 1 ? "" : "s"} first.`);
    if (summary.overdue > 0) next.push(`Replan ${summary.overdue} overdue task${summary.overdue === 1 ? "" : "s"} with owners and due dates.`);
    if (summary.dueToday > 0) next.push(`Close today's ${summary.dueToday} due item${summary.dueToday === 1 ? "" : "s"} or document the next action.`);
    if (routinesPercent < 50) next.push("Finish the routine checklist early so the handover is easier later.");
    if (next.length === 0) next.push("Workspace is healthy. Keep the execution lane moving and capture risks as they appear.");
    return next.slice(0, 4);
  }, [routinesPercent, summary.blocked, summary.dueToday, summary.overdue]);

  const saveTask = (task: PMOTask) => {
    const nextTask = { ...task, updatedAt: new Date().toISOString() };
    const exists = pmoTasks.some((item) => item.id === nextTask.id);
    if (exists) {
      setPmoTasks((current: PMOTask[]) => current.map((item) => (item.id === nextTask.id ? nextTask : item)));
      toast.success("Task updated");
    } else {
      setPmoTasks((current: PMOTask[]) => [nextTask, ...current]);
      toast.success("Task created");
    }
    setEditingTask(null);
  };

  const updateField = <K extends keyof PMOTask>(id: string, field: K, value: PMOTask[K]) => {
    setPmoTasks((current: PMOTask[]) => current.map((task) => (task.id === id ? { ...task, [field]: value, updatedAt: new Date().toISOString() } : task)));
  };

  const deleteTask = (id: string) => {
    setPmoTasks((current: PMOTask[]) => current.filter((task) => task.id !== id));
    toast.success("Task removed");
  };

  return (
    <div className="space-y-6">
      <section className="app-hero-panel rounded-[var(--app-card-radius)] border p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="app-hero-kicker text-[11px] font-black uppercase tracking-[0.24em]">PMO Operations Hub</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-zinc-100">Tasks and routines built for action, not just storage</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">The workflow now puts urgency, ownership, and handover-readiness at the center so the team can act faster with less digging.</p>
          </div>
          <div className="flex flex-wrap gap-2 xl:max-w-md xl:justify-end">
            <button onClick={() => setEditingTask("new")} className="rounded-2xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--app-primary, #18181b)" }}><Plus className="mr-2 inline h-4 w-4" />Add task</button>
            <button onClick={() => setRoutines((current) => [...current, { id: uid("routine"), title: "New routine", description: "", completed: false }])} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"><Plus className="mr-2 inline h-4 w-4" />Add routine</button>
            <button onClick={() => { setRoutines(createDefaultRoutines()); toast.success("Routines restored"); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"><RotateCcw className="mr-2 inline h-4 w-4" />Reset routine pack</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Visible tasks" value={summary.total} helper={`${summary.completionRate}% completed`} icon={ClipboardList} />
          <MetricCard label="Blocked" value={summary.blocked} helper="Needs escalation or dependency clearance" icon={CircleAlert} />
          <MetricCard label="Overdue" value={summary.overdue} helper="Past expected completion date" icon={AlarmClockCheck} />
          <MetricCard label="Critical" value={summary.critical} helper="High-impact work still open" icon={Sparkles} />
          <MetricCard label="Routine progress" value={routinesPercent} helper={`${routinesDone}/${routines.length} complete`} icon={CheckCircle2} suffix="%" />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {focusBuckets.map((bucket) => (
            <div key={bucket.label} className={`rounded-[1.75rem] border p-5 ${bucket.accent}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{bucket.label}</div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{bucket.helper}</div>
                </div>
                <div className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-zinc-900 shadow-sm dark:bg-zinc-900/80 dark:text-zinc-100">{bucket.count}</div>
              </div>
              <div className="mt-4 space-y-2">
                {bucket.tasks.length ? bucket.tasks.map((task) => (
                  <button key={task.id} onClick={() => setEditingTask(task)} className="block w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-left transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:bg-zinc-950">
                    <div className="text-sm font-bold text-zinc-950 dark:text-zinc-100">{task.title}</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{task.priority} priority{task.dueDate ? ` . due ${task.dueDate}` : ""}</div>
                  </button>
                )) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/50 px-4 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">Nothing urgent in this group right now.</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800"><Sparkles className="h-4 w-4 text-zinc-700 dark:text-zinc-200" /></div>
            <div>
              <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Suggested next actions</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Based on urgency, due dates, and routine completion.</div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {recommendations.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Task criteria and filters</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Search by title, notes, owner, or context, then narrow by team, due date, and campaign.</div>
          </div>
          <button onClick={() => { setSearch(""); setCategoryFilter("All"); setTeamFilter("All"); setStatusFilter("All"); setPriorityFilter("All"); setCampaignFilter("All"); }} className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">Clear filters</button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Search</div>
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, notes, or assignees" className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100" />
            </div>
          </label>
          <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={[["All", "All"], ...PMO_CATEGORIES.map((item) => [item, item])]} />
          <FilterSelect label="Team" value={teamFilter} onChange={setTeamFilter} options={[["All", "All"], ...enabledTeams.map((team) => [team.id, team.name])]} />
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[["All", "All"], ...TASK_STATUSES.map((item) => [item, item])]} />
          <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={[["All", "All"], ...TASK_PRIORITIES.map((item) => [item, item])]} />
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr,1.2fr]">
          <FilterSelect label="Campaign" value={campaignFilter} onChange={setCampaignFilter} options={[["All", "Any / none"], ["__none__", "No campaign"], ...opsCampaigns.map((campaign) => [campaign.id, campaign.name])]} />
          <DateRangeFilter label="Task date range" value={dateRange} onChange={setDateRange} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="grid gap-4 xl:grid-cols-3">
          {board.map((column) => (
            <section key={column.title} className="app-panel rounded-[var(--app-card-radius)] border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">{column.title}</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{column.helper}</div>
                </div>
                <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{column.tasks.length}</div>
              </div>
              <div className="mt-4 space-y-3">
                {column.tasks.length ? column.tasks.map((task) => {
                  const team = OPERATIONS_TEAMS.find((candidate) => candidate.id === task.teamId);
                  const teamName = team?.name || task.teamId;
                  const linkedCampaign = opsCampaigns.find((campaign) => campaign.id === task.linkedCampaignId);
                  return (
                    <div key={task.id} className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black leading-snug text-zinc-950 dark:text-zinc-100">{task.title}</div>
                          {task.description ? <div className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{task.description}</div> : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingTask(task)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteTask(task.id)} className="rounded-xl p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${STATUS_STYLES[task.status]}`}>{task.status}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">{teamName}</span>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <div>Owner: {assigneeLabel(task, teamName)}</div>
                        {task.dueDate ? <div>Due: {task.dueDate}{isOverdue(task) ? " . overdue" : isDueToday(task) ? " . today" : ""}</div> : null}
                        {linkedCampaign ? <div>Campaign: {linkedCampaign.name}</div> : null}
                        {task.notes ? <div className="line-clamp-2">Notes: {task.notes}</div> : null}
                      </div>
                      <div className="mt-4">
                        <select value={task.status} onChange={(event) => updateField(task.id, "status", event.target.value as TaskStatus)} className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                          {TASK_STATUSES.map((status) => <option key={status} value={status}>Move to {status}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                }) : <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No tasks in this lane.</div>}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-4">
          <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Daily routines</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Editable checklist for your shift rhythm and handover quality.</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-zinc-950 dark:text-zinc-100">{routinesPercent}%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">completion</div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <motion.div className="h-2 rounded-full bg-zinc-950 dark:bg-zinc-100" initial={{ width: 0 }} animate={{ width: `${routinesPercent}%` }} transition={{ duration: 0.35, ease: "easeOut" }} />
            </div>
            <div className="mt-4 space-y-3">
              {routines.map((routine, index) => (
                <div key={routine.id} className={`rounded-[1.5rem] border p-4 transition-colors ${routine.completed ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, completed: !item.completed } : item))} className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${routine.completed ? "border-white/30 bg-white/10 dark:border-black/20 dark:bg-black/10" : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"}`}>
                      {routine.completed ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </button>
                    <div className="min-w-0 flex-1 space-y-3">
                      <input value={routine.title} onChange={(event) => setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, title: event.target.value } : item))} className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-bold outline-none ${routine.completed ? "border-white/20 bg-white/10 text-white placeholder:text-white/40 dark:border-black/10 dark:bg-black/10 dark:text-zinc-900" : "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"}`} placeholder="Routine title" />
                      <textarea value={routine.description} onChange={(event) => setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, description: event.target.value } : item))} rows={3} className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none ${routine.completed ? "border-white/20 bg-white/10 text-white/80 placeholder:text-white/40 dark:border-black/10 dark:bg-black/10 dark:text-zinc-800" : "border-zinc-200 bg-white text-zinc-700 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"}`} placeholder="Steps, criteria, or notes" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button disabled={index === 0} onClick={() => setRoutines((current) => moveItem(current, routine.id, -1))} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button disabled={index === routines.length - 1} onClick={() => setRoutines((current) => moveItem(current, routine.id, 1))} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setRoutines((current) => current.filter((item) => item.id !== routine.id))} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Why this layout works better</div>
            <div className="mt-3 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <p>Focus queue highlights blocked, overdue, due-today, and critical work first.</p>
              <p>Execution lane keeps live work visible without mixing it with completed items.</p>
              <p>Routine completion shows whether the shift is actually ready for a clean handover.</p>
            </div>
          </section>
        </div>
      </section>

      <PMOTaskModal isOpen={editingTask !== null} task={editingTask === "new" ? null : editingTask} campaigns={opsCampaigns.map((campaign) => ({ id: campaign.id, name: campaign.name }))} teamMembers={teamMembers} onClose={() => setEditingTask(null)} onSave={saveTask} />
    </div>
  );
}

function MetricCard({ helper, icon: Icon, label, suffix, value }: { helper: string; icon: React.ElementType; label: string; suffix?: string; value: number }) {
  return (
    <div className="app-panel rounded-[1.5rem] border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
        <div className="rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800"><Icon className="h-4 w-4 text-zinc-700 dark:text-zinc-200" /></div>
      </div>
      <div className="mt-3 text-3xl font-black text-zinc-950 dark:text-zinc-100">{value}{suffix ? <span className="text-base text-zinc-400">{suffix}</span> : null}</div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{helper}</div>
    </div>
  );
}

function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[][]; value: string }) {
  return (
    <label>
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function PMOTaskModal({
  campaigns,
  isOpen,
  onClose,
  onSave,
  task,
  teamMembers,
}: {
  campaigns: Array<{ id: string; name: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: PMOTask) => void;
  task: PMOTask | null;
  teamMembers: Array<{ email: string; name: string; teamName?: string }>;
}) {
  const modalCtx = useContext(AppContext);
  const modalDisabledTeams = modalCtx?.disabledTeams;
  const modalEnabledTeams = useMemo(() => OPERATIONS_TEAMS.filter((team) => !(modalDisabledTeams ?? []).includes(team.id)), [modalDisabledTeams]);
  const defaults = useMemo<TaskFormValues>(() => ({
    title: task?.title || "",
    description: task?.description || "",
    category: task?.category || "Execution",
    teamId: task?.teamId || modalEnabledTeams[0]?.id || OPERATIONS_TEAMS[0].id,
    status: task?.status || "Pending",
    priority: task?.priority || "Medium",
    dueDate: task?.dueDate || "",
    assignmentMode: task?.assignmentMode || "unassigned",
    assigneeEmail: task?.assignedToEmail || "",
    notes: task?.notes || "",
    linkedCampaignId: task?.linkedCampaignId || "",
  }), [modalEnabledTeams, task]);
  const { formState: { errors }, handleSubmit, register, reset, watch } = useForm<TaskFormValues>({ values: defaults });

  useEffect(() => {
    if (isOpen) reset(defaults);
  }, [defaults, isOpen, reset]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  const assignmentMode = watch("assignmentMode");
  const selectedTeamId = watch("teamId");
  const fieldClassName = "mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  const submit = handleSubmit((values) => {
    const assignee = teamMembers.find((member) => member.email === values.assigneeEmail);
    onSave(blankTask({
      id: task?.id,
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      teamId: values.teamId,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate,
      assignmentMode: values.assignmentMode,
      assignedToName: values.assignmentMode === "person" ? assignee?.name || "" : "",
      assignedToEmail: values.assignmentMode === "person" ? values.assigneeEmail : "",
      notes: values.notes.trim(),
      linkedCampaignId: values.linkedCampaignId || null,
      createdAt: task?.createdAt,
    }));
  });

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }} transition={{ type: "spring", damping: 28, stiffness: 320 }} className="mx-auto my-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-[var(--app-card-radius)] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <div>
                <div className="text-xl font-black text-zinc-950 dark:text-zinc-100">{task ? "Edit PMO task" : "Add PMO task"}</div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Capture ownership, due date, and handover-ready notes in one place.</div>
              </div>
              <button onClick={onClose} className="rounded-2xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submit} className="flex flex-1 flex-col">
              <div className="space-y-5 overflow-y-auto p-6">
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Task title <span className="text-red-500">*</span>
                  <input {...register("title", { required: "Title is required" })} className={fieldClassName} placeholder="What needs to be delivered?" autoFocus />
                  {errors.title ? <div className="mt-1.5 text-xs font-semibold text-red-500">{errors.title.message}</div> : null}
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Category<select {...register("category")} className={fieldClassName}>{PMO_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Team<select {...register("teamId")} className={fieldClassName}>{modalEnabledTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                </div>
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Description<textarea {...register("description")} rows={4} className={fieldClassName} placeholder="Context, scope, expected output, or constraints" /></label>
                <div className="grid gap-5 sm:grid-cols-3">
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Status<select {...register("status")} className={fieldClassName}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Priority<select {...register("priority")} className={fieldClassName}>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Due date<input type="date" {...register("dueDate")} className={fieldClassName} /></label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Assignment<select {...register("assignmentMode")} className={fieldClassName}><option value="unassigned">Unassigned</option><option value="team">Assign to team</option><option value="person">Assign to person</option></select></label>
                  {assignmentMode === "person" ? (
                    <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Person<select {...register("assigneeEmail")} className={fieldClassName}><option value="">Select team member</option>{teamMembers.map((member) => <option key={member.email} value={member.email}>{member.name}{member.teamName ? ` - ${member.teamName}` : ""}</option>)}</select></label>
                  ) : (
                    <div className="flex items-end"><div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{assignmentMode === "team" ? `Assigned to ${OPERATIONS_TEAMS.find((team) => team.id === selectedTeamId)?.name || "selected team"}` : "This task is currently unassigned."}</div></div>
                  )}
                </div>
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Notes / blocker context<textarea {...register("notes")} rows={3} className={fieldClassName} placeholder="Dependencies, risks, or the next thing the owner should know" /></label>
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">Campaign link<select {...register("linkedCampaignId")} className={fieldClassName}><option value="">No campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <div className="text-[11px] text-zinc-400">Strong tasks are specific, owned, and handover-friendly.</div>
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="rounded-2xl bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Cancel</button>
                  <button type="submit" className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--app-primary, #18181b)" }}><Save className="mr-2 inline h-4 w-4" />{task ? "Update task" : "Create task"}</button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
