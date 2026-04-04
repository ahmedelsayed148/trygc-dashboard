import React, { useContext, useEffect, useMemo, useState } from 'react';

import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Radio,
  RefreshCw,
  Users,
} from 'lucide-react';

import { AppContext } from './Root';
import { useActiveUsers } from '@/hooks/use-active-users';
import { cn } from '@/lib/utils';

type LiveOpsTask = {
  assigneeEmail: string;
  assigneeKey: string;
  assigneeLabel: string;
  campaign: string;
  description: string;
  id: string;
  priority: string;
  sourceLabel: string;
  status: string;
  updatedAt: string;
};

type AssigneeGroup = {
  blocked: number;
  count: number;
  done: number;
  email: string;
  inProgress: number;
  isOnline: boolean;
  key: string;
  label: string;
  tasks: LiveOpsTask[];
};

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTaskTone(status: string) {
  if (status === 'Done') return 'done';
  if (status === 'Blocked') return 'blocked';
  if (status === 'In Progress') return 'progress';
  return 'pending';
}

export function LiveOpsPanel() {
  const ctx = useContext(AppContext);
  const operationalTasks = useMemo(
    () => (ctx?.operationalTasks ?? []) as Array<Record<string, unknown>>,
    [ctx?.operationalTasks],
  );
  const isLoading = ctx?.isLoading || false;
  const refreshWorkspaceData = ctx?.refreshWorkspaceData;
  const userEmail = ctx?.userEmail || '';
  const userName = ctx?.userName || '';
  const { activeUsers, connected } = useActiveUsers({ userEmail, userName });

  const liveUsersByEmail = useMemo(
    () => new Set(activeUsers.map((user) => user.email.toLowerCase())),
    [activeUsers],
  );

  const liveOpsTasks = useMemo<LiveOpsTask[]>(() => {
    const normalizedTasks: LiveOpsTask[] = [];

    for (const task of operationalTasks) {
      const assigneeEmail = String(task.assignedToEmail || task.assignedTo || '')
        .trim()
        .toLowerCase();
      const assigneeLabel = String(
        task.assignedToName || task.assignedTo || task.assignedToEmail || '',
      ).trim();

      if (!assigneeLabel) continue;

      normalizedTasks.push({
        assigneeEmail,
        assigneeKey: assigneeEmail || assigneeLabel.toLowerCase(),
        assigneeLabel,
        campaign: String(task.campaign || task.title || 'Untitled task'),
        description: String(task.description || task.title || 'No description available.'),
        id: String(task.id || `${assigneeLabel}-${normalizedTasks.length}`),
        priority: String(task.priority || 'Medium'),
        sourceLabel: String(task.category || task.teamId || 'Operations'),
        status: String(task.status || 'Pending'),
        updatedAt: String(task.updatedAt || task.endDateTime || task.startDateTime || ''),
      });
    }

    return normalizedTasks.sort(
      (left, right) =>
        new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime(),
    );
  }, [operationalTasks]);

  const groups = useMemo<AssigneeGroup[]>(() => {
    const grouped = new Map<string, AssigneeGroup>();

    for (const task of liveOpsTasks) {
      const existing = grouped.get(task.assigneeKey) || {
        blocked: 0,
        count: 0,
        done: 0,
        email: task.assigneeEmail,
        inProgress: 0,
        isOnline: task.assigneeEmail ? liveUsersByEmail.has(task.assigneeEmail) : false,
        key: task.assigneeKey,
        label: task.assigneeLabel,
        tasks: [],
      };

      existing.count += 1;
      existing.tasks.push(task);
      existing.isOnline = existing.isOnline || (task.assigneeEmail ? liveUsersByEmail.has(task.assigneeEmail) : false);

      if (task.status === 'Done') existing.done += 1;
      if (task.status === 'Blocked') existing.blocked += 1;
      if (task.status === 'In Progress') existing.inProgress += 1;

      grouped.set(task.assigneeKey, existing);
    }

    return Array.from(grouped.values()).sort((left, right) => {
      if (left.isOnline !== right.isOnline) {
        return left.isOnline ? -1 : 1;
      }

      if (left.blocked !== right.blocked) {
        return right.blocked - left.blocked;
      }

      return right.count - left.count;
    });
  }, [liveOpsTasks, liveUsersByEmail]);

  const [selectedAssignee, setSelectedAssignee] = useState('');

  useEffect(() => {
    if (!groups.length) {
      setSelectedAssignee('');
      return;
    }

    if (!groups.some((group) => group.key === selectedAssignee)) {
      setSelectedAssignee(groups[0].key);
    }
  }, [groups, selectedAssignee]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedAssignee) || null,
    [groups, selectedAssignee],
  );

  const overallStats = useMemo(
    () => ({
      assigned: liveOpsTasks.length,
      blocked: liveOpsTasks.filter((task) => task.status === 'Blocked').length,
      done: liveOpsTasks.filter((task) => task.status === 'Done').length,
      inProgress: liveOpsTasks.filter((task) => task.status === 'In Progress').length,
    }),
    [liveOpsTasks],
  );

  return (
    <div className="space-y-5">
      <section className="app-hero-panel rounded-[var(--app-card-radius)] border p-6 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="app-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
              <Radio className="h-3.5 w-3.5" />
              Live Ops
            </div>
            <h1 className="app-hero-title mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Real-time operations surface
            </h1>
            <p className="app-hero-copy mt-2 max-w-2xl text-sm leading-6 md:text-base">
              Monitor active users and person-owned work from campaigns and community operations in one focused view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.72)] px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Viewer
              </div>
              <div className="mt-1 text-sm font-black text-zinc-900 dark:text-zinc-100">
                {userName || userEmail}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{userEmail}</div>
            </div>

            <button
              onClick={() => void refreshWorkspaceData?.()}
              className="rounded-2xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.72)] px-4 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-[hsl(var(--muted)/0.82)] dark:text-zinc-200"
            >
              <RefreshCw className={cn('mr-2 inline h-4 w-4', isLoading && 'animate-spin')} />
              Refresh data
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active now"
            value={activeUsers.length}
            copy={
              connected
                ? 'Users currently publishing live presence.'
                : 'Presence channel is reconnecting.'
            }
          />
          <MetricCard
            label="Assigned tasks"
            value={overallStats.assigned}
            copy="All tasks currently assigned to named people."
          />
          <MetricCard
            label="In progress"
            value={overallStats.inProgress}
            copy="Tasks that are actively moving right now."
          />
          <MetricCard
            label="Blocked"
            value={overallStats.blocked}
            copy="Tasks waiting for action or intervention."
            danger={overallStats.blocked > 0}
          />
        </div>
      </section>

      <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Live users
            </div>
            <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">
              Presence strip
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.72)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-zinc-400')} />
            {connected ? 'Live' : 'Connecting'}
          </div>
        </div>

        {activeUsers.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeUsers.map((user) => (
              <div
                key={user.email}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.78)] px-3 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {user.name || user.email}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-[rgba(var(--app-primary-rgb),0.08)] px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No active users detected yet.
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="app-panel rounded-[var(--app-card-radius)] border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                People
              </div>
              <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">
                Assignment rail
              </h2>
            </div>
            <div className="rounded-full bg-[hsl(var(--muted)/0.8)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              {groups.length} owners
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {groups.length > 0 ? (
              groups.map((group) => (
                <button
                  key={group.key}
                  onClick={() => setSelectedAssignee(group.key)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                    selectedAssignee === group.key
                      ? 'border-[rgba(var(--app-primary-rgb),0.32)] bg-[rgba(var(--app-primary-rgb),0.06)]'
                      : 'border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.78)] hover:bg-[hsl(var(--muted)/0.55)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            group.isOnline ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600',
                          )}
                        />
                        <div className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">
                          {group.label}
                        </div>
                      </div>
                      {group.email ? (
                        <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {group.email}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {group.count}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    <span>{group.inProgress} active</span>
                    <span>{group.blocked} blocked</span>
                    <span>{group.done} done</span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyPanel copy="No assigned people were found in the current workspace." icon={Users} />
            )}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
            {selectedGroup ? (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                      Selected assignee
                    </div>
                    <h2 className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">
                      {selectedGroup.label}
                    </h2>
                    {selectedGroup.email ? (
                      <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {selectedGroup.email}
                      </div>
                    ) : null}
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.72)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    <span className={cn('h-2 w-2 rounded-full', selectedGroup.isOnline ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600')} />
                    {selectedGroup.isOnline ? 'Online now' : 'Offline'}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <StatusCard label="Total" value={selectedGroup.count} icon={Users} />
                  <StatusCard label="In progress" value={selectedGroup.inProgress} icon={Activity} />
                  <StatusCard label="Blocked" value={selectedGroup.blocked} icon={AlertCircle} danger={selectedGroup.blocked > 0} />
                  <StatusCard label="Done" value={selectedGroup.done} icon={CheckCircle2} />
                </div>
              </>
            ) : (
              <EmptyPanel copy="Choose a person from the assignment rail to inspect their live workload." icon={Users} />
            )}
          </section>

          <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Tasks
                </div>
                <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">
                  Assigned work
                </h2>
              </div>
              <div className="rounded-full bg-[hsl(var(--muted)/0.8)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                {selectedGroup ? selectedGroup.tasks.length : 0} tasks
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {selectedGroup?.tasks.length ? (
                selectedGroup.tasks.map((task) => {
                  const tone = getTaskTone(task.status);

                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.74)] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="text-base font-black text-zinc-900 dark:text-zinc-100">
                            {task.campaign}
                          </div>
                          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {task.sourceLabel}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                              tone === 'done' && 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
                              tone === 'blocked' && 'bg-red-500/12 text-red-700 dark:text-red-300',
                              tone === 'progress' && 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
                              tone === 'pending' && 'bg-zinc-900/8 text-zinc-600 dark:text-zinc-300',
                            )}
                          >
                            {task.status}
                          </span>
                          <span className="rounded-full bg-zinc-900/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-300">
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {task.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>Updated {formatDateLabel(task.updatedAt)}</span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          Live row
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyPanel copy="Select a person to inspect their assigned tasks." icon={Activity} />
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  copy,
  danger,
  label,
  value,
}: {
  copy: string;
  danger?: boolean;
  label: string;
  value: number;
}) {
  return (
    <article
      className={cn(
        'rounded-[1.4rem] border p-4',
        danger
          ? 'border-red-500/20 bg-red-500/6'
          : 'border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.74)]',
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{copy}</div>
    </article>
  );
}

function StatusCard({
  danger,
  icon: Icon,
  label,
  value,
}: {
  danger?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <article
      className={cn(
        'rounded-[1.4rem] border p-4',
        danger
          ? 'border-red-500/20 bg-red-500/6'
          : 'border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.74)]',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
          {label}
        </div>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <div className="mt-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">{value}</div>
    </article>
  );
}

function EmptyPanel({
  copy,
  icon: Icon,
}: {
  copy: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(var(--app-primary-rgb),0.08)] px-4 py-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{copy}</p>
    </div>
  );
}
