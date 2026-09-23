export type BackgroundAttachment = {
  name: string;
  mime: string;
  kind: "image" | "file";
  textExcerpt?: string;
};

import type { ExecutionMode } from "./types";

export type BackgroundInput = {
  projectId: string;
  prompt: string;
  history: { role: "user" | "mc"; content: string }[];
  attachments: BackgroundAttachment[];
  memory: { title: string; content: string }[];
  currentHtml?: string | null;
  projectName: string;
  effort: number;
  executionMode: ExecutionMode;
};

export type BackgroundJob = {
  id: string;
  projectId: string;
  status: "queued" | "running" | "complete" | "error" | "cancelled";
  result?: {
    ok: true;
    projectName: string;
    mcMessage: string;
    plan: {
      objective: string;
      strategy: string;
      researchNeeded: boolean;
      researchTopic: string;
      lieutenants: { letter: string; objective: string; agentCount: number; files: string[] }[];
    };
    artifact: {
      title: string;
      kind: "website" | "code";
      html: string;
      files: { path: string; content: string }[];
      ready: boolean;
    } | null;
    memory: { title: string; content: string; source: "web" | "work" | "project" | "research" }[];
  };
  error?: string;
  createdAt: number;
};

const URL = "/api/hive/background";

function backgroundServerLikelyAvailable(): boolean {
  if (typeof location === "undefined") return true;
  const host = location.hostname.toLowerCase();
  // GitHub Pages is static hosting, so there is no /api route to wait on.
  return !host.endsWith(".github.io") && host !== "github.io";
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 2500,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function enqueueBackgroundJob(input: BackgroundInput): Promise<
  | { ok: true; jobId: string }
  | { ok: false; unavailable: boolean; error?: string }
> {
  if (!backgroundServerLikelyAvailable()) {
    return { ok: false, unavailable: true };
  }
  try {
    const compact = {
      ...input,
      currentHtml: input.currentHtml ? input.currentHtml.slice(0, 16000) : null,
    };
    const res = await fetchWithTimeout(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compact),
      keepalive: true,
    });
    const body = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string };
    if (!res.ok || !body.jobId) {
      return {
        ok: false,
        unavailable: res.status === 404 || res.status === 405 || res.status === 501 || res.status === 503,
        error: body.error,
      };
    }
    return { ok: true, jobId: body.jobId };
  } catch {
    return { ok: false, unavailable: true };
  }
}

export async function getBackgroundJob(id: string): Promise<BackgroundJob | null> {
  try {
    const res = await fetchWithTimeout(`${URL}?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as BackgroundJob;
  } catch {
    return null;
  }
}

export async function listBackgroundJobs(): Promise<BackgroundJob[]> {
  try {
    const res = await fetchWithTimeout(URL, { cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as { jobs?: BackgroundJob[] };
    return body.jobs ?? [];
  } catch {
    return [];
  }
}

export async function cancelBackgroundJob(id: string): Promise<void> {
  try {
    await fetchWithTimeout(
      URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id }),
        keepalive: true,
      },
      2000,
    );
  } catch { /* best-effort cancellation */ }
}

export async function consumeBackgroundJob(id: string): Promise<void> {
  try {
    await fetch(`${URL}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      keepalive: true,
    });
  } catch { /* best-effort cleanup */ }
}
