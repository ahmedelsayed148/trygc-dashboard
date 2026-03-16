"use client";

import React, { useContext, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Trash2,
  Users,
} from "lucide-react";
import { AppContext } from "./Root";
import { FeatureGate } from "./FeatureGate";
import {
  buildShiftHandoverBroadcast,
  createShiftHandoverRecord,
  normalizeShiftHandoverRecords,
  type ShiftHandoverHealth,
  type ShiftHandoverRecord,
} from "../lib/workspaceTools";
import { DateRangeFilter } from "./DateRangeFilter";
import { emptyDateRange, filterByDateRange } from "../lib/dateFilters";

const SHIFT_WINDOWS = ["Morning", "Evening", "Night", "Weekend", "General"] as const;

function getDefaultForm(preparedBy = "") {
  return {
    title: "",
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftWindow: "General",
    preparedBy,
    team: "Operations",
    coverage: "",
    health: "Stable" as ShiftHandoverHealth,
    summary: "",
    completedWork: "",
    pendingItems: "",
    blockers: "",
    escalations: "",
    nextShiftFocus: "",
    sharedContext: "",
  };
}

export function HandoverBoard() {
  return (
    <FeatureGate featureId="handover">
      <HandoverBoardContent />
    </FeatureGate>
  );
}

function HandoverBoardContent() {
  const ctx = useContext(AppContext);
  const savedHandovers = useMemo(
    () =>
      normalizeShiftHandoverRecords(ctx?.shiftHandovers || []).sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [ctx?.shiftHandovers],
  );
  const setShiftHandovers = ctx?.setShiftHandovers || (() => {});
  const preparedByDefault = ctx?.userName || ctx?.userEmail || "";

  const [form, setForm] = useState(() => getDefaultForm(preparedByDefault));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(emptyDateRange);

  const broadcastPreview = useMemo(() => buildShiftHandoverBroadcast(form), [form]);
  const filteredHandovers = useMemo(
    () => filterByDateRange(savedHandovers, dateRange, (item) => item.shiftDate || item.updatedAt || item.createdAt),
    [dateRange, savedHandovers],
  );

  const stats = useMemo(() => {
    const today = new Date().toDateString();

    return {
      total: filteredHandovers.length,
      critical: filteredHandovers.filter((item) => item.health === "Critical").length,
      watch: filteredHandovers.filter((item) => item.health === "Watch").length,
      today: filteredHandovers.filter(
        (item) => new Date(item.createdAt).toDateString() === today,
      ).length,
    };
  }, [filteredHandovers]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(getDefaultForm(preparedByDefault));
    setEditingId(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const now = new Date().toISOString();
    const record = createShiftHandoverRecord({
      ...form,
      id: editingId || undefined,
      preparedBy: form.preparedBy.trim() || preparedByDefault,
      broadcastSummary: broadcastPreview,
      updatedAt: now,
    });

    setShiftHandovers((current: ShiftHandoverRecord[]) => {
      const normalized = normalizeShiftHandoverRecords(current);

      if (editingId) {
        return normalized.map((item) => (item.id === editingId ? record : item));
      }

      return [record, ...normalized];
    });

    setStatusMessage(editingId ? "Handover updated." : "Handover saved.");
    resetForm();
  };

  const handleLoad = (id: string) => {
    const record = savedHandovers.find((item) => item.id === id);

    if (!record) {
      return;
    }

    setEditingId(record.id);
    setForm({
      title: record.title,
      shiftDate: record.shiftDate,
      shiftWindow: record.shiftWindow,
      preparedBy: record.preparedBy,
      team: record.team,
      coverage: record.coverage,
      health: record.health,
      summary: record.summary,
      completedWork: record.completedWork,
      pendingItems: record.pendingItems,
      blockers: record.blockers,
      escalations: record.escalations,
      nextShiftFocus: record.nextShiftFocus,
      sharedContext: record.sharedContext,
    });
    setStatusMessage(`Loaded ${record.title}.`);
  };

  const handleDelete = (id: string) => {
    setShiftHandovers((current: ShiftHandoverRecord[]) =>
      normalizeShiftHandoverRecords(current).filter((item) => item.id !== id),
    );

    if (editingId === id) {
      resetForm();
    }

    setStatusMessage("Handover removed.");
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value.trim() || !navigator?.clipboard) {
      setStatusMessage(`${label} is empty or clipboard access is unavailable.`);
      return;
    }

    await navigator.clipboard.writeText(value);
    setStatusMessage(`${label} copied.`);
  };

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-0 xl:grid-cols-[1fr,1fr]">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800 sm:p-6 xl:border-b-0 xl:border-r">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                Shift Handover
              </p>
              <h1 className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                Capture a detailed shift summary so the next shift starts fully updated
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-500">
                Add a structured handover with completed work, pending items, blockers, escalations,
                and focus areas. Every saved entry includes a share-ready summary for the next shift
                and the wider team.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <StatCard label="Handovers" value={stats.total} icon={ClipboardList} />
                <StatCard label="Critical" value={stats.critical} icon={AlertTriangle} />
                <StatCard label="Watch" value={stats.watch} icon={Users} />
                <StatCard label="Today" value={stats.today} icon={CalendarDays} />
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">
                      Share-Ready Preview
                    </p>
                    <h2 className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-100">
                      Broadcast this to the next shift
                    </h2>
                  </div>
                  <button
                    onClick={() => handleCopy(broadcastPreview, "Broadcast summary")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 sm:w-auto dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Summary
                  </button>
                </div>
                <div className="mt-4 rounded-[1.5rem] border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                  <div className="whitespace-pre-wrap">{broadcastPreview}</div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Handover Title">
                    <input
                      required
                      value={form.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      className={inputClassName}
                      placeholder="Community Night Shift Handover"
                    />
                  </Field>
                  <Field label="Shift Date">
                    <input
                      type="date"
                      required
                      value={form.shiftDate}
                      onChange={(event) => updateField("shiftDate", event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Shift Window">
                    <select
                      value={form.shiftWindow}
                      onChange={(event) => updateField("shiftWindow", event.target.value)}
                      className={inputClassName}
                    >
                      {SHIFT_WINDOWS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Team">
                    <input
                      value={form.team}
                      onChange={(event) => updateField("team", event.target.value)}
                      className={inputClassName}
                      placeholder="Operations"
                    />
                  </Field>
                  <Field label="Prepared By">
                    <input
                      value={form.preparedBy}
                      onChange={(event) => updateField("preparedBy", event.target.value)}
                      className={inputClassName}
                      placeholder="Ahmed"
                    />
                  </Field>
                  <Field label="Coverage / Hours">
                    <input
                      value={form.coverage}
                      onChange={(event) => updateField("coverage", event.target.value)}
                      className={inputClassName}
                      placeholder="6 PM to 2 AM"
                    />
                  </Field>
                </div>

                <Field label="Shift Health">
                  <div className="grid grid-cols-3 gap-2">
                    {(["Stable", "Watch", "Critical"] as ShiftHandoverHealth[]).map((health) => (
                      <button
                        key={health}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, health }))}
                        className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                          form.health === health
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {health}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Field label="Shift Summary">
                    <textarea
                      required
                      value={form.summary}
                      onChange={(event) => updateField("summary", event.target.value)}
                      className={textAreaClassName}
                      placeholder="Main overview of what happened this shift."
                    />
                  </Field>
                  <Field label="Completed Work">
                    <textarea
                      value={form.completedWork}
                      onChange={(event) => updateField("completedWork", event.target.value)}
                      className={textAreaClassName}
                      placeholder="Completed tasks, resolved issues, delivered items."
                    />
                  </Field>
                  <Field label="Pending Items For Next Shift">
                    <textarea
                      value={form.pendingItems}
                      onChange={(event) => updateField("pendingItems", event.target.value)}
                      className={textAreaClassName}
                      placeholder="Anything still in progress or waiting for follow-up."
                    />
                  </Field>
                  <Field label="Blockers / Risks">
                    <textarea
                      value={form.blockers}
                      onChange={(event) => updateField("blockers", event.target.value)}
                      className={textAreaClassName}
                      placeholder="Delays, blockers, risks, or items that need attention."
                    />
                  </Field>
                  <Field label="Escalations / Decisions Needed">
                    <textarea
                      value={form.escalations}
                      onChange={(event) => updateField("escalations", event.target.value)}
                      className={textAreaClassName}
                      placeholder="Approvals, leadership input, client replies, or decisions still pending."
                    />
                  </Field>
                  <Field label="Next Shift Focus">
                    <textarea
                      value={form.nextShiftFocus}
                      onChange={(event) => updateField("nextShiftFocus", event.target.value)}
                      className={textAreaClassName}
                      placeholder="The most important focus areas for the next shift."
                    />
                  </Field>
                </div>

                <Field label="Share With Team">
                  <textarea
                    value={form.sharedContext}
                    onChange={(event) => updateField("sharedContext", event.target.value)}
                    className={`${textAreaClassName} min-h-[140px]`}
                    placeholder="Anything the wider team should know: client mood, campaign context, dependencies, or reminders."
                  />
                </Field>

                {statusMessage && (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    {statusMessage}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-zinc-900 px-5 py-4 text-sm font-black text-white transition-all hover:bg-zinc-800 sm:w-auto dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {editingId ? "Update Handover" : "Save Handover"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(broadcastPreview, "Broadcast summary")}
                    className="w-full rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Copy Broadcast Summary
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-4 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100 sm:w-auto dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        <DateRangeFilter label="Handover Date Range" value={dateRange} onChange={setDateRange} />

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                Saved Handovers
              </p>
              <h2 className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                Recent shift summaries
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredHandovers.length > 0 ? (
              filteredHandovers.slice(0, 8).map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <HealthBadge health={item.health} />
                        <MutedBadge>{item.shiftWindow}</MutedBadge>
                        <MutedBadge>{item.team}</MutedBadge>
                      </div>
                      <h3 className="mt-4 text-lg font-black text-zinc-900 dark:text-zinc-100 sm:text-xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        {item.summary || "No summary added."}
                      </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                      <button
                        onClick={() => handleLoad(item.id)}
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-100 sm:flex-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleCopy(item.broadcastSummary, "Saved handover")}
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-100 sm:flex-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    <PreviewBlock label="Pending Next Shift">
                      {item.pendingItems || "No pending items added."}
                    </PreviewBlock>
                    <PreviewBlock label="Blockers / Risks">
                      {item.blockers || "No blockers noted."}
                    </PreviewBlock>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-zinc-500 sm:grid-cols-2">
                    <span>Prepared by: {item.preparedBy || "Not set"}</span>
                    <span>Coverage: {item.coverage || "Not set"}</span>
                    <span>Date: {item.shiftDate || "Not set"}</span>
                    <span>Updated: {new Date(item.updatedAt).toLocaleString()}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900 sm:p-10 xl:col-span-2">
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 sm:text-xl">
                  No handovers saved yet
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Add the first handover above to keep the next shift and the wider team aligned.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
        <Icon className="h-5 w-5 text-zinc-500" />
      </div>
      <div className="mt-4 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">{value}</div>
    </div>
  );
}

function HealthBadge({ health }: { health: ShiftHandoverHealth }) {
  const className =
    health === "Critical"
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
      : health === "Watch"
      ? "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className}`}>
      {health}
    </span>
  );
}

function MutedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

function PreviewBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{children}</div>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const textAreaClassName =
  "min-h-[180px] w-full resize-none rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
