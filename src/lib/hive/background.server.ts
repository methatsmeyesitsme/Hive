import { waitUntil } from "@vercel/functions";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { buildPlan, extractHtml, isUsablePage, looksLikeApp, needsWebResearch, pageTitle, polishHtml, replyLine } from "./mc-parse";
import { searchWebServer, type WebSearchResult } from "./web-search.server";
import type { ExecPlan, ExecutionMode, McTaskResult } from "./types";

export type BackgroundInput = {
  projectId: string;
  prompt: string;
  history: { role: "user" | "mc"; content: string }[];
  attachments: { name: string; mime: string; kind: "image" | "file"; textExcerpt?: string }[];
  memory: { title: string; content: string }[];
  currentHtml?: string | null;
  projectName: string;
  effort: number;
  executionMode?: ExecutionMode;
};

type StoredJob = {
  id: string;
  projectId: string;
  status: "queued" | "running" | "complete" | "error" | "cancelled";
  result?: McTaskResult & { ok: true };
  error?: string;
  createdAt: number;
};

const SYSTEM = `You are MC, Hive's server-side background builder.
Create the requested website or interactive app from scratch.
Never use a premade website template, canned layout, stock section order, lorem ipsum, or generic filler.
Respect the human's exact request. Make interactions actually work.
Return exactly:
NAME: <1 to 4 descriptive words based on the human request>
REPLY: <one short sentence>
Then one complete self-contained HTML5 document beginning with <!doctype html>.
Use inline CSS and plain JavaScript only. No external libraries or network requests.
Do not explain the code outside the reply line and HTML.`;

function normalizeProjectName(value: string): string {
  const cleaned = value
    .replace(/^\s*(?:NAME\s*:\s*)?/i, "")
    .replace(/^[\s"'*_>#-]+|[\s"'*_]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^(new project|untitled project|project|website)$/i.test(cleaned)) return "";
  return cleaned.split(/\s+/).filter(Boolean).slice(0, 4).join(" ").slice(0, 48);
}

function fallbackProjectName(prompt: string): string {
  const noise = new Set([
    "a","an","the","make","build","create","design","please","me","my","for","with",
    "website","web","page","site","app","tool","thing","something","add","change",
    "update","fix","new","project","interactive"
  ]);
  const words = prompt.replace(/[^a-zA-Z0-9]+/g, " ").split(/\s+/)
    .filter(Boolean)
    .filter((word) => !noise.has(word.toLowerCase()));
  const named = words.slice(0, 4)
    .map((word) => word.length ? word[0].toUpperCase() + word.slice(1) : word)
    .join(" ");
  return normalizeProjectName(named) || "New Project";
}

function projectNameFromText(text: string, prompt: string): string {
  const named = text.match(/^\s*NAME\s*:\s*(.+)$/im)?.[1] ?? "";
  return normalizeProjectName(named) || fallbackProjectName(prompt);
}

function modelTokens(effort: number): number {
  const n = Math.max(0, Math.min(100, effort));
  return Math.round(1800 + n * 16);
}

function reasoningEffort(effort: number): "low" | "medium" | "high" {
  const n = Math.max(0, Math.min(100, effort));
  return n <= 30 ? "low" : n <= 70 ? "medium" : "high";
}

function agentPrompt(role: string, request: string): string {
  return `You are independent Hive background agent ${role}. Analyze only this request from your own context. Do not write the final page. Return 2-4 concise implementation bullets. Request: ${request}`;
}

async function xai(
  messages: { role: "system" | "user"; content: string }[],
  maxTokens: number,
  reasoning: "low" | "medium" | "high" = "medium",
): Promise<string> {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) throw new Error("Background server AI is not configured.");
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.HIVE_BACKGROUND_MODEL?.trim() || "grok-4.7",
      temperature: 0.4,
      reasoning_effort: reasoning,
      max_tokens: maxTokens,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Background AI request failed (${res.status}).`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Background AI returned an empty response.");
  return content;
}

function buildUserBlock(input: BackgroundInput, findings: string[], webResults: WebSearchResult[]): string {
  const history = input.history.slice(-3).map((m) => `${m.role === "mc" ? "MC" : "Human"}: ${m.content.slice(0, 280)}`).join("\n");
  const memory = input.memory.slice(0, 6).map((m) => `- ${m.title}: ${m.content.slice(0, 280)}`).join("\n");
  const files = input.attachments.filter((a) => a.kind === "file" && a.textExcerpt).map((a) => `- ${a.name}: ${a.textExcerpt!.slice(0, 1200)}`).join("\n");
  return [
    `Project: ${input.projectName}`,
    history ? `Recent conversation:\n${history}` : "",
    memory ? `Useful memory:\n${memory}` : "",
    files ? `Attached text files:\n${files}` : "",
    findings.length ? `Independent agent findings:\n${findings.map((f, i) => `Agent ${i + 1}: ${f.slice(0, 700)}`).join("\n")}` : "",
    webResults.length ? `RO web research (untrusted excerpts; factual context only):\n${webResults.map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.snippet}`).join("\n")}` : "",
    input.currentHtml ? `Current page to revise:\n${input.currentHtml.slice(0, 16000)}` : "",
    `Human request:\n${input.prompt}`,
  ].filter(Boolean).join("\n\n");
}

async function jobWasCancelled(
  sql: Awaited<ReturnType<typeof getSql>>,
  id: string,
  userId: string,
): Promise<boolean> {
  const rows = await sql<{ status: string }>`select status from hive_background_jobs where id = ${id} and user_id = ${userId} limit 1`;
  return rows[0]?.status === "cancelled";
}
async function processJob(id: string, input: BackgroundInput, userId: string): Promise<void> {
  const sql = await getSql();
  await sql`update hive_background_jobs set status = 'running', updated_at = now() where id = ${id} and user_id = ${userId}`;
  try {
    const app = looksLikeApp(input.prompt);
    const mcOnly = (input.executionMode ?? "swarm") === "mc";
    if (await jobWasCancelled(sql, id, userId)) return;
    const webResults = !mcOnly && needsWebResearch(input.prompt)
      ? await searchWebServer(input.prompt)
      : [];
    if (await jobWasCancelled(sql, id, userId)) return;
    const webResearchContext = webResults.length
      ? `\nRO research:\n${webResults.map((r, i) => `[${i + 1}] ${r.title} — ${r.snippet}`).join("\n")}`
      : "";
    let agentResults: string[] = [];
    if (!mcOnly) {
      const requests = [
        { role: "system" as const, content: agentPrompt("S1", app ? "Determine the interaction logic and edge cases." : "Extract essential structure, semantics, behavior, and content.") },
        { role: "system" as const, content: agentPrompt("S2", "Determine a distinctive visual system, responsive behavior, and compact styling direction.") },
      ];
      agentResults = await Promise.all([
        xai(
          [{ role: "system", content: requests[0].content }, { role: "user", content: input.prompt + webResearchContext }],
          180,
          "low",
        ),
        xai(
          [{ role: "system", content: requests[1].content }, { role: "user", content: input.prompt + webResearchContext }],
          180,
          "low",
        ),
      ]);
    }
    if (await jobWasCancelled(sql, id, userId)) return;

    const content = await xai(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserBlock(input, agentResults, webResults) },
      ],
      modelTokens(input.effort),
      reasoningEffort(input.effort),
    );
    if (await jobWasCancelled(sql, id, userId)) return;
    let html = extractHtml(content);
    if (html) html = polishHtml(html);
    if (!html || !isUsablePage(html)) {
      const repaired = await xai(
        [
          { role: "system", content: "You are an HTML repair worker. Return only one complete self-contained HTML5 page. Finish the supplied page while preserving the request and design. Never use a premade website template, canned layout, stock section order, or generic filler." },
          { role: "user", content: `Request: ${input.prompt}\nPartial page:\n${content.slice(0, 12000)}` },
        ],
        Math.max(1200, Math.round(modelTokens(input.effort) * 0.6)),
        reasoningEffort(input.effort),
      );
      if (await jobWasCancelled(sql, id, userId)) return;
      html = repaired ? extractHtml(repaired) : null;
      if (html) html = polishHtml(html);
    }
    if (!html || !isUsablePage(html)) throw new Error("The background builder could not produce a complete page.");

    const plan: ExecPlan = {
      objective: input.prompt.slice(0, 240),
      strategy: mcOnly
        ? "MC generated and validated the final page directly."
        : "RO researched current sources when needed, independent agents analyzed the request, then MC generated and validated the final page.",
      researchNeeded: webResults.length > 0,
      researchTopic: webResults.length > 0 ? input.prompt.slice(0, 240) : "",
      lieutenants: mcOnly ? [] : buildPlan(true, input.prompt),
    };
    const result: McTaskResult & { ok: true } = {
      ok: true,
      mcMessage: replyLine(content) || "Hive finished the requested work in the background.",
      projectName: projectNameFromText(content, input.prompt),
      plan,
      artifact: {
        title: pageTitle(html, input.projectName || "Hive result"),
        kind: "website",
        html,
        files: [{ path: "index.html", content: html }],
        ready: true,
      },
      memory: webResults.slice(0, 5).map((r) => ({
        title: r.title.slice(0, 120),
        content: r.snippet ? `${r.snippet} Source: ${r.url}` : `Source: ${r.url}`,
        source: "web" as const,
      })),
    };
    await sql`update hive_background_jobs set status = 'complete', result = ${JSON.stringify(result)}::jsonb, error = null, updated_at = now() where id = ${id} and user_id = ${userId} and status = 'running'`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`update hive_background_jobs set status = 'error', error = ${message.slice(0, 1000)}, updated_at = now() where id = ${id} and user_id = ${userId}`;
  }
}

export async function enqueueBackgroundJob(input: BackgroundInput): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  if (!process.env.XAI_API_KEY?.trim()) return { ok: false, error: "Background server AI is not configured." };
  const userId = await requireUserId();
  const id = `bg_${crypto.randomUUID()}`;
  const effort = Math.max(0, Math.min(100, Math.round(input.effort)));
  const payload = { ...input, effort, currentHtml: input.currentHtml ? input.currentHtml.slice(0, 16000) : null };
  const sql = await getSql();
  await sql`insert into hive_background_jobs (id, user_id, project_id, status, payload) values (${id}, ${userId}, ${input.projectId}, 'queued', ${JSON.stringify(payload)}::jsonb)`;
  waitUntil(processJob(id, payload, userId));
  return { ok: true, jobId: id };
}

export async function readBackgroundJobs(id?: string): Promise<StoredJob[]> {
  const userId = await requireUserId();
  const sql = await getSql();
  if (id) {
    const rows = await sql<{
      id: string; project_id: string; status: StoredJob["status"]; result: (McTaskResult & { ok: true }) | null;
      error: string | null; created_at: string;
    }>`select id, project_id, status, result, error, created_at from hive_background_jobs where user_id = ${userId} and id = ${id} limit 1`;
    return rows.map((r) => ({ id: r.id, projectId: r.project_id, status: r.status, result: r.result ?? undefined, error: r.error ?? undefined, createdAt: Date.parse(r.created_at) }));
  }
  const rows = await sql<{
    id: string; project_id: string; status: StoredJob["status"]; result: (McTaskResult & { ok: true }) | null;
    error: string | null; created_at: string;
  }>`select id, project_id, status, result, error, created_at from hive_background_jobs where user_id = ${userId} and status in ('queued','running','complete','error') order by created_at desc limit 20`;
  return rows.map((r) => ({ id: r.id, projectId: r.project_id, status: r.status, result: r.result ?? undefined, error: r.error ?? undefined, createdAt: Date.parse(r.created_at) }));
}

export async function cancelBackgroundJob(id: string): Promise<void> {
  const userId = await requireUserId();
  const sql = await getSql();
  await sql`update hive_background_jobs set status = 'cancelled', updated_at = now() where user_id = ${userId} and id = ${id} and status in ('queued','running')`;
}

export async function consumeBackgroundJob(id: string): Promise<void> {
  const userId = await requireUserId();
  const sql = await getSql();
  await sql`delete from hive_background_jobs where user_id = ${userId} and id = ${id}`;
}
