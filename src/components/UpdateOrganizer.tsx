"use client";

import React, { useContext, useDeferredValue, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Copy, Download, History, Languages, Loader2, Save, Search, ShieldAlert, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { AppContext } from "./Root";
import { DateRangeFilter } from "./DateRangeFilter";
import { FeatureGate } from "./FeatureGate";
import { useConfiguration } from "../context/ConfigurationContext";
import { emptyDateRange, filterByDateRange } from "../lib/dateFilters";
import { buildShiftHandoverBroadcast, buildUpdateTitle, createOrganizedUpdateRecord, createShiftHandoverRecord, normalizeOrganizedUpdateRecords, normalizeShiftHandoverRecords, type ShiftHandoverHealth, type ShiftHandoverRecord } from "../lib/workspaceTools";

type SectionKey = "summary" | "completed" | "progress" | "blockers" | "decisions" | "nextSteps" | "metrics" | "notes";
type OutputTemplate = "leadership" | "daily" | "client";
type DetailLevel = "concise" | "standard" | "detailed";
type FormatterOptions = { translateArabic: boolean; includeMetrics: boolean; includeNotes: boolean; includePreparedBy: boolean };
type ParsedUpdate = Record<SectionKey, string[]>;

const EMPTY_PARSED: ParsedUpdate = { summary: [], completed: [], progress: [], blockers: [], decisions: [], nextSteps: [], metrics: [], notes: [] };
const DEFAULT_OPTIONS: FormatterOptions = { translateArabic: true, includeMetrics: true, includeNotes: true, includePreparedBy: true };
const SECTION_ORDER: SectionKey[] = ["summary", "completed", "progress", "blockers", "decisions", "nextSteps", "metrics", "notes"];
const LABELS: Record<OutputTemplate, Record<SectionKey, string>> = {
  leadership: { summary: "Executive Summary", completed: "Completed Work", progress: "In Progress", blockers: "Risks / Blockers", decisions: "Support Needed", nextSteps: "Next Actions", metrics: "Key Metrics", notes: "Additional Context" },
  daily: { summary: "Shift Summary", completed: "Completed", progress: "In Progress", blockers: "Blockers", decisions: "Escalations / Approvals", nextSteps: "Next Steps", metrics: "Metrics", notes: "Notes" },
  client: { summary: "Overview", completed: "Delivered", progress: "Current Status", blockers: "Open Items", decisions: "Pending Approvals", nextSteps: "Upcoming Actions", metrics: "Performance Snapshot", notes: "Additional Notes" },
};
const DETAIL_LIMITS: Record<DetailLevel, number> = { concise: 2, standard: 4, detailed: 8 };

const normalizeLine = (line: string) => line.replace(/^[\s\-*\d.)]+/, "").replace(/\s+/g, " ").trim();
const containsArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

function splitLines(text: string) {
  return text.replace(/\r/g, "\n").replace(/[;|]+/g, "\n").replace(/\n{2,}/g, "\n").split("\n").map(normalizeLine).filter(Boolean);
}

function parseStructuredUpdate(text: string): ParsedUpdate {
  const parsed: ParsedUpdate = { ...EMPTY_PARSED, summary: [], completed: [], progress: [], blockers: [], decisions: [], nextSteps: [], metrics: [], notes: [] };
  const lines = splitLines(text);
  lines.forEach((rawLine, index) => {
    const line = rawLine.replace(/^(summary|completed|done|progress|blockers?|next steps?|decisions?|metrics?|notes?)\s*[:-]\s*/i, "").trim();
    const normalized = rawLine.toLowerCase();
    if (index === 0 && !/(done|progress|block|next|decision|metric|note)/i.test(normalized)) return void parsed.summary.push(line);
    if (/(summary|overview|headline)/i.test(normalized)) return void parsed.summary.push(line);
    if (/(done|completed|closed|delivered|finished|sent|launched|resolved|shared|finalized|تم|خلص|اكتمل|انتهى)/i.test(normalized)) return void parsed.completed.push(line);
    if (/(progress|ongoing|in progress|working|underway|tracking|reviewing|processing|following up)/i.test(normalized)) return void parsed.progress.push(line);
    if (/(block|issue|risk|delay|waiting|stuck|problem|hold|dependency|escalat|concern|مشكلة|تأخير|معطل)/i.test(normalized)) return void parsed.blockers.push(line);
    if (/(decision|approval|approve|sign off|input needed|owner decision|leadership)/i.test(normalized)) return void parsed.decisions.push(line);
    if (/(next|follow|action|todo|will|tomorrow|plan|need to|continue|resume|monitor)/i.test(normalized)) return void parsed.nextSteps.push(line);
    if (/\d|%|kpi|target|con|cov|sla|metric|volume|rate|count|coverage|achievement/i.test(normalized)) return void parsed.metrics.push(line);
    parsed.notes.push(line);
  });
  return parsed;
}

function formatDate(value: string) {
  const parsed = value ? new Date(`${value}T12:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function buildOutput(parsed: ParsedUpdate, template: OutputTemplate, detailLevel: DetailLevel, title: string, preparedBy: string, reportDate: string, options: FormatterOptions) {
  const lines: string[] = [];
  lines.push(`${template.toUpperCase()} UPDATE`);
  lines.push(`Date: ${formatDate(reportDate)}`);
  lines.push(`Subject: ${title.trim() || buildUpdateTitle(parsed.summary[0] || parsed.notes[0] || "Structured Update")}`);
  if (options.includePreparedBy && preparedBy.trim()) lines.push(`Prepared by: ${preparedBy.trim()}`);
  lines.push("");
  SECTION_ORDER.forEach((section) => {
    if (section === "metrics" && !options.includeMetrics) return;
    if (section === "notes" && !options.includeNotes) return;
    const items = parsed[section].slice(0, DETAIL_LIMITS[detailLevel]);
    if (!items.length) return;
    lines.push(LABELS[template][section].toUpperCase());
    items.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  });
  return lines.join("\n").trim();
}

async function requestTranslation(text: string) {
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
  if (!response.ok) throw new Error("Translation failed.");
  const payload = await response.json() as unknown[];
  const translated = Array.isArray(payload[0]) ? (payload[0] as unknown[]).map((part) => Array.isArray(part) ? String(part[0] || "") : "").join("") : "";
  return translated || text;
}

async function copyText(value: string) {
  if (navigator?.clipboard) await navigator.clipboard.writeText(value);
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "output";
}

function defaultHandover(preparedBy = "", shiftWindow = "General", team = "Operations") {
  return { title: "", shiftDate: new Date().toISOString().slice(0, 10), shiftWindow, preparedBy, team, coverage: "", health: "Stable" as ShiftHandoverHealth, summary: "", completedWork: "", pendingItems: "", blockers: "", escalations: "", nextShiftFocus: "", sharedContext: "" };
}

export function UpdateOrganizer() {
  return (
    <FeatureGate featureId="update-organizer">
      <UpdateOrganizerContent />
    </FeatureGate>
  );
}

function UpdateOrganizerContent() {
  const ctx = useContext(AppContext);
  const { configuration } = useConfiguration();
  const organizerConfig = configuration.updateOrganizer;
  const organizedUpdates = normalizeOrganizedUpdateRecords(ctx?.organizedUpdates || []);
  const setOrganizedUpdates = ctx?.setOrganizedUpdates || (() => {});
  const savedHandovers = useMemo(() => normalizeShiftHandoverRecords(ctx?.shiftHandovers || []).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [ctx?.shiftHandovers]);
  const setShiftHandovers = ctx?.setShiftHandovers || (() => {});
  const defaultPreparedBy = ctx?.userName || ctx?.userEmail || "";
  const defaultShiftWindow = organizerConfig.shiftWindows?.[0] ?? "General";
  const defaultTeam = organizerConfig.handoverTeams?.[0] ?? "Operations";

  const [activeTab, setActiveTab] = useState<"update" | "handover">("update");
  const [rawInput, setRawInput] = useState("");
  const [translatedInput, setTranslatedInput] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [preparedBy, setPreparedBy] = useState(defaultPreparedBy);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [template, setTemplate] = useState<OutputTemplate>(organizerConfig.defaultTemplate as OutputTemplate);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(organizerConfig.defaultDetailLevel as DetailLevel);
  const [options, setOptions] = useState<FormatterOptions>(DEFAULT_OPTIONS);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [handoverForm, setHandoverForm] = useState(() => defaultHandover(defaultPreparedBy, defaultShiftWindow, defaultTeam));
  const [handoverEditingId, setHandoverEditingId] = useState<string | null>(null);
  const [handoverSearch, setHandoverSearch] = useState("");

  const deferredInput = useDeferredValue(translatedInput || rawInput);
  const deferredHistorySearch = useDeferredValue(historySearch);
  const deferredHandoverSearch = useDeferredValue(handoverSearch);
  const parsed = useMemo(() => parseStructuredUpdate(deferredInput), [deferredInput]);
  const autoTitle = useMemo(() => reportTitle.trim() || buildUpdateTitle(deferredInput || "Structured Update"), [deferredInput, reportTitle]);
  const output = useMemo(() => buildOutput(parsed, template, detailLevel, autoTitle, preparedBy, reportDate, options), [autoTitle, detailLevel, options, parsed, preparedBy, reportDate, template]);
  const previewHandover = useMemo(() => buildShiftHandoverBroadcast(handoverForm), [handoverForm]);

  const qualityChecks = useMemo(() => ([
    { label: "Clear summary", ok: parsed.summary.length > 0 },
    { label: "Completed work listed", ok: parsed.completed.length > 0 },
    { label: "Next steps included", ok: parsed.nextSteps.length > 0 },
    { label: "Risks visible", ok: parsed.blockers.length > 0 || parsed.decisions.length > 0 },
  ]), [parsed]);

  const filteredHistory = useMemo(() => {
    const ranged = filterByDateRange(organizedUpdates, dateRange, (item) => item.createdAt);
    const q = deferredHistorySearch.trim().toLowerCase();
    return q ? ranged.filter((item) => [item.title, item.rawInput, item.translatedInput, item.organizedOutput].join(" ").toLowerCase().includes(q)) : ranged;
  }, [dateRange, deferredHistorySearch, organizedUpdates]);

  const filteredHandovers = useMemo(() => {
    const q = deferredHandoverSearch.trim().toLowerCase();
    return q ? savedHandovers.filter((item) => [item.title, item.summary, item.preparedBy, item.team, item.shiftWindow, item.blockers].join(" ").toLowerCase().includes(q)) : savedHandovers;
  }, [deferredHandoverSearch, savedHandovers]);

  const handoverChecks = useMemo(() => ([
    { label: "Summary", ok: Boolean(handoverForm.summary.trim()) },
    { label: "Completed work", ok: Boolean(handoverForm.completedWork.trim()) },
    { label: "Pending / next shift", ok: Boolean(handoverForm.pendingItems.trim() || handoverForm.nextShiftFocus.trim()) },
    { label: "Risk visibility", ok: Boolean(handoverForm.blockers.trim() || handoverForm.escalations.trim()) },
  ]), [handoverForm]);

  const handleFormat = async () => {
    if (!rawInput.trim()) return setStatusMessage("Paste the rough update first.");
    setIsFormatting(true);
    setStatusMessage(null);
    try {
      let nextInput = rawInput;
      if (options.translateArabic && containsArabic(rawInput)) {
        nextInput = await requestTranslation(rawInput);
        setTranslatedInput(nextInput);
      } else {
        setTranslatedInput("");
      }
      const nextOutput = buildOutput(parseStructuredUpdate(nextInput), template, detailLevel, reportTitle.trim() || buildUpdateTitle(nextInput), preparedBy, reportDate, options);
      setFormattedOutput(nextOutput);
      setStatusMessage("Update organized.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to organize update.");
    } finally {
      setIsFormatting(false);
    }
  };

  const handleSave = () => {
    if (!rawInput.trim()) return setStatusMessage("Nothing to save yet.");
    const finalOutput = formattedOutput || output;
    setOrganizedUpdates((current: typeof organizedUpdates) => [
      createOrganizedUpdateRecord({ title: autoTitle, rawInput, translatedInput, organizedOutput: finalOutput, sourceLanguage: translatedInput ? "auto" : "original" }),
      ...normalizeOrganizedUpdateRecords(current),
    ]);
    setFormattedOutput(finalOutput);
    setStatusMessage("Saved to history.");
  };

  const handleLoad = (id: string) => {
    const record = organizedUpdates.find((item) => item.id === id);
    if (!record) return;
    setRawInput(record.rawInput);
    setTranslatedInput(record.translatedInput);
    setFormattedOutput(record.organizedOutput);
    setReportTitle(record.title);
    setStatusMessage("Saved update loaded.");
  };

  const handleDelete = (id: string) => {
    setOrganizedUpdates((current: typeof organizedUpdates) => normalizeOrganizedUpdateRecords(current).filter((item) => item.id !== id));
  };

  const updateHandoverField = (field: keyof typeof handoverForm, value: string) => setHandoverForm((current) => ({ ...current, [field]: value }));

  const saveHandover = (event: React.FormEvent) => {
    event.preventDefault();
    const record = createShiftHandoverRecord({ ...handoverForm, id: handoverEditingId || undefined, preparedBy: handoverForm.preparedBy.trim() || defaultPreparedBy, broadcastSummary: previewHandover });
    setShiftHandovers((current: ShiftHandoverRecord[]) => handoverEditingId ? normalizeShiftHandoverRecords(current).map((item) => item.id === handoverEditingId ? record : item) : [record, ...normalizeShiftHandoverRecords(current)]);
    setHandoverEditingId(null);
    setHandoverForm(defaultHandover(defaultPreparedBy, defaultShiftWindow, defaultTeam));
  };

  const loadHandover = (id: string) => {
    const record = savedHandovers.find((item) => item.id === id);
    if (!record) return;
    setHandoverEditingId(record.id);
    setHandoverForm({ title: record.title, shiftDate: record.shiftDate, shiftWindow: record.shiftWindow, preparedBy: record.preparedBy, team: record.team, coverage: record.coverage, health: record.health, summary: record.summary, completedWork: record.completedWork, pendingItems: record.pendingItems, blockers: record.blockers, escalations: record.escalations, nextShiftFocus: record.nextShiftFocus, sharedContext: record.sharedContext });
  };

  const deleteHandover = (id: string) => {
    setShiftHandovers((current: ShiftHandoverRecord[]) => normalizeShiftHandoverRecords(current).filter((item) => item.id !== id));
    if (handoverEditingId === id) {
      setHandoverEditingId(null);
      setHandoverForm(defaultHandover(defaultPreparedBy, defaultShiftWindow, defaultTeam));
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-5 md:px-6">
      <section className="app-hero-panel rounded-[var(--app-card-radius)] border p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="app-hero-kicker text-[11px] font-black uppercase tracking-[0.24em]">Operations Writing Desk</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-zinc-100">Updates and handovers with clearer thinking and cleaner output</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">The workflow now separates drafting, quality checks, and final output so the team can produce faster updates and more reliable shift handovers.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
            <HeroStat label="Saved updates" value={filteredHistory.length} />
            <HeroStat label="Saved handovers" value={filteredHandovers.length} />
            <HeroStat label="Ready sections" value={qualityChecks.filter((item) => item.ok).length} />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <TabButton active={activeTab === "update"} label="Update organizer" onClick={() => setActiveTab("update")} />
          <TabButton active={activeTab === "handover"} label="Shift handover" onClick={() => setActiveTab("handover")} />
        </div>
      </section>

      {activeTab === "update" ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.08fr,0.92fr]">
            <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Compose rough update</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Paste notes, bullets, or messy chat copy. We will structure it into a cleaner update.</div>
                </div>
                {isFormatting ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : <ClipboardList className="h-4 w-4 text-zinc-400" />}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Title"><input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} className={inputClassName} placeholder="Optional title" /></Field>
                <Field label="Prepared by"><input value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} className={inputClassName} placeholder="Owner" /></Field>
                <Field label="Template"><select value={template} onChange={(event) => setTemplate(event.target.value as OutputTemplate)} className={inputClassName}><option value="leadership">Leadership</option><option value="daily">Daily</option><option value="client">Client</option></select></Field>
                <Field label="Detail"><select value={detailLevel} onChange={(event) => setDetailLevel(event.target.value as DetailLevel)} className={inputClassName}><option value="concise">Concise</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,1fr]">
                <Field label="Report date"><input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className={inputClassName} /></Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <OptionToggle checked={options.translateArabic} label="Translate Arabic" onChange={(checked) => setOptions((current) => ({ ...current, translateArabic: checked }))} />
                  <OptionToggle checked={options.includeMetrics} label="Include metrics" onChange={(checked) => setOptions((current) => ({ ...current, includeMetrics: checked }))} />
                  <OptionToggle checked={options.includeNotes} label="Include notes" onChange={(checked) => setOptions((current) => ({ ...current, includeNotes: checked }))} />
                  <OptionToggle checked={options.includePreparedBy} label="Show owner" onChange={(checked) => setOptions((current) => ({ ...current, includePreparedBy: checked }))} />
                </div>
              </div>
              <textarea value={rawInput} onChange={(event) => setRawInput(event.target.value)} className={`${inputClassName} mt-4 min-h-[320px] resize-y`} placeholder="Paste raw notes, shift bullets, or copied chat updates here..." />
              {statusMessage ? <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{statusMessage}</div> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => void handleFormat()} className="rounded-2xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--app-primary, #18181b)" }}><WandSparkles className="mr-2 inline h-4 w-4" />Organize update</button>
                <button onClick={handleSave} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"><Save className="mr-2 inline h-4 w-4" />Save output</button>
                <button onClick={() => void copyText(formattedOutput || output)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"><Copy className="mr-2 inline h-4 w-4" />Copy</button>
                <button onClick={() => downloadTextFile(`${sanitizeFileName(autoTitle)}.txt`, formattedOutput || output)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"><Download className="mr-2 inline h-4 w-4" />Export</button>
              </div>
            </div>

            <div className="space-y-5">
              <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
                <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Quality checks</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Make sure the update answers what happened, what is blocked, and what comes next.</div>
                <div className="mt-4 space-y-3">
                  {qualityChecks.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${item.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>{item.ok ? "Ready" : "Missing"}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Structured preview</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Preview how the rough text is being understood.</div>
                  </div>
                  {translatedInput ? <div className="rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"><Languages className="mr-1 inline h-3 w-3" />Translated</div> : null}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SECTION_ORDER.map((section) => (
                    <div key={section} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{LABELS[template][section]}</div>
                        <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">{parsed[section].length}</div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {parsed[section].length ? parsed[section].slice(0, 3).map((line, index) => <div key={`${section}-${index}`} className="text-sm text-zinc-600 dark:text-zinc-300">{line}</div>) : <div className="text-sm text-zinc-400">No content detected yet.</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Final output</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Clean, professional text ready to paste into chat, email, or a report.</div>
              </div>
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{template}</div>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{formattedOutput || output}</pre>
          </section>

          <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Saved updates</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Reload previous outputs, compare versions, or copy a saved update again.</div>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                <Search className="h-4 w-4 text-zinc-400" />
                <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search saved updates" className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100" />
              </label>
            </div>
            <div className="mt-3"><DateRangeFilter label="History range" value={dateRange} onChange={setDateRange} /></div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {filteredHistory.length ? filteredHistory.slice(0, organizerConfig.maxHistoryItems).map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{new Date(item.createdAt).toLocaleString()}</div>
                      <div className="mt-2 text-lg font-black text-zinc-950 dark:text-zinc-100">{item.title}</div>
                      <div className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{item.organizedOutput}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleLoad(item.id)} className={historyButtonClassName}>Load</button>
                      <button onClick={() => void copyText(item.organizedOutput)} className={historyIconButtonClassName}><Copy className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className={historyIconButtonClassName}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              )) : <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No saved updates match the current filters.</div>}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.02fr,0.98fr]">
            <form onSubmit={saveHandover} className="app-panel rounded-[var(--app-card-radius)] border p-5">
              <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Compose shift handover</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Capture what happened, what is still open, and what the next shift must know immediately.</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Title"><input required value={handoverForm.title} onChange={(event) => updateHandoverField("title", event.target.value)} className={inputClassName} placeholder="Night shift handover" /></Field>
                <Field label="Shift date"><input type="date" required value={handoverForm.shiftDate} onChange={(event) => updateHandoverField("shiftDate", event.target.value)} className={inputClassName} /></Field>
                <Field label="Shift window"><select value={handoverForm.shiftWindow} onChange={(event) => updateHandoverField("shiftWindow", event.target.value)} className={inputClassName}>{(organizerConfig.shiftWindows ?? ["General"]).map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
                <Field label="Team"><select value={handoverForm.team} onChange={(event) => updateHandoverField("team", event.target.value)} className={inputClassName}>{(organizerConfig.handoverTeams ?? ["Operations"]).map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
                <Field label="Prepared by"><input value={handoverForm.preparedBy} onChange={(event) => updateHandoverField("preparedBy", event.target.value)} className={inputClassName} /></Field>
                <Field label="Coverage / hours"><input value={handoverForm.coverage} onChange={(event) => updateHandoverField("coverage", event.target.value)} className={inputClassName} placeholder="6 PM - 2 AM" /></Field>
              </div>
              <Field label="Shift health">
                <div className="grid grid-cols-3 gap-2">
                  {(["Stable", "Watch", "Critical"] as ShiftHandoverHealth[]).map((health) => <button key={health} type="button" onClick={() => setHandoverForm((current) => ({ ...current, health }))} className={`rounded-xl px-3 py-2 text-xs font-bold border ${handoverForm.health === health ? "bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100" : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"}`}>{health}</button>)}
                </div>
              </Field>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Summary"><textarea required value={handoverForm.summary} onChange={(event) => updateHandoverField("summary", event.target.value)} className={`${inputClassName} min-h-[110px] resize-y`} placeholder="What happened this shift?" /></Field>
                <Field label="Completed work"><textarea value={handoverForm.completedWork} onChange={(event) => updateHandoverField("completedWork", event.target.value)} className={`${inputClassName} min-h-[110px] resize-y`} placeholder="What was closed or delivered?" /></Field>
                <Field label="Pending items"><textarea value={handoverForm.pendingItems} onChange={(event) => updateHandoverField("pendingItems", event.target.value)} className={`${inputClassName} min-h-[110px] resize-y`} placeholder="What remains open?" /></Field>
                <Field label="Blockers / risks"><textarea value={handoverForm.blockers} onChange={(event) => updateHandoverField("blockers", event.target.value)} className={`${inputClassName} min-h-[110px] resize-y`} placeholder="What can slow the next shift down?" /></Field>
                <Field label="Escalations"><textarea value={handoverForm.escalations} onChange={(event) => updateHandoverField("escalations", event.target.value)} className={`${inputClassName} min-h-[110px] resize-y`} placeholder="Which approvals or decisions are needed?" /></Field>
                <Field label="Next shift focus"><textarea value={handoverForm.nextShiftFocus} onChange={(event) => updateHandoverField("nextShiftFocus", event.target.value)} className={`${inputClassName} min-h-[110px] resize-y`} placeholder="What should the next shift do first?" /></Field>
              </div>
              <Field label="Shared context"><textarea value={handoverForm.sharedContext} onChange={(event) => updateHandoverField("sharedContext", event.target.value)} className={`${inputClassName} min-h-[90px] resize-y`} placeholder="Extra context, reminders, or team-wide notes." /></Field>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="submit" className="rounded-2xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--app-primary, #18181b)" }}><CheckCircle2 className="mr-2 inline h-4 w-4" />{handoverEditingId ? "Update handover" : "Save handover"}</button>
                <button type="button" onClick={() => void copyText(previewHandover)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"><Copy className="mr-2 inline h-4 w-4" />Copy summary</button>
                <button type="button" onClick={() => downloadTextFile(`${sanitizeFileName(handoverForm.title || "shift-handover")}.txt`, previewHandover)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"><Download className="mr-2 inline h-4 w-4" />Export</button>
              </div>
            </form>

            <div className="space-y-5">
              <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
                <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Handover readiness</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Make sure the next shift gets a summary, open risks, and a first priority.</div>
                <div className="mt-4 space-y-3">
                  {handoverChecks.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${item.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>{item.ok ? "Ready" : "Missing"}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Broadcast preview</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">A direct summary you can paste into chat or shift channels.</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${handoverForm.health === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : handoverForm.health === "Watch" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>{handoverForm.health}</div>
                </div>
                <pre className="mt-4 whitespace-pre-wrap rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{previewHandover}</pre>
              </section>
            </div>
          </section>

          <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">Saved handovers</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Reload previous handovers, edit them, or copy the summary again.</div>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                <Search className="h-4 w-4 text-zinc-400" />
                <input value={handoverSearch} onChange={(event) => setHandoverSearch(event.target.value)} placeholder="Search handovers" className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100" />
              </label>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {filteredHandovers.length ? filteredHandovers.slice(0, organizerConfig.maxHistoryItems).map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${item.health === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : item.health === "Watch" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>{item.health}</span>
                        <span className="text-[10px] text-zinc-400">{item.shiftWindow} . {item.team}</span>
                      </div>
                      <div className="mt-2 text-lg font-black text-zinc-950 dark:text-zinc-100">{item.title}</div>
                      <div className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">{item.summary}</div>
                      <div className="mt-2 text-[11px] text-zinc-400">By {item.preparedBy || "-"} on {item.shiftDate}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadHandover(item.id)} className={historyButtonClassName}>Load</button>
                      <button onClick={() => void copyText(item.broadcastSummary)} className={historyIconButtonClassName}><Copy className="h-4 w-4" /></button>
                      <button onClick={() => deleteHandover(item.id)} className={historyIconButtonClassName}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              )) : <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No handovers match the current filters.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="block"><div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>{children}</label>;
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return <div className="app-panel rounded-[1.5rem] border p-4"><div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div><div className="mt-2 text-2xl font-black text-zinc-950 dark:text-zinc-100">{value}</div></div>;
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${active ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"}`}>{label}</button>;
}

function OptionToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${checked ? "bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100" : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded accent-current" /><span>{label}</span></label>;
}

const inputClassName = "app-input w-full rounded-2xl px-4 py-3 text-sm font-medium";
const historyButtonClassName = "rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";
const historyIconButtonClassName = "rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900";
