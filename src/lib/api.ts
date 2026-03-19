import { projectId, publicAnonKey } from "../../utils/supabase/info";

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b626472b`;

interface ApiRequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function apiRequest<T>(
  path: string,
  { body, headers, method = "GET", signal, timeoutMs = 15000 }: ApiRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const abortExternalSignal = () => controller.abort();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortExternalSignal, { once: true });
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method,
      signal: controller.signal,
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (signal?.aborted) {
        throw error;
      }

      throw new Error("Request timed out. Please try again.");
    }

    if (error instanceof TypeError) {
      throw new Error("Network request failed. Check your connection and try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", abortExternalSignal);
    }
  }
}

export type WorkspaceDataResponse = {
  tasks?: unknown[];
  successLogs?: unknown[];
  taskNotifications?: unknown[];
  mistakes?: unknown[];
  tasksPerTeam?: Record<string, unknown>;
  opsCampaigns?: unknown[];
  campaignIntakes?: unknown[];
  organizedUpdates?: unknown[];
  linkWidgets?: unknown[];
  shiftHandovers?: unknown[];
  coverageRecords?: unknown[];
  standaloneTasks?: unknown[];
};

export type TranslateToEnglishResponse = {
  translatedText: string;
  sourceLanguage: string;
};
