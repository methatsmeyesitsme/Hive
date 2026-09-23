export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

const URL = "/api/hive/search";
const SEARCH_TIMEOUT_MS = 3500;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = SEARCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const q = query.trim().slice(0, 500);
  if (!q) return [];
  try {
    const res = await fetchWithTimeout(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
      cache: "no-store",
      keepalive: true,
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: WebSearchResult[] };
    return Array.isArray(body.results) ? body.results.slice(0, 5) : [];
  } catch {
    return [];
  }
}
