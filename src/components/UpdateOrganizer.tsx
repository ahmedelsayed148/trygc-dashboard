"use client";

import React, { useContext, useDeferredValue, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  History,
  Languages,
  LineChart,
  Loader2,
  MessageCircle,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
} from "lucide-react";

import { AppContext } from "./Root";
import { DateRangeFilter } from "./DateRangeFilter";
import { FeatureGate } from "./FeatureGate";
import { useConfiguration } from "../context/ConfigurationContext";
import type { TranslateToEnglishResponse } from "../lib/api";
import { emptyDateRange, filterByDateRange } from "../lib/dateFilters";
import {
  buildShiftHandoverBroadcast,
  buildUpdateTitle,
  createOrganizedUpdateRecord,
  createShiftHandoverRecord,
  normalizeOrganizedUpdateRecords,
  normalizeShiftHandoverRecords,
  type ShiftHandoverHealth,
  type ShiftHandoverRecord,
} from "../lib/workspaceTools";

function getDefaultHandoverForm(preparedBy = "", defaultShiftWindow = "General", defaultTeam = "Operations") {
  return {
    title: "", shiftDate: new Date().toISOString().slice(0, 10), shiftWindow: defaultShiftWindow,
    preparedBy, team: defaultTeam, coverage: "", health: "Stable" as ShiftHandoverHealth,
    summary: "", completedWork: "", pendingItems: "", blockers: "",
    escalations: "", nextShiftFocus: "", sharedContext: "",
  };
}

type SectionKey =
  | "summary"
  | "completed"
  | "progress"
  | "blockers"
  | "decisions"
  | "nextSteps"
  | "metrics"
  | "notes";

type OutputTemplate = "leadership" | "daily" | "client";
type DetailLevel = "concise" | "standard" | "detailed";

type FormatterOptions = {
  translateArabic: boolean;
  includeMetrics: boolean;
  includeNotes: boolean;
  includeTimestamp: boolean;
  includePreparedBy: boolean;
};

type TranslationResult = {
  translatedText: string;
  sourceLanguage: string;
  didTranslate: boolean;
};

type ParsedUpdate = Record<SectionKey, string[]>;

const DEFAULT_OPTIONS: FormatterOptions = {
  translateArabic: true,
  includeMetrics: true,
  includeNotes: true,
  includeTimestamp: true,
  includePreparedBy: true,
};

const EMPTY_PARSED_UPDATE: ParsedUpdate = {
  summary: [],
  completed: [],
  progress: [],
  blockers: [],
  decisions: [],
  nextSteps: [],
  metrics: [],
  notes: [],
};

const DEFAULT_REPORT_DATE = new Date().toISOString().slice(0, 10);

// SECTION_META
const SECTION_META: Array<{
  key: SectionKey;
  label: string;
  helper: string;
  icon: React.ElementType;
}> = [
  { key: "summary", label: "Summary", helper: "Core message", icon: Sparkles },
  { key: "completed", label: "Completed", helper: "Delivered items", icon: CheckCircle2 },
  { key: "progress", label: "In Progress", helper: "Active work", icon: ClipboardList },
  { key: "blockers", label: "Blockers", helper: "Risks or delays", icon: ShieldAlert },
  { key: "decisions", label: "Decisions Needed", helper: "Approvals or input", icon: CalendarDays },
  { key: "nextSteps", label: "Next Steps", helper: "What happens next", icon: WandSparkles },
  { key: "metrics", label: "Metrics", helper: "Numbers and KPIs", icon: LineChart },
  { key: "notes", label: "Notes", helper: "Context and reminders", icon: History },
];

// TEMPLATE_PRESETS
const TEMPLATE_PRESETS: Record<
  OutputTemplate,
  {
    title: string;
    subtitle: string;
    labels: Record<SectionKey, string>;
    sectionOrder: SectionKey[];
  }
> = {
  leadership: {
    title: "Leadership Brief",
    subtitle: "High-signal summary for management review",
    labels: {
      summary: "Executive Summary",
      completed: "Completed Work",
      progress: "Work In Progress",
      blockers: "Risks / Blockers",
      decisions: "Support Needed",
      nextSteps: "Next Actions",
      metrics: "Key Metrics",
      notes: "Additional Context",
    },
    sectionOrder: ["summary", "completed", "progress", "blockers", "decisions", "nextSteps", "metrics", "notes"],
  },
  daily: {
    title: "Daily Operations Update",
    subtitle: "Structured internal update for team handoff",
    labels: {
      summary: "Shift Summary",
      completed: "Completed",
      progress: "In Progress",
      blockers: "Blockers",
      decisions: "Approvals / Escalations",
      nextSteps: "Next Steps",
      metrics: "Operational Metrics",
      notes: "Notes",
    },
    sectionOrder: ["summary", "completed", "progress", "blockers", "nextSteps", "metrics", "decisions", "notes"],
  },
  client: {
    title: "Client Status Update",
    subtitle: "External-facing progress summary",
    labels: {
      summary: "Overview",
      completed: "Delivered",
      progress: "Current Status",
      blockers: "Open Items",
      decisions: "Pending Approvals",
      nextSteps: "Upcoming Actions",
      metrics: "Performance Snapshot",
      notes: "Additional Notes",
    },
    sectionOrder: ["summary", "completed", "progress", "metrics", "blockers", "decisions", "nextSteps", "notes"],
  },
};

const DETAIL_LIMITS: Record<DetailLevel, number> = {
  concise: 2,
  standard: 4,
  detailed: 8,
};

// HELPERS
function containsArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function splitTextForTranslation(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function requestTranslation(text: string) {
  const googleResponse = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`,
  );

  if (googleResponse.ok) {
    const payload = await googleResponse.json();
    const translatedText = Array.isArray(payload?.[0])
      ? payload[0].map((part: any[]) => part?.[0] || "").join("")
      : "";

    if (translatedText) {
      return {
        translatedText,
        sourceLanguage: payload?.[2] || "auto",
      } satisfies TranslateToEnglishResponse;
    }
  }

  const memoryResponse = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`,
  );
  const memoryPayload = (await memoryResponse.json()) as {
    error?: string;
    responseData?: { translatedText?: string; match?: number };
  };

  if (!memoryResponse.ok || !memoryPayload.responseData?.translatedText) {
    throw new Error(memoryPayload.error || "Translation failed.");
  }

  return {
    translatedText: memoryPayload.responseData.translatedText,
    sourceLanguage: memoryPayload.responseData.match ? "auto" : "unknown",
  } satisfies TranslateToEnglishResponse;
}

async function translateArabicContent(text: string): Promise<TranslationResult> {
  const chunks = splitTextForTranslation(text);

  if (!chunks.length) {
    return {
      translatedText: text,
      sourceLanguage: "auto",
      didTranslate: false,
    };
  }

  const translatedChunks: string[] = [];
  let sourceLanguage = "auto";
  let didTranslate = false;

  for (const chunk of chunks) {
    if (!containsArabic(chunk)) {
      translatedChunks.push(chunk);
      continue;
    }

    const payload = await requestTranslation(chunk);
    translatedChunks.push(payload.translatedText || chunk);
    sourceLanguage = payload.sourceLanguage || sourceLanguage;
    didTranslate = true;
  }

  return {
    translatedText: translatedChunks.join("\n"),
    sourceLanguage,
    didTranslate,
  };
}

function normalizeLine(line: string) {
  return line
    .replace(/^[\s\-*•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoLines(text: string) {
  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/[;|]+/g, "\n")
    .replace(/\n{2,}/g, "\n");

  const rawLines = normalized.includes("\n")
    ? normalized.split("\n")
    : normalized.split(/(?<=[.!?])\s+/);

  return rawLines.map(normalizeLine).filter(Boolean);
}

function stripLeadingKeyword(line: string) {
  return line.replace(
    /^(summary|completed|done|progress|ongoing|blockers?|issues?|risks?|next steps?|actions?|decisions?|metrics?|kpis?|notes?)\s*[:-]\s*/i,
    "",
  ).trim();
}

function parseStructuredUpdate(text: string) {
  const parsed: ParsedUpdate = {
    ...EMPTY_PARSED_UPDATE,
    summary: [],
    completed: [],
    progress: [],
    blockers: [],
    decisions: [],
    nextSteps: [],
    metrics: [],
    notes: [],
  };

  const lines = splitIntoLines(text);

  if (lines.length === 0) {
    return parsed;
  }

  lines.forEach((rawLine, index) => {
    const line = stripLeadingKeyword(rawLine);
    const normalized = rawLine.toLowerCase();

    if (
      index === 0 &&
      !/(done|completed|progress|ongoing|block|issue|risk|next|action|decision|approve|metric|kpi|note)/i.test(normalized)
    ) {
      parsed.summary.push(line);
      return;
    }

    if (/(summary|overview|headline|general update)/i.test(normalized)) {
      parsed.summary.push(line);
      return;
    }

    if (/(done|completed|closed|delivered|finished|sent|launched|resolved|shared|published|finalized|تم|خلص|اكتمل|انتهى)/i.test(normalized)) {
      parsed.completed.push(line);
      return;
    }

    if (/(progress|ongoing|in progress|working|underway|tracking|reviewing|pending execution|processing|following up)/i.test(normalized)) {
      parsed.progress.push(line);
      return;
    }

    if (/(block|issue|risk|delay|waiting|stuck|problem|hold|dependency|escalat|concern|مشكلة|تأخير|معطل)/i.test(normalized)) {
      parsed.blockers.push(line);
      return;
    }

    if (/(decision|approval|approve|sign off|input needed|client reply|owner decision|leadership)/i.test(normalized)) {
      parsed.decisions.push(line);
      return;
    }

    if (/(next|follow|action|todo|to do|will|tomorrow|plan|need to|next step|continue|resume|monitor)/i.test(normalized)) {
      parsed.nextSteps.push(line);
      return;
    }

    if (/\d|%|kpi|target|con|cov|sla|metric|volume|rate|count|coverage|achievement/i.test(normalized)) {
      parsed.metrics.push(line);
      return;
    }

    parsed.notes.push(line);
  });

  return parsed;
}

function limitLines(lines: string[], detailLevel: DetailLevel) {
  return lines.slice(0, DETAIL_LIMITS[detailLevel]);
}

function formatReadableDate(value: string) {
  if (!value) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildExecutiveSummary(parsed: ParsedUpdate, detailLevel: DetailLevel) {
  const overview = [
    `${parsed.completed.length} completed, ${parsed.progress.length} in progress, ${parsed.blockers.length} blockers, and ${parsed.nextSteps.length} next actions identified.`,
  ];

  if (parsed.summary.length > 0) {
    overview.push(...limitLines(parsed.summary, detailLevel === "concise" ? "concise" : "standard"));
  }

  return limitLines(overview, detailLevel);
}

function buildProfessionalOutput({
  detailLevel,
  options,
  parsed,
  preparedBy,
  reportDate,
  template,
  title,
}: {
  detailLevel: DetailLevel;
  options: FormatterOptions;
  parsed: ParsedUpdate;
  preparedBy: string;
  reportDate: string;
  template: OutputTemplate;
  title: string;
}) {
  const preset = TEMPLATE_PRESETS[template];
  const lines: string[] = [];
  const preparedTitle = title.trim() || buildUpdateTitle(parsed.summary[0] || parsed.notes[0] || "Structured Update");

  lines.push(preset.title.toUpperCase());
  lines.push(`Date: ${formatReadableDate(reportDate)}`);

  if (options.includeTimestamp) {
    lines.push(`Generated: ${new Date().toLocaleString("en-US")}`);
  }

  lines.push(`Subject: ${preparedTitle}`);

  if (options.includePreparedBy && preparedBy.trim()) {
    lines.push(`Prepared by: ${preparedBy.trim()}`);
  }

  lines.push("");

  preset.sectionOrder.forEach((sectionKey) => {
    if (sectionKey === "metrics" && !options.includeMetrics) {
      return;
    }

    if (sectionKey === "notes" && !options.includeNotes) {
      return;
    }

    const rawLines =
      sectionKey === "summary"
        ? buildExecutiveSummary(parsed, detailLevel)
        : limitLines(parsed[sectionKey], detailLevel);

    if (rawLines.length === 0) {
      return;
    }

    lines.push(preset.labels[sectionKey].toUpperCase());
    rawLines.forEach((line) => lines.push(`- ${line}`));
    lines.push("");
  });

  return lines.join("\n").trim();
}

// ── Rich format (emoji-enhanced for messaging platforms) ──────────────────────
const SECTION_EMOJI: Record<SectionKey, string> = {
  summary:   "📌",
  completed: "✅",
  progress:  "🔄",
  blockers:  "⚠️",
  decisions: "🔔",
  nextSteps: "➡️",
  metrics:   "📊",
  notes:     "💬",
};

function buildRichOutput({
  detailLevel,
  options,
  parsed,
  preparedBy,
  reportDate,
  template,
  title,
}: {
  detailLevel: DetailLevel;
  options: FormatterOptions;
  parsed: ParsedUpdate;
  preparedBy: string;
  reportDate: string;
  template: OutputTemplate;
  title: string;
}) {
  const preset = TEMPLATE_PRESETS[template];
  const lines: string[] = [];
  const preparedTitle = title.trim() || buildUpdateTitle(parsed.summary[0] || parsed.notes[0] || "Structured Update");
  const divider = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  lines.push(divider);
  lines.push(`📋 *${preset.title.toUpperCase()}*`);
  lines.push(divider);
  lines.push(`📅 Date: ${formatReadableDate(reportDate)}`);
  if (options.includeTimestamp) lines.push(`🕐 Generated: ${new Date().toLocaleString("en-US")}`);
  lines.push(`📌 Subject: *${preparedTitle}*`);
  if (options.includePreparedBy && preparedBy.trim()) lines.push(`👤 Prepared by: ${preparedBy.trim()}`);
  lines.push("");

  preset.sectionOrder.forEach((sectionKey) => {
    if (sectionKey === "metrics" && !options.includeMetrics) return;
    if (sectionKey === "notes" && !options.includeNotes) return;

    const rawLines =
      sectionKey === "summary"
        ? buildExecutiveSummary(parsed, detailLevel)
        : limitLines(parsed[sectionKey], detailLevel);

    if (rawLines.length === 0) return;

    const emoji = SECTION_EMOJI[sectionKey] || "•";
    lines.push(`${emoji} *${preset.labels[sectionKey].toUpperCase()}*`);
    rawLines.forEach((line) => lines.push(`  • ${line}`));
    lines.push("");
  });

  lines.push(divider);
  return lines.join("\n").trim();
}

async function copyToClipboard(value: string) {
  if (navigator?.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function downloadTextFile(filename: string, content: string) {
  if (!content.trim()) {
    return;
  }

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
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "output";
}

// MAIN_COMPONENT
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
  const defaultPreparedBy = ctx?.userName || ctx?.userEmail || "";

  // Handover state
  const savedHandovers = useMemo(
    () => normalizeShiftHandoverRecords(ctx?.shiftHandovers || []).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ), [ctx?.shiftHandovers]);
  const setShiftHandovers = ctx?.setShiftHandovers || (() => {});
  const defaultShiftWindow = organizerConfig.shiftWindows?.[0] ?? "General";
  const defaultTeam = organizerConfig.handoverTeams?.[0] ?? "Operations";
  const [handoverForm, setHandoverForm] = useState(() => getDefaultHandoverForm(defaultPreparedBy, defaultShiftWindow, defaultTeam));
  const [handoverEditingId, setHandoverEditingId] = useState<string | null>(null);
  const [handoverStatus, setHandoverStatus] = useState<string | null>(null);
  const [handoverHistorySearch, setHandoverHistorySearch] = useState('');

  const [activeTab, setActiveTab] = useState<'update' | 'handover'>('update');
  const [rawInput, setRawInput] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [preparedBy, setPreparedBy] = useState(defaultPreparedBy);
  const [reportDate, setReportDate] = useState(DEFAULT_REPORT_DATE);
  const [template, setTemplate] = useState<OutputTemplate>(organizerConfig.defaultTemplate as OutputTemplate);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(organizerConfig.defaultDetailLevel as DetailLevel);
  const [translatedInput, setTranslatedInput] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [showTranslationBadge, setShowTranslationBadge] = useState(false);
  const [options, setOptions] = useState<FormatterOptions>(DEFAULT_OPTIONS);
  const [outputStyle, setOutputStyle] = useState<'plain' | 'rich'>(organizerConfig.defaultOutputStyle as 'plain' | 'rich');
  const [historySearch, setHistorySearch] = useState("");
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const deferredWorkingInput = useDeferredValue(translatedInput || rawInput);
  const deferredHistorySearch = useDeferredValue(historySearch);
  const deferredHandoverHistorySearch = useDeferredValue(handoverHistorySearch);

  const workingInput = translatedInput || rawInput;

  // Handover helpers
  const broadcastPreview = useMemo(() => buildShiftHandoverBroadcast(handoverForm), [handoverForm]);
  const handoverStats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: savedHandovers.length,
      critical: savedHandovers.filter(h => h.health === 'Critical').length,
      today: savedHandovers.filter(h => new Date(h.createdAt).toDateString() === today).length,
    };
  }, [savedHandovers]);

  const updateHandoverField = (field: keyof typeof handoverForm, value: string) => {
    setHandoverForm(c => ({ ...c, [field]: value }));
  };
  const resetHandoverForm = () => { setHandoverForm(getDefaultHandoverForm(defaultPreparedBy, defaultShiftWindow, defaultTeam)); setHandoverEditingId(null); };
  const handleHandoverSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const record = createShiftHandoverRecord({
      ...handoverForm, id: handoverEditingId || undefined,
      preparedBy: handoverForm.preparedBy.trim() || defaultPreparedBy,
      broadcastSummary: broadcastPreview, updatedAt: now,
    });
    setShiftHandovers((current: ShiftHandoverRecord[]) => {
      const normalized = normalizeShiftHandoverRecords(current);
      return handoverEditingId ? normalized.map(h => h.id === handoverEditingId ? record : h) : [record, ...normalized];
    });
    setHandoverStatus(handoverEditingId ? 'Updated.' : 'Saved.');
    resetHandoverForm();
  };
  const loadHandover = (id: string) => {
    const r = savedHandovers.find(h => h.id === id);
    if (!r) return;
    setHandoverEditingId(r.id);
    setHandoverForm({
      title: r.title, shiftDate: r.shiftDate, shiftWindow: r.shiftWindow, preparedBy: r.preparedBy,
      team: r.team, coverage: r.coverage, health: r.health, summary: r.summary,
      completedWork: r.completedWork, pendingItems: r.pendingItems, blockers: r.blockers,
      escalations: r.escalations, nextShiftFocus: r.nextShiftFocus, sharedContext: r.sharedContext,
    });
  };
  const deleteHandover = (id: string) => {
    setShiftHandovers((current: ShiftHandoverRecord[]) => normalizeShiftHandoverRecords(current).filter(h => h.id !== id));
    if (handoverEditingId === id) resetHandoverForm();
  };
  const copyText = async (value: string, label: string) => {
    if (!value.trim() || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(value);
    setHandoverStatus(`${label} copied.`);
  };
  const filteredHandovers = useMemo(() => {
    if (!deferredHandoverHistorySearch.trim()) return savedHandovers;
    const q = deferredHandoverHistorySearch.toLowerCase();
    return savedHandovers.filter(h =>
      [h.title, h.summary, h.preparedBy, h.team, h.shiftWindow, h.blockers].join(' ').toLowerCase().includes(q),
    );
  }, [savedHandovers, deferredHandoverHistorySearch]);

  const parsedPreview = useMemo(() => parseStructuredUpdate(deferredWorkingInput), [deferredWorkingInput]);

  const filteredHistory = useMemo(() => {
    const ranged = filterByDateRange(organizedUpdates, dateRange, (item) => item.createdAt);
    const searchValue = deferredHistorySearch.trim().toLowerCase();

    if (!searchValue) {
      return ranged;
    }

    return ranged.filter((item) =>
      [item.title, item.rawInput, item.translatedInput, item.organizedOutput]
        .join(" ")
        .toLowerCase()
        .includes(searchValue),
    );
  }, [dateRange, deferredHistorySearch, organizedUpdates]);

  const stats = useMemo(() => {
    const translated = filteredHistory.filter((item) => item.translatedInput).length;
    const savedToday = filteredHistory.filter((item) => {
      const today = new Date().toDateString();
      return new Date(item.createdAt).toDateString() === today;
    }).length;

    return {
      total: filteredHistory.length,
      translated,
      savedToday,
    };
  }, [filteredHistory]);

  const sectionCounts = useMemo(
    () =>
      SECTION_META.map((section) => ({
        ...section,
        count: parsedPreview[section.key].length,
      })),
    [parsedPreview],
  );

  const autoTitle = useMemo(
    () => reportTitle.trim() || buildUpdateTitle(workingInput || "Structured Update"),
    [reportTitle, workingInput],
  );

  const quickActions = useMemo(() => {
    const actions: Array<{ id: string; label: string; apply: () => void }> = [];

    if (!reportTitle.trim() && autoTitle) {
      actions.push({
        id: "title",
        label: `Use title: ${autoTitle}`,
        apply: () => setReportTitle(autoTitle),
      });
    }

    if (parsedPreview.metrics.length >= 2 && !options.includeMetrics) {
      actions.push({
        id: "metrics",
        label: "Turn metrics back on",
        apply: () => setOptions((current) => ({ ...current, includeMetrics: true })),
      });
    }

    if (parsedPreview.blockers.length > 0 && template === "client") {
      actions.push({
        id: "leadership",
        label: "Switch to leadership brief",
        apply: () => setTemplate("leadership"),
      });
    }

    if (parsedPreview.summary.length === 0 && parsedPreview.notes.length >= 2) {
      actions.push({
        id: "daily",
        label: "Use daily ops template",
        apply: () => setTemplate("daily"),
      });
    }

    return actions.slice(0, 3);
  }, [autoTitle, options.includeMetrics, parsedPreview.blockers.length, parsedPreview.metrics.length, parsedPreview.notes.length, parsedPreview.summary.length, reportTitle, template]);

  const handoverQuickFill = useMemo(
    () => [
      {
        id: "stable",
        label: "Stable shift",
        apply: () =>
          setHandoverForm((current) => ({
            ...current,
            health: "Stable",
            summary: current.summary || "Shift remained stable with core operations cleared and no major escalations.",
            nextShiftFocus: current.nextShiftFocus || "Continue current priorities, monitor pending items, and close remaining follow-ups.",
          })),
      },
      {
        id: "risk",
        label: "Risk handover",
        apply: () =>
          setHandoverForm((current) => ({
            ...current,
            health: "Watch",
            blockers: current.blockers || "Pending approvals, delayed responses, or dependencies may affect the next shift.",
            escalations: current.escalations || "Leadership visibility may be required if delays continue into the next shift.",
          })),
      },
      {
        id: "critical",
        label: "Critical escalation",
        apply: () =>
          setHandoverForm((current) => ({
            ...current,
            health: "Critical",
            summary: current.summary || "Critical operational issues require immediate attention at the start of the next shift.",
            escalations: current.escalations || "Immediate decision or owner intervention is needed.",
          })),
      },
    ],
    [],
  );

  const handleFormat = async () => {
    if (!rawInput.trim()) {
      setStatusMessage("Paste the rough update first.");
      return null;
    }

    setIsFormatting(true);
    setStatusMessage(null);

    try {
      let textToFormat = rawInput.trim();
      let nextTranslatedInput = "";
      let nextSourceLanguage = "auto";
      let didTranslate = false;

      if (options.translateArabic && containsArabic(textToFormat)) {
        const translation = await translateArabicContent(textToFormat);
        textToFormat = translation.translatedText || textToFormat;
        nextTranslatedInput = translation.didTranslate ? translation.translatedText : "";
        nextSourceLanguage = translation.sourceLanguage || "auto";
        didTranslate = translation.didTranslate;
      }

      const parsed = parseStructuredUpdate(textToFormat);
      const buildFn = outputStyle === 'rich' ? buildRichOutput : buildProfessionalOutput;
      const nextOutput = buildFn({
        detailLevel,
        options,
        parsed,
        preparedBy,
        reportDate,
        template,
        title: reportTitle,
      });

      setFormattedOutput(nextOutput);
      setTranslatedInput(nextTranslatedInput);
      setSourceLanguage(nextSourceLanguage);
      setShowTranslationBadge(didTranslate);
      setStatusMessage("Professional update generated.");

      return {
        output: nextOutput,
        translatedInput: nextTranslatedInput,
        sourceLanguage: nextSourceLanguage,
      };
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Formatting failed.");
      return null;
    } finally {
      setIsFormatting(false);
    }
  };

  const handleSave = async () => {
    if (!rawInput.trim()) {
      setStatusMessage("Nothing to save yet.");
      return;
    }

    let nextOutput = formattedOutput.trim();
    let nextTranslatedInput = translatedInput.trim();
    let nextSourceLanguage = sourceLanguage;

    if (!nextOutput) {
      const result = await handleFormat();
      if (!result) {
        return;
      }

      nextOutput = result.output;
      nextTranslatedInput = result.translatedInput;
      nextSourceLanguage = result.sourceLanguage;
    }

    const record = createOrganizedUpdateRecord({
      title: autoTitle,
      rawInput,
      translatedInput: nextTranslatedInput,
      organizedOutput: nextOutput,
      sourceLanguage: nextSourceLanguage,
    });

    setOrganizedUpdates((current: typeof organizedUpdates) => [
      record,
      ...normalizeOrganizedUpdateRecords(current),
    ]);

    setStatusMessage("Structured update saved.");
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value.trim()) {
      setStatusMessage(`${label} is empty.`);
      return;
    }

    try {
      await copyToClipboard(value);
      setStatusMessage(`${label} copied.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Failed to copy ${label.toLowerCase()}.`);
    }
  };

  const handleLoad = (id: string) => {
    const record = organizedUpdates.find((item) => item.id === id);
    if (!record) {
      return;
    }

    setReportTitle(record.title);
    setRawInput(record.rawInput);
    setTranslatedInput(record.translatedInput);
    setFormattedOutput(record.organizedOutput);
    setSourceLanguage(record.sourceLanguage || "auto");
    setShowTranslationBadge(Boolean(record.translatedInput));
    setStatusMessage(`Loaded ${record.title}.`);
  };

  const handleDelete = (id: string) => {
    setOrganizedUpdates((current: typeof organizedUpdates) =>
      normalizeOrganizedUpdateRecords(current).filter((item) => item.id !== id),
    );
    setStatusMessage("Saved update removed.");
  };

  const resetComposer = () => {
    setRawInput("");
    setReportTitle("");
    setTranslatedInput("");
    setFormattedOutput("");
    setSourceLanguage("auto");
    setShowTranslationBadge(false);
    setStatusMessage("Composer cleared.");
  };

  const activeModeMeta = activeTab === "update"
    ? {
        eyebrow: "Structured Messaging",
        title: "Turn rough notes into leadership-ready outputs",
        description: "Parse noisy updates, shape the story, and export polished outputs with faster review and better consistency.",
        plans: [
          { label: "Current mode", value: "Update composer" },
          { label: "Best for", value: "Leadership, daily ops, client briefs" },
          { label: "Output flow", value: "Raw input -> parsed sections -> final message" },
        ],
      }
    : {
        eyebrow: "Shift Briefing",
        title: "Build cleaner handovers for the next shift",
        description: "Capture status, risks, and next actions in one briefing surface so the next team starts with context instead of guesswork.",
        plans: [
          { label: "Current mode", value: "Handover briefing" },
          { label: "Best for", value: "Shift changes and cross-team continuity" },
          { label: "Output flow", value: "Form input -> broadcast preview -> saved history" },
        ],
      };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-6">
      <section className="app-hero-panel rounded-[var(--app-card-radius)] border p-6 md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="app-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
              {activeTab === "update" ? <WandSparkles className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
              {activeModeMeta.eyebrow}
            </div>
            <h1 className="app-hero-title mt-4 text-3xl font-black tracking-tight md:text-4xl">
              {activeModeMeta.title}
            </h1>
            <p className="app-hero-copy mt-2 text-sm leading-6 md:text-base">
              {activeModeMeta.description}
            </p>
          </div>

          <div className="w-full max-w-[520px] space-y-3">
            <div className="app-control-surface flex items-center gap-1 rounded-2xl border p-1.5">
              <button
                onClick={() => setActiveTab('update')}
                className={`flex-1 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition-all ${activeTab === 'update' ? 'app-accent-button' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                <WandSparkles className="mr-1.5 inline h-3.5 w-3.5" />
                Updates
              </button>
              <button
                onClick={() => setActiveTab('handover')}
                className={`flex-1 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition-all ${activeTab === 'handover' ? 'app-accent-button' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                <MessageCircle className="mr-1.5 inline h-3.5 w-3.5" />
                Handover
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {activeModeMeta.plans.map((item) => (
                <MiniPlan key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeroStat label="Saved Updates" value={stats.total} />
        <HeroStat label="Translated" value={stats.translated} />
        <HeroStat label="Handovers" value={handoverStats.total} />
        <HeroStat label="Today" value={stats.savedToday + handoverStats.today} />
      </section>

        {activeTab === 'update' ? (
        <>
        {/* COMPOSER + PREVIEW */}
        <section className="grid gap-6 xl:grid-cols-[1.02fr,0.98fr]">
          <div className="app-panel overflow-hidden rounded-[var(--app-card-radius)] border">
            <div className="app-shell-divider border-b px-5 py-5 sm:px-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="app-hero-chip rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                  Composer
                </span>
                <span className="rounded-full border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--muted)/0.72)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Ctrl/Cmd + Enter to build
                </span>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <Field label="Report Title" className="flex-1">
                  <input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} placeholder="Night shift campaign delivery update" className={inputClassName} />
                </Field>
                <Field label="Prepared By" className="lg:w-56">
                  <input value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} placeholder="Operations Lead" className={inputClassName} />
                </Field>
                <Field label="Report Date" className="lg:w-56">
                  <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className={inputClassName} />
                </Field>
              </div>
            </div>

            <div className="app-shell-divider border-b bg-[hsl(var(--muted)/0.52)] px-5 py-5 sm:px-6">
              <div className="grid gap-3 lg:grid-cols-3">
                {(Object.keys(TEMPLATE_PRESETS) as OutputTemplate[]).map((presetKey) => {
                  const preset = TEMPLATE_PRESETS[presetKey];
                  const isActive = template === presetKey;

                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setTemplate(presetKey)}
                      className={`rounded-[1.5rem] border p-4 text-left transition-all ${
                        isActive
                          ? "app-accent-button border-[rgba(var(--app-primary-rgb),0.4)] shadow-lg"
                          : "app-control-surface text-zinc-700 hover:border-[rgba(var(--app-primary-rgb),0.18)] hover:bg-[hsl(var(--muted)/0.7)] dark:text-zinc-200"
                      }`}
                    >
                      <div className="text-sm font-black">{preset.title}</div>
                      <div className={`mt-2 text-xs ${isActive ? "text-[rgba(var(--app-primary-contrast-rgb),0.76)]" : "text-zinc-500 dark:text-zinc-400"}`}>{preset.subtitle}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(["concise", "standard", "detailed"] as DetailLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDetailLevel(level)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                      detailLevel === level
                        ? "app-accent-button"
                        : "app-control-surface text-zinc-500 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="app-shell-divider border-b px-5 py-5 sm:px-6">
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                <Languages className="h-4 w-4" />
                Composer Options
              </label>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <OptionToggle checked={options.translateArabic} label="Arabic To English" onChange={(checked) => setOptions((current) => ({ ...current, translateArabic: checked }))} />
                <OptionToggle checked={options.includeMetrics} label="Include Metrics" onChange={(checked) => setOptions((current) => ({ ...current, includeMetrics: checked }))} />
                <OptionToggle checked={options.includeNotes} label="Include Notes" onChange={(checked) => setOptions((current) => ({ ...current, includeNotes: checked }))} />
                <OptionToggle checked={options.includeTimestamp} label="Include Generated Time" onChange={(checked) => setOptions((current) => ({ ...current, includeTimestamp: checked }))} />
                <OptionToggle checked={options.includePreparedBy} label="Include Prepared By" onChange={(checked) => setOptions((current) => ({ ...current, includePreparedBy: checked }))} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Output Style</span>
                <div className="app-control-surface flex items-center gap-1 rounded-lg border p-0.5">
                  {(['plain', 'rich'] as const).map(style => (
                    <button key={style} type="button" onClick={() => setOutputStyle(style)}
                      className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all ${
                        outputStyle === style
                          ? 'app-accent-button'
                          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}>
                      {style === 'rich' ? '✨ Rich (Emoji)' : '📄 Plain Text'}
                    </button>
                  ))}
                </div>
                {outputStyle === 'rich' && (
                  <span className="text-[10px] text-zinc-400">Formatted for Slack, Teams, WhatsApp</span>
                )}
              </div>
              {quickActions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.apply}
                      className="app-control-surface rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:bg-[hsl(var(--muted)/0.72)] dark:text-zinc-300"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-5 sm:px-6">
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                <WandSparkles className="h-4 w-4" />
                Raw Notes
              </label>
              <textarea
                value={rawInput}
                onChange={(event) => {
                  setRawInput(event.target.value);
                  setTranslatedInput("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    void handleFormat();
                  }
                }}
                className={`${inputClassName} min-h-[340px] resize-y px-4 py-4`}
                placeholder="Paste the rough update here. Example:

Done:
- Client confirmed 14 creators
- Coverage backlog reduced by 22 rows

In progress:
- Waiting for final approvals on KSA branch

Blockers:
- One creator still missing posting time

Next steps:
- Send final tracker by 6 PM"
              />

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => void handleFormat()} disabled={isFormatting} className="app-accent-button inline-flex w-full items-center justify-center gap-3 rounded-[1.5rem] px-5 py-4 text-sm font-black transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70">
                  {isFormatting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Build Professional Output
                </button>
                <button onClick={handleSave} disabled={isFormatting} className="app-control-surface inline-flex w-full items-center justify-center gap-3 rounded-[1.5rem] border px-5 py-4 text-sm font-black text-zinc-700 transition-all hover:bg-[hsl(var(--muted)/0.72)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto dark:text-zinc-200">
                  <Save className="h-5 w-5" />
                  Save
                </button>
                <button onClick={resetComposer} className="app-control-surface inline-flex w-full items-center justify-center gap-3 rounded-[1.5rem] border px-5 py-4 text-sm font-black text-zinc-600 transition-all hover:bg-[hsl(var(--muted)/0.72)] sm:w-auto dark:text-zinc-300">
                  Clear
                </button>
              </div>

              {statusMessage && (
                <div className="app-control-surface mt-4 rounded-[1.25rem] border px-4 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="app-panel overflow-hidden rounded-[var(--app-card-radius)] border">
              <div className="app-shell-divider border-b px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Structured Preview</div>
                    <div className="mt-2 text-2xl font-black text-zinc-950 dark:text-zinc-100">Parsed sections before export</div>
                  </div>
                  <div className="app-control-surface rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-300">
                    {sectionCounts.reduce((sum, section) => sum + section.count, 0)} items detected
                  </div>
                </div>
              </div>

              <div className="grid gap-3 px-5 py-5 sm:px-6 md:grid-cols-2">
                {sectionCounts.map((section) => (
                  <SectionPreviewCard key={section.key} count={section.count} helper={section.helper} icon={section.icon} label={section.label} lines={parsedPreview[section.key]} />
                ))}
              </div>
            </section>

            <section className="app-panel overflow-hidden rounded-[var(--app-card-radius)] border">
              <div className="app-shell-divider border-b px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Final Output</div>
                    <div className="mt-2 text-2xl font-black text-zinc-950 dark:text-zinc-100">{TEMPLATE_PRESETS[template].title}</div>
                  </div>
                  <button onClick={() => void handleCopy(formattedOutput, "Formatted output")} className="app-accent-button inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:opacity-95">
                    <Copy className="h-4 w-4" />
                    Copy Output
                  </button>
                  <button
                    onClick={() => downloadTextFile(`${sanitizeFileName(autoTitle)}-${template}.txt`, formattedOutput)}
                    className="app-control-surface inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-[hsl(var(--muted)/0.72)] dark:text-zinc-200"
                  >
                    <Download className="h-4 w-4" />
                    Export TXT
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <div className="app-control-surface min-h-[340px] whitespace-pre-wrap rounded-[1.5rem] border p-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formattedOutput || <span className="text-zinc-400">Generate the update to preview the professional output here.</span>}
                </div>

                {showTranslationBadge && (
                  <div className="mt-4 rounded-[1.25rem] border border-zinc-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-zinc-800 dark:bg-amber-950/30 dark:text-amber-200">
                    Arabic content was translated into English before formatting.
                  </div>
                )}

                {translatedInput && (
                  <div className="app-control-surface mt-4 rounded-[1.5rem] border p-4">
                    <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Translated Draft</div>
                    <div className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{translatedInput}</div>
                    <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Source language: {sourceLanguage}</div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="app-panel overflow-hidden rounded-[var(--app-card-radius)] border">
          <div className="app-shell-divider border-b px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                  <History className="h-4 w-4" />
                  Saved Output Library
                </div>
                <div className="mt-2 text-2xl font-black text-zinc-950 dark:text-zinc-100">Searchable structured update history</div>
              </div>

              <div className="app-control-surface w-full max-w-md rounded-2xl border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="Search titles or saved content"
                    className="w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <DateRangeFilter label="Saved Reports Date Range" value={dateRange} onChange={setDateRange} />

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredHistory.length > 0 ? (
                filteredHistory.slice(0, organizerConfig.maxHistoryItems).map((item) => (
                  <article key={item.id} className="app-control-surface rounded-[1.5rem] border p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                        <h3 className="mt-2 truncate text-lg font-black text-zinc-950 dark:text-zinc-100">
                          {item.title}
                        </h3>
                        <div className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                          {item.organizedOutput}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => handleLoad(item.id)} className={historyButtonClassName}>Load</button>
                        <button onClick={() => void handleCopy(item.organizedOutput, "Saved output")} className={historyIconButtonClassName}>
                          <Copy className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className={historyIconButtonClassName}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {item.translatedInput && (
                      <div className="app-panel mt-4 rounded-[1.25rem] border p-4">
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Translated Draft</div>
                        <div className="line-clamp-4 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                          {item.translatedInput}
                        </div>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-[rgba(var(--app-primary-rgb),0.16)] bg-[hsl(var(--muted)/0.52)] p-10 text-center xl:col-span-2">
                  <h3 className="text-lg font-black text-zinc-950 dark:text-zinc-100">No saved outputs match the current filters</h3>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Generate and save an update, or adjust the search and date range.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        </>
        ) : (
          /* ── HANDOVER TAB ── */
          <>
            <section className="grid gap-5 xl:grid-cols-[1.04fr,0.96fr]">
              {/* Left: Handover Form */}
              <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Compose Shift Handover</h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Capture completed work, live risks, and the next-shift plan in one briefing.</p>
                  </div>
                  <span className="app-hero-chip rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                    Briefing Form
                  </span>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {handoverQuickFill.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={preset.apply}
                      className="app-control-surface rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:bg-[hsl(var(--muted)/0.72)] dark:text-zinc-300"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleHandoverSubmit} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Handover Title"><input required value={handoverForm.title} onChange={e => updateHandoverField('title', e.target.value)} className={inputClassName} placeholder="Night Shift Handover" /></Field>
                    <Field label="Shift Date"><input type="date" required value={handoverForm.shiftDate} onChange={e => updateHandoverField('shiftDate', e.target.value)} className={inputClassName} /></Field>
                    <Field label="Shift Window">
                      <select value={handoverForm.shiftWindow} onChange={e => updateHandoverField('shiftWindow', e.target.value)} className={inputClassName}>
                        {(organizerConfig.shiftWindows ?? ['General']).map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </Field>
                    <Field label="Team">
                      <select value={handoverForm.team} onChange={e => updateHandoverField('team', e.target.value)} className={inputClassName}>
                        {(organizerConfig.handoverTeams ?? ['Operations']).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Prepared By"><input value={handoverForm.preparedBy} onChange={e => updateHandoverField('preparedBy', e.target.value)} className={inputClassName} /></Field>
                    <Field label="Coverage / Hours"><input value={handoverForm.coverage} onChange={e => updateHandoverField('coverage', e.target.value)} className={inputClassName} placeholder="6 PM - 2 AM" /></Field>
                  </div>
                  <Field label="Shift Health">
                    <div className="grid grid-cols-3 gap-2">
                      {(['Stable', 'Watch', 'Critical'] as ShiftHandoverHealth[]).map(h => {
                        const active = handoverForm.health === h;
                        const color = h === 'Critical'
                          ? active ? 'bg-rose-500 text-white border-rose-500' : 'border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                          : h === 'Watch'
                          ? active ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-200 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          : active ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20';
                        return (
                          <button key={h} type="button" onClick={() => setHandoverForm(c => ({ ...c, health: h }))}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition-all border ${color}`}>
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Summary"><textarea required value={handoverForm.summary} onChange={e => updateHandoverField('summary', e.target.value)} className={`${inputClassName} min-h-[100px] resize-y`} placeholder="What happened this shift" /></Field>
                    <Field label="Completed Work"><textarea value={handoverForm.completedWork} onChange={e => updateHandoverField('completedWork', e.target.value)} className={`${inputClassName} min-h-[100px] resize-y`} placeholder="Tasks done, resolved issues" /></Field>
                    <Field label="Pending Items"><textarea value={handoverForm.pendingItems} onChange={e => updateHandoverField('pendingItems', e.target.value)} className={`${inputClassName} min-h-[100px] resize-y`} placeholder="Still in progress" /></Field>
                    <Field label="Blockers / Risks"><textarea value={handoverForm.blockers} onChange={e => updateHandoverField('blockers', e.target.value)} className={`${inputClassName} min-h-[100px] resize-y`} placeholder="Delays, risks" /></Field>
                    <Field label="Escalations"><textarea value={handoverForm.escalations} onChange={e => updateHandoverField('escalations', e.target.value)} className={`${inputClassName} min-h-[100px] resize-y`} placeholder="Decisions needed" /></Field>
                    <Field label="Next Shift Focus"><textarea value={handoverForm.nextShiftFocus} onChange={e => updateHandoverField('nextShiftFocus', e.target.value)} className={`${inputClassName} min-h-[100px] resize-y`} placeholder="Priority for next shift" /></Field>
                  </div>
                  <Field label="Shared Context"><textarea value={handoverForm.sharedContext} onChange={e => updateHandoverField('sharedContext', e.target.value)} className={`${inputClassName} min-h-[80px] resize-y`} placeholder="Team-wide context, reminders" /></Field>
                  {handoverStatus && <div className="app-control-surface rounded-lg border px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">{handoverStatus}</div>}
                  <div className="flex gap-2">
                    <button type="submit" className="app-accent-button rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95">
                      <CheckCircle2 className="w-4 h-4 inline mr-1.5" />{handoverEditingId ? 'Update' : 'Save'} Handover
                    </button>
                    <button type="button" onClick={() => copyText(broadcastPreview, 'Broadcast')} className="app-control-surface rounded-xl border px-4 py-2.5 text-sm font-bold text-zinc-600 transition-all hover:bg-[hsl(var(--muted)/0.72)] dark:text-zinc-300">
                      <Copy className="w-4 h-4 inline mr-1.5" />Copy Summary
                    </button>
                    {handoverEditingId && <button type="button" onClick={resetHandoverForm} className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Cancel</button>}
                  </div>
                </form>
              </div>

              {/* Right: Broadcast Preview */}
              <div className="space-y-5">
              <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Broadcast Preview</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyText(broadcastPreview, 'Summary')} className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"><Copy className="w-3.5 h-3.5 inline mr-1" />Copy</button>
                    <button onClick={() => downloadTextFile(`${sanitizeFileName(handoverForm.title || "shift-handover")}.txt`, broadcastPreview)} className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"><Download className="w-3.5 h-3.5 inline mr-1" />Export</button>
                  </div>
                </div>
                <div className="app-control-surface rounded-lg border p-4 min-h-[300px]">
                  <div className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{broadcastPreview}</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <MiniPlan label="Critical handovers" value={`${handoverStats.critical}`} />
                <MiniPlan label="Saved today" value={`${handoverStats.today}`} />
                <MiniPlan label="Default team" value={defaultTeam} />
              </div>
              </div>
            </section>

            {/* Handover History */}
            <section className="app-panel rounded-[var(--app-card-radius)] border p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Saved Handovers</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">{savedHandovers.length} total · {handoverStats.critical} critical · {handoverStats.today} today</p>
                </div>
                <label className="app-control-surface flex w-full items-center gap-2 rounded-lg border px-3 py-2 sm:w-auto sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input value={handoverHistorySearch} onChange={e => setHandoverHistorySearch(e.target.value)}
                    placeholder="Search handovers..."
                    className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400" />
                </label>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {filteredHandovers.length > 0 ? filteredHandovers.slice(0, organizerConfig.maxHistoryItems).map(item => (
                  <article key={item.id} className="app-control-surface rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${item.health === 'Critical' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : item.health === 'Watch' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>{item.health}</span>
                          <span className="text-[10px] text-zinc-400">{item.shiftWindow} · {item.team}</span>
                        </div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">{item.title}</h3>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.summary || 'No summary'}</p>
                        <div className="flex gap-3 text-[10px] text-zinc-400 mt-2">
                          <span>By: {item.preparedBy || '–'}</span>
                          <span>{item.shiftDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => loadHandover(item.id)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">Load</button>
                        <button onClick={() => copyText(item.broadcastSummary, 'Handover')} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"><Copy className="w-3 h-3" /></button>
                        <button onClick={() => deleteHandover(item.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="col-span-2 py-10 text-center">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {handoverHistorySearch ? 'No handovers match your search' : 'No handovers saved yet'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {handoverHistorySearch ? 'Try different keywords.' : 'Complete and save a shift handover above.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
    </div>
  );
}

// SUB_COMPONENTS
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

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="app-panel rounded-[1.5rem] border p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-zinc-950 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function MiniPlan({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-control-surface rounded-[1.25rem] border p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function OptionToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm font-bold transition-all ${
        checked
          ? "app-accent-button border-[rgba(var(--app-primary-rgb),0.45)]"
          : "app-control-surface text-zinc-600 dark:text-zinc-300"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded accent-current" />
      <span>{label}</span>
    </label>
  );
}

function SectionPreviewCard({
  count,
  helper,
  icon: Icon,
  label,
  lines,
}: {
  count: number;
  helper: string;
  icon: React.ElementType;
  label: string;
  lines: string[];
}) {
  return (
    <div className="app-control-surface rounded-[1.5rem] border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="app-panel rounded-2xl border p-3 text-zinc-700 shadow-sm dark:text-zinc-200">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-black text-zinc-950 dark:text-zinc-100">{label}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{helper}</div>
          </div>
        </div>
        <div className="app-panel rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-300">
          {count}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {lines.length > 0 ? (
          lines.slice(0, 3).map((line, index) => (
            <div key={`${label}-${index}`} className="app-panel rounded-xl border px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300">
              {line}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[rgba(var(--app-primary-rgb),0.14)] bg-[hsl(var(--muted)/0.52)] px-3 py-3 text-sm text-zinc-400 dark:text-zinc-500">
            Nothing detected yet.
          </div>
        )}
      </div>
    </div>
  );
}

const inputClassName =
  "app-input w-full rounded-2xl px-4 py-3 text-sm font-medium";

const historyButtonClassName =
  "app-control-surface rounded-xl border px-3 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-[hsl(var(--muted)/0.72)] dark:text-zinc-200";

const historyIconButtonClassName =
  "app-control-surface rounded-xl border p-2 text-zinc-500 transition-colors hover:bg-[hsl(var(--muted)/0.72)] dark:text-zinc-300";
