import { describe, expect, it } from "vitest";
import {
  getStandaloneTasksStorageKey,
  mergeWorkspaceRecords,
  mergeWorkspaceRecordsByIdentity,
} from "@/lib/workspacePersistence";

describe("workspacePersistence", () => {
  it("prefers the newest updated record when merging timeline collections", () => {
    const merged = mergeWorkspaceRecords(
      [
        { id: "1", updatedAt: "2026-03-19T10:00:00.000Z", value: "server" },
        { id: "2", updatedAt: "2026-03-18T10:00:00.000Z", value: "server-only" },
      ],
      [
        { id: "1", updatedAt: "2026-03-19T12:00:00.000Z", value: "local" },
        { id: "3", updatedAt: "2026-03-17T10:00:00.000Z", value: "local-only" },
      ],
    );

    expect(merged).toEqual([
      { id: "1", updatedAt: "2026-03-19T12:00:00.000Z", value: "local" },
      { id: "2", updatedAt: "2026-03-18T10:00:00.000Z", value: "server-only" },
      { id: "3", updatedAt: "2026-03-17T10:00:00.000Z", value: "local-only" },
    ]);
  });

  it("keeps local-only items and replaces stale server rows for identity merges", () => {
    const merged = mergeWorkspaceRecordsByIdentity(
      [
        { id: "1", updatedAt: "2026-03-19T10:00:00.000Z", value: "server" },
      ],
      [
        { id: "1", updatedAt: "2026-03-19T11:00:00.000Z", value: "local" },
        { id: "2", updatedAt: "2026-03-19T09:00:00.000Z", value: "local-only" },
      ],
    );

    expect(merged).toEqual([
      { id: "1", updatedAt: "2026-03-19T11:00:00.000Z", value: "local" },
      { id: "2", updatedAt: "2026-03-19T09:00:00.000Z", value: "local-only" },
    ]);
  });

  it("builds user-scoped storage keys for standalone tasks", () => {
    expect(getStandaloneTasksStorageKey("ops@trygc.com")).toBe("trygc-standalone-tasks:ops@trygc.com");
  });
});
