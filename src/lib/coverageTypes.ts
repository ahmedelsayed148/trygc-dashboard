import { createId } from "./operations";

export type CoverageStatus = "Completed" | "In Progress" | "Not Started" | "Blank" | "Other";
export type CoverageSource = "workbook" | "upload" | "manual" | "bulk";

export interface CoverageRecord {
  action: string;
  appreciation: string;
  auditStatus: string;
  campaign: string;
  createdAt: string;
  date: string | null;
  doneAt: string | null;
  id: string;
  isCoverage: boolean;
  isNote: boolean;
  notes: string;
  owner: string;
  rowNumber: number;
  source: CoverageSource;
  status: CoverageStatus;
  systemStatus: string;
  task: string;
  updatedAt: string;
  warning: string;
}

export interface CoverageSummary {
  actionableRecords: number;
  completedRecords: number;
  completionRate: number;
  latestDate: string | null;
  noteRecords: number;
  totalRecords: number;
  uniqueCampaigns: number;
  uniqueDates: number;
  uniqueOwners: number;
}

export interface CoverageBreakdownItem {
  completed?: number;
  count: number;
  label: string;
}

export interface CoverageDailyVolume {
  completed: number;
  count: number;
  date: string;
}

export interface CoverageNoteItem {
  date: string | null;
  id: string;
  owner: string;
  rowNumber: number;
  text: string;
}

export interface CoverageWorkbookData {
  dailyVolume: CoverageDailyVolume[];
  ownerLeaderboard: CoverageBreakdownItem[];
  recentNotes: CoverageNoteItem[];
  records: CoverageRecord[];
  statusBreakdown: CoverageBreakdownItem[];
  summary: CoverageSummary;
  taskBreakdown: CoverageBreakdownItem[];
}

export function cleanCoverageText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function normalizeCoverageStatus(value: unknown): CoverageStatus {
  const status = cleanCoverageText(value).toLowerCase();

  if (!status) {
    return "Blank";
  }

  if (status === "completed" || status === "done") {
    return "Completed";
  }

  if (status === "in progress") {
    return "In Progress";
  }

  if (status === "not started") {
    return "Not Started";
  }

  return "Other";
}

export function createCoverageRecord(seed?: Partial<CoverageRecord>): CoverageRecord {
  const now = new Date().toISOString();
  const task = cleanCoverageText(seed?.task) || "Coverage";
  const owner = cleanCoverageText(seed?.owner) || "Unassigned";
  const warning = cleanCoverageText(seed?.warning);
  const action = cleanCoverageText(seed?.action);
  const appreciation = cleanCoverageText(seed?.appreciation);
  const notes = cleanCoverageText(seed?.notes);
  const campaign = cleanCoverageText(seed?.campaign);

  return {
    action,
    appreciation,
    auditStatus: cleanCoverageText(seed?.auditStatus),
    campaign,
    createdAt: cleanCoverageText(seed?.createdAt) || now,
    date: typeof seed?.date === "string" && seed.date ? seed.date : null,
    doneAt: typeof seed?.doneAt === "string" && seed.doneAt ? seed.doneAt : null,
    id: cleanCoverageText(seed?.id) || createId("coverage"),
    isCoverage: seed?.isCoverage ?? /coverage/i.test(task),
    isNote: seed?.isNote ?? (owner.toLowerCase() === "note"),
    notes,
    owner,
    rowNumber: typeof seed?.rowNumber === "number" ? seed.rowNumber : 0,
    source:
      seed?.source === "workbook" || seed?.source === "upload" || seed?.source === "manual" || seed?.source === "bulk"
        ? seed.source
        : "manual",
    status: normalizeCoverageStatus(seed?.status || seed?.systemStatus || seed?.auditStatus),
    systemStatus: cleanCoverageText(seed?.systemStatus),
    task,
    updatedAt: cleanCoverageText(seed?.updatedAt) || now,
    warning,
  };
}

export function normalizeCoverageRecords(rawRecords: unknown): CoverageRecord[] {
  if (!Array.isArray(rawRecords)) {
    return [];
  }

  return rawRecords.map((record) => createCoverageRecord(record as Partial<CoverageRecord>));
}

function sortBreakdown(items: CoverageBreakdownItem[]) {
  return items.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.label.localeCompare(right.label);
  });
}

export function buildCoverageWorkbookData(rawRecords: unknown): CoverageWorkbookData {
  const records = normalizeCoverageRecords(rawRecords).sort((left, right) => {
    const leftKey = left.doneAt || left.date || left.updatedAt;
    const rightKey = right.doneAt || right.date || right.updatedAt;

    if (rightKey !== leftKey) {
      return rightKey.localeCompare(leftKey);
    }

    return right.rowNumber - left.rowNumber;
  });
  const noteItems: CoverageNoteItem[] = [];
  const taskMap = new Map<string, CoverageBreakdownItem>();
  const ownerMap = new Map<string, CoverageBreakdownItem>();
  const statusMap = new Map<string, CoverageBreakdownItem>();
  const dailyMap = new Map<string, CoverageDailyVolume>();
  const uniqueCampaigns = new Set<string>();
  const uniqueOwners = new Set<string>();
  const uniqueDates = new Set<string>();

  records.forEach((record) => {
    const noteText = [record.warning, record.action, record.appreciation, record.notes].filter(Boolean).join(" | ");

    if (record.isNote || noteText) {
      noteItems.push({
        date: record.date,
        id: record.id,
        owner: record.owner,
        rowNumber: record.rowNumber,
        text: noteText || record.campaign || "No additional note text provided.",
      });
    }

    if (record.isNote) {
      return;
    }

    uniqueOwners.add(record.owner);

    if (record.campaign) {
      uniqueCampaigns.add(record.campaign);
    }

    if (record.date) {
      uniqueDates.add(record.date);
    }

    const taskEntry = taskMap.get(record.task) || { label: record.task, count: 0, completed: 0 };
    taskEntry.count += 1;
    taskEntry.completed = (taskEntry.completed || 0) + (record.status === "Completed" ? 1 : 0);
    taskMap.set(record.task, taskEntry);

    const ownerEntry = ownerMap.get(record.owner) || { label: record.owner, count: 0, completed: 0 };
    ownerEntry.count += 1;
    ownerEntry.completed = (ownerEntry.completed || 0) + (record.status === "Completed" ? 1 : 0);
    ownerMap.set(record.owner, ownerEntry);

    const statusEntry = statusMap.get(record.status) || { label: record.status, count: 0 };
    statusEntry.count += 1;
    statusMap.set(record.status, statusEntry);

    if (record.date) {
      const dayEntry = dailyMap.get(record.date) || { date: record.date, count: 0, completed: 0 };
      dayEntry.count += 1;
      dayEntry.completed += record.status === "Completed" ? 1 : 0;
      dailyMap.set(record.date, dayEntry);
    }
  });

  const actionableRecords = records.filter((record) => !record.isNote);
  const completedRecords = actionableRecords.filter((record) => record.status === "Completed").length;
  const latestDates = actionableRecords
    .map((record) => record.date)
    .filter(Boolean)
    .sort();
  const latestDate = latestDates.length > 0 ? latestDates[latestDates.length - 1] : null;

  return {
    dailyVolume: [...dailyMap.values()].sort((left, right) => left.date.localeCompare(right.date)),
    ownerLeaderboard: sortBreakdown([...ownerMap.values()]).slice(0, 12),
    recentNotes: noteItems
      .sort((left, right) => {
        const leftTime = left.date || "";
        const rightTime = right.date || "";
        if (rightTime !== leftTime) {
          return rightTime.localeCompare(leftTime);
        }
        return right.rowNumber - left.rowNumber;
      })
      .slice(0, 10),
    records,
    statusBreakdown: sortBreakdown([...statusMap.values()]),
    summary: {
      actionableRecords: actionableRecords.length,
      completedRecords,
      completionRate: actionableRecords.length ? Math.round((completedRecords / actionableRecords.length) * 100) : 0,
      latestDate,
      noteRecords: records.length - actionableRecords.length,
      totalRecords: records.length,
      uniqueCampaigns: uniqueCampaigns.size,
      uniqueDates: uniqueDates.size,
      uniqueOwners: uniqueOwners.size,
    },
    taskBreakdown: sortBreakdown([...taskMap.values()]),
  };
}
