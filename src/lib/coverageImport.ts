import type { CoverageRecord, CoverageSource } from "./coverageTypes";
import { cleanCoverageText, createCoverageRecord, normalizeCoverageStatus } from "./coverageTypes";

type HeaderIndexMap = Record<string, number>;

const KNOWN_TASKS = new Map<string, string>([
  ["coverage", "Coverage"],
  ["sr.coverage", "SR.Coverage"],
  ["support", "Support"],
  ["audit system", "Audit System"],
  ["audit campaign", "Audit Campaign"],
  ["training", "Training"],
  ["distribute, audit", "Distribute, Audit"],
]);

const FIELD_ALIASES = {
  owner: ["owner", "assignee", "assigned to", "column 5", "member", "name"],
  task: ["task", "type", "activity"],
  campaign: ["shift-campaign-name", "campaign", "campaign name", "shift", "brand"],
  date: ["date", "day"],
  status: ["done 1", "status", "state"],
  systemStatus: ["system", "system status"],
  auditStatus: ["audit status"],
  warning: ["warning"],
  action: ["action"],
  appreciation: ["appreciation"],
  notes: ["notes", "note", "comment", "comments"],
  doneAt: ["done 1 end", "done at", "completed at"],
} as const;

function normalizeTask(rawTask: string, owner: string, campaign: string) {
  const cleanedTask = cleanCoverageText(rawTask);
  const taskKey = cleanedTask.toLowerCase();

  if (KNOWN_TASKS.has(taskKey)) {
    return KNOWN_TASKS.get(taskKey) || cleanedTask;
  }

  if (!cleanedTask && owner.toLowerCase() === "note") {
    return "Note";
  }

  if (cleanedTask && !KNOWN_TASKS.has(taskKey) && campaign) {
    return "Coverage";
  }

  return cleanedTask || "Coverage";
}

function normalizeHeaderIndex(headerRow: unknown[]) {
  return headerRow.reduce<HeaderIndexMap>((accumulator, value, index) => {
    const key = cleanCoverageText(value).toLowerCase();

    if (key && accumulator[key] === undefined) {
      accumulator[key] = index;
    }

    return accumulator;
  }, {});
}

function getCell(row: unknown[], headerIndex: HeaderIndexMap, key: string) {
  const index = headerIndex[key.toLowerCase()];
  return index === undefined ? null : row[index] ?? null;
}

export function parseCoverageDate(value: unknown, XLSX?: { SSF?: { parse_date_code?: (value: number) => any } }) {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) {
      return null;
    }

    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  return null;
}

export function parseCoverageDateTime(value: unknown, XLSX?: { SSF?: { parse_date_code?: (value: number) => any } }) {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number" && XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) {
      return null;
    }

    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, Math.floor(parsed.S ?? 0)));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

export function parseCoverageSheetRows(
  rows: unknown[][],
  options?: { source?: CoverageSource; XLSX?: { SSF?: { parse_date_code?: (value: number) => any } } },
) {
  const headerIndex = normalizeHeaderIndex(rows[1] || []);
  const source = options?.source || "workbook";

  return rows
    .slice(2)
    .map((row, index) => {
      const owner = cleanCoverageText(getCell(row, headerIndex, "Column 5"));
      const campaign = cleanCoverageText(getCell(row, headerIndex, "Shift-Campaign-Name"));
      const rawTask = cleanCoverageText(getCell(row, headerIndex, "Task"));
      const task = normalizeTask(rawTask, owner, campaign);
      const warning = cleanCoverageText(getCell(row, headerIndex, "Warning"));
      const action = cleanCoverageText(getCell(row, headerIndex, "Action"));
      const appreciation = cleanCoverageText(getCell(row, headerIndex, "Appreciation"));
      const notes = cleanCoverageText(getCell(row, headerIndex, "Notes"));
      const systemStatus = cleanCoverageText(getCell(row, headerIndex, "system"));
      const auditStatus = cleanCoverageText(getCell(row, headerIndex, "Audit Status"));
      const date = parseCoverageDate(getCell(row, headerIndex, "Date"), options?.XLSX);
      const doneAt =
        parseCoverageDateTime(getCell(row, headerIndex, "Done 1 End"), options?.XLSX) ||
        parseCoverageDateTime(getCell(row, headerIndex, "Audit Status End"), options?.XLSX);

      const hasContent =
        Boolean(owner) ||
        Boolean(campaign) ||
        Boolean(rawTask) ||
        Boolean(warning) ||
        Boolean(action) ||
        Boolean(appreciation) ||
        Boolean(notes);

      if (!hasContent) {
        return null;
      }

      return createCoverageRecord({
        action,
        appreciation,
        auditStatus,
        campaign,
        date,
        doneAt,
        isNote: owner.toLowerCase() === "note" || task === "Note",
        notes,
        owner: owner || "Unassigned",
        rowNumber: index + 3,
        source,
        status: normalizeCoverageStatus(cleanCoverageText(getCell(row, headerIndex, "Done 1")) || systemStatus || auditStatus),
        systemStatus,
        task,
        warning,
      });
    })
    .filter(Boolean) as CoverageRecord[];
}

function findObjectValue(row: Record<string, unknown>, aliases: readonly string[]) {
  const entries = Object.entries(row);

  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase();
    const exactMatch = entries.find(([key]) => cleanCoverageText(key).toLowerCase() === lowerAlias);

    if (exactMatch) {
      return exactMatch[1];
    }

    const fuzzyMatch = entries.find(([key]) => cleanCoverageText(key).toLowerCase().includes(lowerAlias));
    if (fuzzyMatch) {
      return fuzzyMatch[1];
    }
  }

  return null;
}

export function parseCoverageObjectRows(
  rows: Record<string, unknown>[],
  options?: { source?: CoverageSource; XLSX?: { SSF?: { parse_date_code?: (value: number) => any } } },
) {
  const source = options?.source || "upload";

  return rows
    .map((row, index) => {
      const owner = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.owner));
      const campaign = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.campaign));
      const rawTask = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.task));
      const task = normalizeTask(rawTask, owner, campaign);
      const warning = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.warning));
      const action = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.action));
      const appreciation = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.appreciation));
      const notes = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.notes));
      const systemStatus = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.systemStatus));
      const auditStatus = cleanCoverageText(findObjectValue(row, FIELD_ALIASES.auditStatus));
      const date = parseCoverageDate(findObjectValue(row, FIELD_ALIASES.date), options?.XLSX);
      const doneAt = parseCoverageDateTime(findObjectValue(row, FIELD_ALIASES.doneAt), options?.XLSX);

      const hasContent =
        Boolean(owner) ||
        Boolean(campaign) ||
        Boolean(rawTask) ||
        Boolean(warning) ||
        Boolean(action) ||
        Boolean(appreciation) ||
        Boolean(notes);

      if (!hasContent) {
        return null;
      }

      return createCoverageRecord({
        action,
        appreciation,
        auditStatus,
        campaign,
        date,
        doneAt,
        isNote: owner.toLowerCase() === "note" || task === "Note",
        notes,
        owner: owner || "Unassigned",
        rowNumber: index + 1,
        source,
        status: normalizeCoverageStatus(
          cleanCoverageText(findObjectValue(row, FIELD_ALIASES.status)) || systemStatus || auditStatus,
        ),
        systemStatus,
        task,
        warning,
      });
    })
    .filter(Boolean) as CoverageRecord[];
}
