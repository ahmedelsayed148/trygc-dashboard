"use client";

import React, { useContext, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ClipboardList, FileSpreadsheet, MessageSquareText, Pencil, Plus, RefreshCw, Search, Trash2, Upload, Users } from "lucide-react";

import { AppContext } from "./Root";
import { FeatureGate } from "./FeatureGate";
import { parseCoverageObjectRows, parseCoverageSheetRows } from "../lib/coverageImport";
import { buildCoverageWorkbookData, createCoverageRecord, normalizeCoverageRecords, type CoverageRecord, type CoverageStatus } from "../lib/coverageTypes";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["Completed", "In Progress", "Not Started", "Blank", "Other"];

const defaultForm = {
  action: "",
  appreciation: "",
  auditStatus: "",
  campaign: "",
  date: "",
  doneAt: "",
  isNote: false,
  notes: "",
  owner: "",
  status: "Blank" as CoverageStatus,
  systemStatus: "",
  task: "Coverage",
  warning: "",
};

const sampleCoverageRecords = [
  createCoverageRecord({
    owner: "Ahmed AbdulRizk",
    task: "Coverage",
    campaign: "Blacktap Riyadh - Visit - Mar 2026",
    date: "2026-03-11",
    status: "Completed",
    notes: "Verified all required coverage and confirmed delivery.",
    systemStatus: "Completed",
    rowNumber: 1,
    source: "manual",
  }),
  createCoverageRecord({
    owner: "Mariam Essam",
    task: "Coverage",
    campaign: "Laffah UAE - Visit - Mar 2026",
    date: "2026-03-11",
    status: "In Progress",
    warning: "Waiting on one missing asset from the group.",
    notes: "Main queue is done. One branch still pending.",
    rowNumber: 2,
    source: "manual",
  }),
  createCoverageRecord({
    owner: "Hoda Ahmed",
    task: "Audit Campaign",
    campaign: "Zuma KSA - Visit - Mar 2026",
    date: "2026-03-10",
    status: "Completed",
    notes: "Campaign audited and all files matched the report.",
    rowNumber: 3,
    source: "manual",
  }),
  createCoverageRecord({
    owner: "NOTE",
    task: "Note",
    campaign: "Night shift note",
    date: "2026-03-11",
    isNote: true,
    notes: "Use this page as a live editable sample. Replace these rows with your own uploads later.",
    rowNumber: 4,
    source: "manual",
  }),
  createCoverageRecord({
    owner: "Rawan Mos3ad",
    task: "Support",
    campaign: "Popeyes BH - Jan 2026",
    date: "2026-03-09",
    status: "Not Started",
    action: "Need to confirm queue owner and upload deadline.",
    rowNumber: 5,
    source: "manual",
  }),
];

export function CoverageBoard() {
  return (
    <FeatureGate featureId="coverage">
      <CoverageBoardContent />
    </FeatureGate>
  );
}

function CoverageBoardContent() {
  const ctx = useContext(AppContext);
  const coverageRecords = normalizeCoverageRecords(ctx?.coverageRecords || []);
  const setCoverageRecords = ctx?.setCoverageRecords || (() => {});

  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (coverageRecords.length === 0) {
      setCoverageRecords(sampleCoverageRecords);
    }
  }, [coverageRecords.length, setCoverageRecords]);

  const data = useMemo(() => buildCoverageWorkbookData(coverageRecords.length > 0 ? coverageRecords : sampleCoverageRecords), [coverageRecords]);
  const taskOptions = useMemo(() => ["All", ...Array.from(new Set(data.records.filter((record) => !record.isNote).map((record) => record.task))).sort()], [data.records]);
  const ownerOptions = useMemo(() => ["All", ...Array.from(new Set(data.records.filter((record) => !record.isNote).map((record) => record.owner))).sort()], [data.records]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return data.records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        [record.owner, record.task, record.campaign, record.status, record.notes, record.warning, record.action].join(" ").toLowerCase().includes(normalizedSearch);

      return (
        matchesSearch &&
        (taskFilter === "All" || record.task === taskFilter) &&
        (ownerFilter === "All" || record.owner === ownerFilter) &&
        (statusFilter === "All" || record.status === statusFilter)
      );
    });
  }, [data.records, deferredSearch, ownerFilter, statusFilter, taskFilter]);

  const paginatedRecords = useMemo(() => filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredRecords, page]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, ownerFilter, statusFilter, taskFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setEditorOpen(true);
  };

  const openEditModal = (record: CoverageRecord) => {
    setEditingId(record.id);
    setForm({
      action: record.action,
      appreciation: record.appreciation,
      auditStatus: record.auditStatus,
      campaign: record.campaign,
      date: record.date || "",
      doneAt: record.doneAt || "",
      isNote: record.isNote,
      notes: record.notes,
      owner: record.owner,
      status: record.status,
      systemStatus: record.systemStatus,
      task: record.task,
      warning: record.warning,
    });
    setEditorOpen(true);
  };

  const saveRecord = () => {
    const nextRecord = createCoverageRecord({
      ...form,
      doneAt: form.doneAt || null,
      id: editingId || undefined,
      source: "manual",
      updatedAt: new Date().toISOString(),
    });

    setCoverageRecords((current: CoverageRecord[]) => {
      const normalized = normalizeCoverageRecords(current);
      if (editingId) {
        return normalized.map((record) => (record.id === editingId ? { ...nextRecord, createdAt: record.createdAt } : record));
      }
      return [nextRecord, ...normalized];
    });

    setStatusMessage(editingId ? "Coverage row updated." : "Coverage row added.");
    setEditorOpen(false);
  };

  const deleteRecord = (id: string) => {
    setCoverageRecords((current: CoverageRecord[]) => normalizeCoverageRecords(current).filter((record) => record.id !== id));
    setStatusMessage("Coverage row removed.");
  };

  const resetToSample = () => {
    setCoverageRecords(sampleCoverageRecords);
    setStatusMessage("Coverage page reset to sample data.");
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-4 sm:px-6 sm:py-6 dark:bg-black">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Coverage Sample Page</p>
              <h1 className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">Editable sample coverage queue</h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-500">
                This page starts with sample data only. Edit any row, update notes, add new queue items, or import Excel, CSV, or bulk-pasted data to replace the sample.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={ClipboardList} label="Actionable Rows" value={formatNumber(data.summary.actionableRecords)} />
                <StatCard icon={Users} label="Owners" value={formatNumber(data.summary.uniqueOwners)} />
                <StatCard icon={FileSpreadsheet} label="Campaigns" value={formatNumber(data.summary.uniqueCampaigns)} />
                <StatCard icon={MessageSquareText} label="Notes" value={formatNumber(data.summary.noteRecords)} />
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap gap-3">
                <ActionButton icon={Plus} label="Add Row" onClick={openCreateModal} />
                <ActionButton icon={Upload} label="Import Data" onClick={() => setImportOpen(true)} />
                <ActionButton icon={RefreshCw} label="Reset Sample" onClick={resetToSample} />
              </div>
              {statusMessage && (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  {statusMessage}
                </div>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MiniStat label="Completion Rate" value={`${data.summary.completionRate}%`} />
                <MiniStat label="Latest Date" value={data.summary.latestDate || "Unavailable"} />
                <MiniStat label="Total Rows" value={formatNumber(data.summary.totalRecords)} />
                <MiniStat label="Status Types" value={formatNumber(data.statusBreakdown.length)} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Coverage Queue</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">All queue rows and notes are editable.</p>
            </div>
            <div className="flex max-w-xl items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100" placeholder="Search by owner, task, campaign, or note" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <FilterSelect label="Task" value={taskFilter} onChange={setTaskFilter} options={taskOptions} />
            <FilterSelect label="Owner" value={ownerFilter} onChange={setOwnerFilter} options={ownerOptions} />
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["All", ...STATUS_OPTIONS]} />
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <HeaderCell>Actions</HeaderCell>
                    <HeaderCell>Date</HeaderCell>
                    <HeaderCell>Owner</HeaderCell>
                    <HeaderCell>Task</HeaderCell>
                    <HeaderCell>Campaign</HeaderCell>
                    <HeaderCell>Status</HeaderCell>
                    <HeaderCell>Notes</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-900 dark:bg-zinc-950">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openEditModal(record)} className={iconButtonClassName}><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => deleteRecord(record.id)} className={iconButtonClassName}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{record.date || "—"}</td>
                      <td className="px-4 py-4 font-bold text-zinc-900 dark:text-zinc-100">{record.owner}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{record.task}</td>
                      <td className="px-4 py-4 max-w-[320px] text-zinc-700 dark:text-zinc-200">{record.campaign || "—"}</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{record.status}</span></td>
                      <td className="px-4 py-4 max-w-[320px] text-zinc-600 dark:text-zinc-300">{[record.warning, record.action, record.notes].filter(Boolean).join(" | ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Showing {Math.min(filteredRecords.length, (page - 1) * PAGE_SIZE + 1)}-{Math.min(page * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className={pagerButtonClassName}>Previous</button>
              <div className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-black text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">Page {page} / {pageCount}</div>
              <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} className={pagerButtonClassName}>Next</button>
            </div>
          </div>
        </section>
      </div>

      {editorOpen && <CoverageEditorModal editingId={editingId} form={form} onChange={setForm} onClose={() => setEditorOpen(false)} onSave={saveRecord} />}
      {importOpen && <CoverageImportModal onClose={() => setImportOpen(false)} onImport={(records, mode) => {
        const normalized = normalizeCoverageRecords(records);
        setCoverageRecords((current: CoverageRecord[]) => mode === "replace" ? normalized : [...normalized, ...normalizeCoverageRecords(current)]);
        setStatusMessage(mode === "replace" ? `Replaced sample with ${normalized.length} imported rows.` : `Imported ${normalized.length} new rows.`);
        setImportOpen(false);
      }} />}
    </div>
  );
}

function CoverageEditorModal({
  editingId,
  form,
  onChange,
  onClose,
  onSave,
}: {
  editingId: string | null;
  form: typeof defaultForm;
  onChange: React.Dispatch<React.SetStateAction<typeof defaultForm>>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{editingId ? "Edit Coverage Row" : "Add Coverage Row"}</div>
            <h2 className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">{editingId ? "Update queue details and notes" : "Create a new queue row"}</h2>
          </div>
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>Close</button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Owner"><input value={form.owner} onChange={(event) => onChange((current) => ({ ...current, owner: event.target.value }))} className={inputClassName} /></Field>
          <Field label="Task"><input value={form.task} onChange={(event) => onChange((current) => ({ ...current, task: event.target.value }))} className={inputClassName} /></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(event) => onChange((current) => ({ ...current, date: event.target.value }))} className={inputClassName} /></Field>
          <Field label="Done At"><input type="datetime-local" value={normalizeDateTimeInput(form.doneAt)} onChange={(event) => onChange((current) => ({ ...current, doneAt: event.target.value ? new Date(event.target.value).toISOString() : "" }))} className={inputClassName} /></Field>
          <Field label="Status"><select value={form.status} onChange={(event) => onChange((current) => ({ ...current, status: event.target.value as CoverageStatus }))} className={inputClassName}>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
          <Field label="System Status"><input value={form.systemStatus} onChange={(event) => onChange((current) => ({ ...current, systemStatus: event.target.value }))} className={inputClassName} /></Field>
        </div>

        <Field label="Campaign" className="mt-4"><input value={form.campaign} onChange={(event) => onChange((current) => ({ ...current, campaign: event.target.value }))} className={inputClassName} /></Field>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Warning"><textarea value={form.warning} onChange={(event) => onChange((current) => ({ ...current, warning: event.target.value }))} className={textareaClassName} /></Field>
          <Field label="Action"><textarea value={form.action} onChange={(event) => onChange((current) => ({ ...current, action: event.target.value }))} className={textareaClassName} /></Field>
          <Field label="Appreciation"><textarea value={form.appreciation} onChange={(event) => onChange((current) => ({ ...current, appreciation: event.target.value }))} className={textareaClassName} /></Field>
        </div>
        <Field label="Notes" className="mt-4"><textarea value={form.notes} onChange={(event) => onChange((current) => ({ ...current, notes: event.target.value }))} className={`${textareaClassName} min-h-[140px]`} /></Field>
        <label className="mt-4 flex items-center gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-200">
          <input type="checkbox" checked={form.isNote} onChange={(event) => onChange((current) => ({ ...current, isNote: event.target.checked }))} />
          Treat this row as a note-only entry
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>Cancel</button>
          <button type="button" onClick={onSave} className={primaryButtonClassName}>{editingId ? "Save Changes" : "Add Row"}</button>
        </div>
      </div>
    </div>
  );
}

function CoverageImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (records: CoverageRecord[], mode: "append" | "replace") => void;
}) {
  const [mode, setMode] = useState<"append" | "replace">("replace");
  const [tab, setTab] = useState<"file" | "bulk">("file");
  const [bulkText, setBulkText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rowArray = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: null }) as unknown[][];
      const headerRow = rowArray[1] || [];
      const isWorkbookFormat = headerRow.some((value) => String(value || "").toLowerCase() === "task");
      const records = isWorkbookFormat
        ? parseCoverageSheetRows(rowArray, { source: "upload", XLSX })
        : parseCoverageObjectRows(XLSX.utils.sheet_to_json(firstSheet, { defval: null }) as Record<string, unknown>[], { source: "upload", XLSX });

      if (records.length === 0) {
        throw new Error("No valid coverage rows found in the uploaded file.");
      }

      onImport(records, mode);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to import the file.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = () => {
    try {
      const lines = bulkText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        throw new Error("Paste header + at least one data row.");
      }

      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter).map((value) => value.trim());
      const rows = lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(delimiter)[index] || ""])));
      const records = parseCoverageObjectRows(rows, { source: "bulk" });
      if (records.length === 0) {
        throw new Error("No valid coverage rows found in the pasted text.");
      }
      onImport(records, mode);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to parse bulk input.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Import Coverage Rows</div>
            <h2 className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">Excel, CSV, or bulk paste</h2>
          </div>
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>Close</button>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => setTab("file")} className={tab === "file" ? activeTabClassName : tabClassName}>Excel / CSV</button>
          <button type="button" onClick={() => setTab("bulk")} className={tab === "bulk" ? activeTabClassName : tabClassName}>Bulk Paste</button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Import Mode">
            <select value={mode} onChange={(event) => setMode(event.target.value as "append" | "replace")} className={inputClassName}>
              <option value="replace">Replace sample data</option>
              <option value="append">Append to current rows</option>
            </select>
          </Field>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Expected fields: `Owner`, `Task`, `Campaign`, `Date`, `Status`, `System`, `Audit Status`, `Warning`, `Action`, `Appreciation`, `Notes`
          </div>
        </div>

        {tab === "file" ? (
          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <FileSpreadsheet className="mb-4 h-10 w-10 text-zinc-400" />
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Upload `.xlsx`, `.xls`, or `.csv`</div>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { handleFile(file); } }} />
          </label>
        ) : (
          <div className="mt-5">
            <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} className={`${textareaClassName} min-h-[220px]`} placeholder={"Owner\tTask\tCampaign\tDate\tStatus\tNotes\nAhmed\tCoverage\tCampaign A\t2026-03-11\tCompleted\tSample note"} />
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={handleBulkImport} className={primaryButtonClassName}>Import Bulk Rows</button>
            </div>
          </div>
        )}

        {(loading || error) && (
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {loading ? "Processing import..." : error}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-3 text-zinc-700 shadow-sm dark:bg-zinc-950 dark:text-zinc-200"><Icon className="h-4 w-4" /></div>
        <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
      </div>
      <div className="mt-4 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-2 text-base font-black text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Field>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`block ${className || ""}`}>
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      {children}
    </label>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{children}</th>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function normalizeDateTimeInput(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function isWithinWindow(date: string, latestDate: string | null | undefined, _windowFilter: string) {
  return Boolean(date || latestDate || true);
}

const inputClassName =
  "w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const textareaClassName =
  "w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 min-h-[110px]";

const primaryButtonClassName =
  "rounded-xl bg-zinc-900 px-5 py-3 text-sm font-black text-white dark:bg-zinc-100 dark:text-black";

const secondaryButtonClassName =
  "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";

const tabClassName =
  "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

const activeTabClassName =
  "rounded-xl bg-zinc-900 px-4 py-2 text-sm font-black text-white dark:bg-zinc-100 dark:text-black";

const iconButtonClassName =
  "rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";

const pagerButtonClassName =
  "rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
