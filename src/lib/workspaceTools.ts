import { createId } from "./operations";

export type CampaignIntakeStage = "Upcoming" | "Ongoing";

export interface CampaignIntakeRecord {
  id: string;
  linkedCampaignId: string;
  name: string;
  client: string;
  market: string;
  owner: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  stage: CampaignIntakeStage;
  startDate: string;
  endDate: string;
  budget: number;
  summary: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizedUpdateRecord {
  id: string;
  title: string;
  rawInput: string;
  translatedInput: string;
  organizedOutput: string;
  sourceLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export type LinkWidgetLayout = "compact" | "wide";

export type ShiftHandoverHealth = "Stable" | "Watch" | "Critical";

export interface ShiftHandoverRecord {
  id: string;
  title: string;
  shiftDate: string;
  shiftWindow: string;
  preparedBy: string;
  team: string;
  coverage: string;
  health: ShiftHandoverHealth;
  summary: string;
  completedWork: string;
  pendingItems: string;
  blockers: string;
  escalations: string;
  nextShiftFocus: string;
  sharedContext: string;
  broadcastSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkWidgetRecord {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  layout: LinkWidgetLayout;
  pinned: boolean;
  openInNewTab: boolean;
  createdAt: string;
  updatedAt: string;
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function createCampaignIntakeRecord(
  seed?: Partial<CampaignIntakeRecord>,
): CampaignIntakeRecord {
  const now = new Date().toISOString();

  return {
    id: trimString(seed?.id) || createId("campaign-intake"),
    linkedCampaignId: trimString(seed?.linkedCampaignId),
    name: trimString(seed?.name) || "New Campaign",
    client: trimString(seed?.client),
    market: trimString(seed?.market) || "EGY",
    owner: trimString(seed?.owner),
    priority:
      seed?.priority === "Low" ||
      seed?.priority === "Medium" ||
      seed?.priority === "High" ||
      seed?.priority === "Critical"
        ? seed.priority
        : "Medium",
    stage: seed?.stage === "Ongoing" ? "Ongoing" : "Upcoming",
    startDate: trimString(seed?.startDate),
    endDate: trimString(seed?.endDate),
    budget: typeof seed?.budget === "number" ? seed.budget : 0,
    summary: trimString(seed?.summary),
    notes: trimString(seed?.notes),
    createdAt: trimString(seed?.createdAt) || now,
    updatedAt: trimString(seed?.updatedAt) || now,
  };
}

export function normalizeCampaignIntakeRecords(
  rawRecords: unknown,
): CampaignIntakeRecord[] {
  if (!Array.isArray(rawRecords)) {
    return [];
  }

  return rawRecords.map((record) =>
    createCampaignIntakeRecord(record as Partial<CampaignIntakeRecord>),
  );
}

export function createOrganizedUpdateRecord(
  seed?: Partial<OrganizedUpdateRecord>,
): OrganizedUpdateRecord {
  const now = new Date().toISOString();

  return {
    id: trimString(seed?.id) || createId("update"),
    title: trimString(seed?.title) || "Structured Update",
    rawInput: trimString(seed?.rawInput),
    translatedInput: trimString(seed?.translatedInput),
    organizedOutput: trimString(seed?.organizedOutput),
    sourceLanguage: trimString(seed?.sourceLanguage) || "auto",
    createdAt: trimString(seed?.createdAt) || now,
    updatedAt: trimString(seed?.updatedAt) || now,
  };
}

export function normalizeOrganizedUpdateRecords(
  rawRecords: unknown,
): OrganizedUpdateRecord[] {
  if (!Array.isArray(rawRecords)) {
    return [];
  }

  return rawRecords.map((record) =>
    createOrganizedUpdateRecord(record as Partial<OrganizedUpdateRecord>),
  );
}

export function buildShiftHandoverBroadcast(
  seed: Partial<ShiftHandoverRecord>,
) {
  const header = [
    trimString(seed.title) || "Shift Handover",
    trimString(seed.shiftWindow) || "Shift",
    trimString(seed.shiftDate) || new Date().toISOString().slice(0, 10),
  ]
    .filter(Boolean)
    .join(" | ");

  const meta = [
    trimString(seed.preparedBy) && `Prepared by: ${trimString(seed.preparedBy)}`,
    trimString(seed.team) && `Team: ${trimString(seed.team)}`,
    trimString(seed.coverage) && `Coverage: ${trimString(seed.coverage)}`,
    (seed.health === "Watch" || seed.health === "Critical" || seed.health === "Stable")
      ? `Shift Health: ${seed.health}`
      : "Shift Health: Stable",
  ].filter(Boolean) as string[];

  const sections = [
    buildSection("Shift Summary", splitInputIntoLines(trimString(seed.summary))),
    buildSection("Completed This Shift", splitInputIntoLines(trimString(seed.completedWork))),
    buildSection("Pending For Next Shift", splitInputIntoLines(trimString(seed.pendingItems))),
    buildSection("Blockers / Risks", splitInputIntoLines(trimString(seed.blockers))),
    buildSection("Escalations / Decisions Needed", splitInputIntoLines(trimString(seed.escalations))),
    buildSection("Next Shift Focus", splitInputIntoLines(trimString(seed.nextShiftFocus))),
    buildSection("Share With Team", splitInputIntoLines(trimString(seed.sharedContext))),
  ].filter(Boolean);

  return [header, meta.join("\n"), ...sections].filter(Boolean).join("\n\n");
}

export function createShiftHandoverRecord(
  seed?: Partial<ShiftHandoverRecord>,
): ShiftHandoverRecord {
  const now = new Date().toISOString();

  return {
    id: trimString(seed?.id) || createId("handover"),
    title: trimString(seed?.title) || "Shift Handover",
    shiftDate: trimString(seed?.shiftDate) || now.slice(0, 10),
    shiftWindow: trimString(seed?.shiftWindow) || "General",
    preparedBy: trimString(seed?.preparedBy),
    team: trimString(seed?.team) || "Operations",
    coverage: trimString(seed?.coverage),
    health:
      seed?.health === "Watch" || seed?.health === "Critical" || seed?.health === "Stable"
        ? seed.health
        : "Stable",
    summary: trimString(seed?.summary),
    completedWork: trimString(seed?.completedWork),
    pendingItems: trimString(seed?.pendingItems),
    blockers: trimString(seed?.blockers),
    escalations: trimString(seed?.escalations),
    nextShiftFocus: trimString(seed?.nextShiftFocus),
    sharedContext: trimString(seed?.sharedContext),
    broadcastSummary:
      trimString(seed?.broadcastSummary) || buildShiftHandoverBroadcast(seed || {}),
    createdAt: trimString(seed?.createdAt) || now,
    updatedAt: trimString(seed?.updatedAt) || now,
  };
}

export function normalizeShiftHandoverRecords(
  rawRecords: unknown,
): ShiftHandoverRecord[] {
  if (!Array.isArray(rawRecords)) {
    return [];
  }

  return rawRecords.map((record) =>
    createShiftHandoverRecord(record as Partial<ShiftHandoverRecord>),
  );
}

export function createLinkWidgetRecord(
  seed?: Partial<LinkWidgetRecord>,
): LinkWidgetRecord {
  const now = new Date().toISOString();

  return {
    id: trimString(seed?.id) || createId("widget"),
    title: trimString(seed?.title) || "Important Link",
    url: trimString(seed?.url),
    description: trimString(seed?.description),
    category: trimString(seed?.category) || "General",
    color: trimString(seed?.color) || "slate",
    icon: trimString(seed?.icon) || "GL",
    layout: seed?.layout === "wide" ? "wide" : "compact",
    pinned: seed?.pinned === true,
    openInNewTab: seed?.openInNewTab !== false,
    createdAt: trimString(seed?.createdAt) || now,
    updatedAt: trimString(seed?.updatedAt) || now,
  };
}

export function normalizeLinkWidgetRecords(
  rawRecords: unknown,
): LinkWidgetRecord[] {
  if (!Array.isArray(rawRecords)) {
    return [];
  }

  return rawRecords.map((record) =>
    createLinkWidgetRecord(record as Partial<LinkWidgetRecord>),
  );
}

function normalizeLine(line: string) {
  return line
    .replace(/^[\s\-*•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitInputIntoLines(text: string) {
  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/[;|]+/g, "\n")
    .replace(/\n{2,}/g, "\n");

  const rawLines = normalized.includes("\n")
    ? normalized.split("\n")
    : normalized.split(/(?<=[.!?])\s+/);

  return rawLines.map(normalizeLine).filter(Boolean);
}

function buildSection(title: string, lines: string[]) {
  if (lines.length === 0) {
    return "";
  }

  return `${title}\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

export function buildUpdateTitle(text: string) {
  const firstLine = splitInputIntoLines(text)[0] || "Structured Update";
  const words = firstLine.split(/\s+/).slice(0, 8);
  return words.join(" ");
}

export function organizeMessyUpdateInput(rawText: string) {
  const cleanedText = rawText.trim();
  const lines = splitInputIntoLines(cleanedText);
  const summary = lines[0] ? [lines[0]] : [];
  const progress: string[] = [];
  const blockers: string[] = [];
  const nextSteps: string[] = [];
  const metrics: string[] = [];
  const notes: string[] = [];

  lines.slice(summary.length).forEach((line) => {
    if (/(block|issue|risk|delay|waiting|stuck|problem|hold|مشكلة|تأخير|معطل)/i.test(line)) {
      blockers.push(line);
      return;
    }

    if (/(next|follow|action|todo|to do|will|pending|tomorrow|plan|need to|لازم|متابعة|الخطوة)/i.test(line)) {
      nextSteps.push(line);
      return;
    }

    if (/\d|%|kpi|target|con|cov|sla|metric/i.test(line)) {
      metrics.push(line);
      return;
    }

    if (/(done|completed|shared|sent|launched|updated|closed|finished|live|تم|خلص|اكتمل|انتهى|اتبعت)/i.test(line)) {
      progress.push(line);
      return;
    }

    notes.push(line);
  });

  const sections = [
    buildSection("Summary", summary),
    buildSection("Progress", progress),
    buildSection("Metrics", metrics),
    buildSection("Blockers", blockers),
    buildSection("Next Steps", nextSteps),
    buildSection("Additional Notes", notes),
  ].filter(Boolean);

  return sections.join("\n\n");
}
