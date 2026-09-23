export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

const SEARCH_URL = "https://html.duckduckgo.com/html/";
const SEARCH_TIMEOUT_MS = 6000;

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapResultUrl(raw: string): string | null {
  try {
    const url = new URL(raw, "https://duckduckgo.com");
    const target = url.searchParams.get("uddg");
    const result = target ? new URL(target) : url;
    if (result.protocol !== "https:" && result.protocol !== "http:") return null;
    return result.toString();
  } catch {
    return null;
  }
}

export function parseSearchResults(html: string): WebSearchResult[] {
  const rows: { title: string; url: string }[] = [];
  const titleRe = /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = titleRe.exec(html)) && rows.length < 8) {
    const url = unwrapResultUrl(match[1]);
    if (!url) continue;
    rows.push({ title: decodeHtml(match[2]).slice(0, 200) || url, url });
  }

  const snippets: string[] = [];
  const snippetRe = /<a[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = snippetRe.exec(html)) && snippets.length < rows.length) {
    snippets.push(decodeHtml(match[1]).slice(0, 500));
  }

  const out: WebSearchResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rows.length && out.length < 5; i++) {
    const row = rows[i];
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    out.push({ title: row.title, url: row.url, snippet: snippets[i] || "" });
  }
  return out;
}

export async function searchWebServer(query: string): Promise<WebSearchResult[]> {
  const q = query.trim().slice(0, 500);
  if (!q) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const url = new URL(SEARCH_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("kl", "us-en");
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Hive/3.x web research",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return parseSearchResults(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
