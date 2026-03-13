"use client";

import React, { useContext, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  FileText,
  History,
  Languages,
  Loader2,
  Save,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { AppContext } from "./Root";
import { FeatureGate } from "./FeatureGate";
import type { TranslateToEnglishResponse } from "../lib/api";
import {
  buildUpdateTitle,
  createOrganizedUpdateRecord,
  normalizeOrganizedUpdateRecords,
} from "../lib/workspaceTools";

type FormatterOptions = {
  addEmojis: boolean;
  addBullets: boolean;
  addSections: boolean;
  addSpacing: boolean;
  translateArabic: boolean;
};

type TranslationResult = {
  translatedText: string;
  sourceLanguage: string;
  didTranslate: boolean;
};

const DEFAULT_OPTIONS: FormatterOptions = {
  addEmojis: true,
  addBullets: true,
  addSections: true,
  addSpacing: true,
  translateArabic: true,
};

const SECTION_EMOJIS: Record<string, string> = {
  completed: "[done]",
  done: "[done]",
  finished: "[done]",
  pending: "[pending]",
  waiting: "[pending]",
  progress: "[progress]",
  ongoing: "[progress]",
  issue: "[issue]",
  problem: "[issue]",
  blocked: "[blocked]",
  urgent: "[urgent]",
  important: "[important]",
  meeting: "[meeting]",
  call: "[call]",
  email: "[email]",
  update: "[update]",
  note: "[note]",
  reminder: "[reminder]",
  task: "[task]",
  deadline: "[deadline]",
  review: "[review]",
  approved: "[approved]",
  rejected: "[rejected]",
  question: "[question]",
  answer: "[answer]",
  team: "[team]",
  client: "[client]",
  budget: "[budget]",
  goal: "[goal]",
  success: "[success]",
  risk: "[risk]",
};

const DISPLAY_EMOJIS: Record<string, string> = {
  "[done]": "✅",
  "[pending]": "⏳",
  "[progress]": "🔄",
  "[issue]": "⚠️",
  "[blocked]": "🚫",
  "[urgent]": "🔴",
  "[important]": "❗",
  "[meeting]": "📅",
  "[call]": "📞",
  "[email]": "📧",
  "[update]": "📢",
  "[note]": "📝",
  "[reminder]": "🔔",
  "[task]": "📋",
  "[deadline]": "⏰",
  "[review]": "🔍",
  "[approved]": "👍",
  "[rejected]": "👎",
  "[question]": "❓",
  "[answer]": "💬",
  "[team]": "👥",
  "[client]": "🤝",
  "[budget]": "💰",
  "[goal]": "🎯",
  "[success]": "🎉",
  "[risk]": "⚡",
};

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

function withEmoji(token: string, enabled: boolean) {
  return enabled ? DISPLAY_EMOJIS[token] || token : "";
}

function formatReport(text: string, options: FormatterOptions) {
  if (!text.trim()) {
    return "";
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const formattedLines: string[] = [];

  for (const line of lines) {
    let processedLine = line;
    let detectedEmoji = "";

    if (options.addSections) {
      for (const [keyword, token] of Object.entries(SECTION_EMOJIS)) {
        if (line.toLowerCase().includes(keyword)) {
          detectedEmoji = withEmoji(token, options.addEmojis);
          break;
        }
      }
    }

    const isHeader =
      line.length < 50 &&
      (line.endsWith(":") ||
        line.toUpperCase() === line ||
        (/^[A-Z]/.test(line) && !line.includes(" ")) ||
        line.split(" ").length <= 4);

    if (isHeader && options.addSections) {
      if (options.addSpacing && formattedLines.length > 0) {
        formattedLines.push("");
      }

      const cleanHeader = line.replace(/:$/, "");
      const prefix = options.addEmojis ? detectedEmoji || "📌" : "";
      formattedLines.push([prefix, `*${cleanHeader}*`].filter(Boolean).join(" "));
      continue;
    }

    if (
      options.addBullets &&
      !line.startsWith("•") &&
      !line.startsWith("-") &&
      !line.startsWith("*") &&
      !line.match(/^\d+\./)
    ) {
      processedLine = `• ${line}`;
    } else if (line.startsWith("-")) {
      processedLine = line.replace(/^-\s*/, "• ");
    }

    if (options.addEmojis && !isHeader && detectedEmoji && !processedLine.includes(detectedEmoji)) {
      processedLine = processedLine.startsWith("• ")
        ? `• ${detectedEmoji} ${processedLine.slice(2)}`
        : `${detectedEmoji} ${processedLine}`;
    }

    formattedLines.push(processedLine);
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const result: string[] = [];

  if (options.addEmojis) {
    result.push("📊 *REPORT UPDATE*");
    result.push(`📅 ${today}`);
  } else {
    result.push("*REPORT UPDATE*");
    result.push(today);
  }

  result.push("--------------------");

  if (options.addSpacing) {
    result.push("");
  }

  result.push(...formattedLines);

  if (options.addSpacing) {
    result.push("");
  }

  result.push("--------------------");
  result.push(options.addEmojis ? "📤 _End of Report_" : "_End of Report_");

  return result.join("\n");
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

export function UpdateOrganizer() {
  return (
    <FeatureGate featureId="update-organizer">
      <UpdateOrganizerContent />
    </FeatureGate>
  );
}

function UpdateOrganizerContent() {
  const ctx = useContext(AppContext);
  const organizedUpdates = normalizeOrganizedUpdateRecords(ctx?.organizedUpdates || []);
  const setOrganizedUpdates = ctx?.setOrganizedUpdates || (() => {});

  const [rawInput, setRawInput] = useState("");
  const [translatedInput, setTranslatedInput] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [showTranslationBadge, setShowTranslationBadge] = useState(false);
  const [options, setOptions] = useState<FormatterOptions>(DEFAULT_OPTIONS);

  const stats = useMemo(() => {
    const translated = organizedUpdates.filter((item) => item.translatedInput).length;
    const savedToday = organizedUpdates.filter((item) => {
      const today = new Date().toDateString();
      return new Date(item.createdAt).toDateString() === today;
    }).length;

    return {
      total: organizedUpdates.length,
      translated,
      savedToday,
    };
  }, [organizedUpdates]);

  const handleFormat = async () => {
    if (!rawInput.trim()) {
      setStatusMessage("Paste a report first.");
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

      const nextOutput = formatReport(textToFormat, options);
      setFormattedOutput(nextOutput);
      setTranslatedInput(nextTranslatedInput);
      setSourceLanguage(nextSourceLanguage);
      setShowTranslationBadge(didTranslate);
      setStatusMessage("Report formatted successfully.");

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
      title: buildUpdateTitle(nextTranslatedInput || rawInput),
      rawInput,
      translatedInput: nextTranslatedInput,
      organizedOutput: nextOutput,
      sourceLanguage: nextSourceLanguage,
    });

    setOrganizedUpdates((current: typeof organizedUpdates) => [
      record,
      ...normalizeOrganizedUpdateRecords(current),
    ]);

    setStatusMessage("Formatted report saved to workspace.");
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
    setStatusMessage("Saved report removed.");
  };

  const optionCards = [
    { id: "addEmojis", label: "Add Emojis" },
    { id: "addBullets", label: "Bullet Points" },
    { id: "addSections", label: "Auto Sections" },
    { id: "addSpacing", label: "Add Spacing" },
    { id: "translateArabic", label: "Arabic to English" },
  ] as const;

  return (
    <div className="min-h-full bg-zinc-950 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] shadow-2xl">
          <div className="px-5 py-8 text-center sm:px-8 sm:py-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-100 sm:text-4xl">
              Report Formatter
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-slate-300 sm:text-base">
              Replace rough notes with clean, mobile-ready status reports that can be copied straight into WhatsApp or team updates.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatCard label="Saved" value={stats.total} />
              <StatCard label="Translated" value={stats.translated} />
              <StatCard label="Today" value={stats.savedToday} />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-800/90 shadow-2xl">
          <div className="border-b border-slate-700 px-4 py-5 sm:px-6">
            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
              <WandSparkles className="h-4 w-4" />
              Paste Your Messy Report
            </label>
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  void handleFormat();
                }
              }}
              className="min-h-[220px] w-full resize-y rounded-[1.25rem] border border-slate-700 bg-slate-950 px-4 py-4 text-sm font-medium text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-emerald-400 sm:min-h-[260px]"
              placeholder="Paste your messy report here..."
            />
          </div>

          <div className="border-b border-slate-700 bg-slate-950/40 px-4 py-5 sm:px-6">
            <label className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
              <Languages className="h-4 w-4" />
              Format Options
            </label>
            <div className="grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
              {optionCards.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-[60px] items-center gap-3 rounded-[1.25rem] border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 transition-transform hover:scale-[1.01]"
                >
                  <input
                    type="checkbox"
                    checked={options[option.id]}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        [option.id]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-700 px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => void handleFormat()}
                disabled={isFormatting}
                className="inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-950/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isFormatting ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5" />}
                Format Report
              </button>
              <button
                onClick={handleSave}
                disabled={isFormatting}
                className="inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] border border-slate-600 bg-slate-900 px-5 py-4 text-sm font-black text-slate-100 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <Save className="h-5 w-5" />
                Save Output
              </button>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Formatted Output
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {showTranslationBadge && (
                  <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
                    Arabic detected and translated to English
                  </span>
                )}
                <button
                  onClick={() => void handleCopy(formattedOutput, "Formatted output")}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-600"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>

            <div className="min-h-[220px] whitespace-pre-wrap rounded-[1.25rem] border border-slate-700 bg-slate-950 p-4 text-sm font-medium text-slate-100 sm:min-h-[260px]">
              {formattedOutput || <span className="text-slate-500">Your formatted report will appear here...</span>}
            </div>

            {translatedInput && (
              <div className="mt-4 rounded-[1.25rem] border border-slate-700 bg-slate-950/70 p-4">
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  English Draft Used For Formatting
                </div>
                <div className="whitespace-pre-wrap text-sm text-slate-300">{translatedInput}</div>
                <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Source language: {sourceLanguage}
                </div>
              </div>
            )}

            {statusMessage && (
              <div className="mt-4 rounded-[1.25rem] border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-bold text-slate-200">
                {statusMessage}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                <History className="h-4 w-4" />
                Saved Outputs
              </p>
              <h2 className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-100">
                Reusable formatted reports
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {organizedUpdates.length > 0 ? (
              organizedUpdates.slice(0, 8).map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                      <h3 className="mt-2 truncate text-lg font-black text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoad(item.id)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => void handleCopy(item.organizedOutput, "Saved output")}
                        className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <PreviewBlock label="Raw Input">{item.rawInput}</PreviewBlock>
                    {item.translatedInput && (
                      <PreviewBlock label="English Draft">{item.translatedInput}</PreviewBlock>
                    )}
                    <PreviewBlock label="Formatted Output">{item.organizedOutput}</PreviewBlock>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                  No formatted reports saved yet
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Format a report, then save it here for reuse.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-left backdrop-blur-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-100">{value}</div>
    </div>
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
    <div className="rounded-[1.25rem] border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="max-h-40 overflow-auto whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
        {children}
      </div>
    </div>
  );
}
