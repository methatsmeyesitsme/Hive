import { waitUntil } from "@vercel/functions";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { buildPlan, extractHtml, isUsablePage, looksLikeApp, pageTitle, polishHtml, replyLine } from "./mc-parse";
import type { ExecPlan, McTaskResult } from "./types";

export type BackgroundInput = {
  projectId: string;
  prompt: string;
  history: { role: "user" | "mc"; content: string }[];
  attachments: { name: string; mime: string; kind: "image" | "file"; textExcerpt?: string }[];
  memory: { title: string; content: string }[];
  currentHtml?: string | null;
  projectName: string;
  effort: number;
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
REPLY: <one short sentence>
Then one complete self-contained HTML5 document beginning with <!doctype html>.
Use inline CSS and plain JavaScript only. No external libraries or network requests.
Do not explain the code outside the reply line and HTML.`;

function modelTokens(effort: number): number {
  const n = Math.max(0, Math.min(100, effort));
  return Math.round(1800 + n * 16);
}

function agentPrompt(role: string, request: string): string {
  return `You are independent Hive background agent ${role}. Analyze only this request from your own context. Do not write the final page. Return 2-4 concise implementation bullets. Request: ${request}`;
}

async function xai(messages: { role: "system" | "user"; content: string }[], maxTokens: number): Promise<string> {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) throw new Error("Background server AI is not configured.");
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.HIVE_BACKGROUND_MODEL?.trim() || "grok-4.5",
      temperature: 0.4,
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

function buildUserBlock(input: BackgroundInput, findings: string[]): string {
  const history = input.history.slice(-3).map((m) => `${m.role === "mc" ? "MC" : "Human"}: ${m.content.slice(0, 280)}`).join("\n");
  const memory = input.memory.slice(0, 6).map((m) => `- ${m.title}: ${m.content.slice(0, 280)}`).join("\n");
  const files = input.attachments.filter((a) => a.kind === "file" && a.textExcerpt).map((a) => `- ${a.name}: ${a.textExcerpt!.slice(0, 1200)}`).join("\n");
  return [
    `Project: ${input.projectName}`,
    history ? `Recent conversation:\n${history}` : "",
    memory ? `Useful memory:\n${memory}` : "",
    files ? `Attached text files:\n${files}` : "",
    findings.length ? `Independent agent findings:\n${findings.map((f, i) => `Agent ${i + 1}: ${f.slice(0, 700)}`).join("\n")}` : "",
    input.currentHtml ? `Current page to revise:\n${input.currentHtml.slice(0, 16000)}` : "",
    `Human request:\n${input.prompt}`,
  ].filter(Boolean).join("\n\n");
}

async function processJob(id: string, input: BackgroundInput, userId: string): Promise<void> {
  const sql = await getSql();
  await sql`update hive_background_jobs set status = 'running', updated_at = now() where id = ${id} and user_id = ${userId}`;
  try {
    const app = looksLikeApp(input.prompt);
    const requests = [
      { role: "system" as const, content: agentPrompt("S1", app ? "Determine the interaction logic and edge cases." : "Extract essential structure, semantics, behavior, and content.") },
      { role: "system" as const, content: agentPrompt("S2", "Determine a distinctive visual system, responsive behavior, and compact styling direction.") },
    ];
    const agentResults = await Promise.all([
      xai([{ role: "system", content: requests[0].content }, { role: "user", content: input.prompt }], 180),
      xai([{ role: "system", content: requests[1].content }, { role: "user", content: input.prompt }], 180),
    ]);

    const content = await xai(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserBlock(input, agentResults) },
      ],
      modelTokens(input.effort),
    );
    let html = extractHtml(content);
    if (html) html = polishHtml(html);
    if (!html || !isUsablePage(html)) {
      const repaired = await xai(
        [
          { role: "system", content: "You are an HTML repair worker. Return only one complete self-contained HTML5 page. Finish the supplied page while preserving the request and design." },
          { role: "user", content: `Request: ${input.prompt}\nPartial page:\n${content.slice(0, 12000)}` },
        ],
        Math.max(1200, Math.round(modelTokens(input.effort) * 0.6)),
      );
      html = repaired ? extractHtml(repaired) : null;
      if (html) html = polishHtml(html);
    }
    if (!html || !isUsablePage(html)) throw new Error("The background builder could not produce a complete page.");

    const plan: ExecPlan = {
      objective: input.prompt.slice(0, 240),
      strategy: "Independent background agents analyzed the request, then MC generated and validated the final page.",
      researchNeeded: false,
      researchTopic: "",
      lieutenants: buildPlan(true),
    };
    const result: McTaskResult & { ok: true } = {
      ok: true,
      mcMessage: replyLine(content) || "Hive finished the requested work in the background.",
      projectName: pageTitle(html, input.projectName || "Hive result"),
      plan,
      artifact: {
        title: pageTitle(html, input.projectName || "Hive result"),
        kind: "website",
        html,
        files: [{ path: "index.html", content: html }],
        ready: true,
      },
      memory: [],
    };
    await sql`update hive_background_jobs set status = 'complete', result = ${JSON.stringify(result)}::jsonb, error = null, updated_at = now() where id = ${id} and user_id = ${userId}`;
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

export async function consumeBackgroundJob(id: string): Promise<void> {
  const userId = await requireUserId();
  const sql = await getSql();
  await sql`delete from hive_background_jobs where user_id = ${userId} and id = ${id}`;
}
