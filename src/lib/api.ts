import { projectId, publicAnonKey } from "../../utils/supabase/info";

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b626472b`;

interface ApiRequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  path: string,
  { body, headers, method = "GET", signal }: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method,
    signal,
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export type WorkspaceDataResponse = {
  tasks?: any[];
  successLogs?: any[];
  taskNotifications?: any[];
  mistakes?: any[];
  tasksPerTeam?: Record<string, any>;
  opsCampaigns?: any[];
  campaignIntakes?: any[];
  organizedUpdates?: any[];
  linkWidgets?: any[];
  shiftHandovers?: any[];
  coverageRecords?: any[];
  standaloneTasks?: any[];
};

export type TranslateToEnglishResponse = {
  translatedText: string;
  sourceLanguage: string;
};
