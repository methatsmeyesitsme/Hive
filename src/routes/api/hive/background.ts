import { createFileRoute } from "@tanstack/react-router";
import {
  cancelBackgroundJob,
  consumeBackgroundJob,
  enqueueBackgroundJob,
  readBackgroundJobs,
  type BackgroundInput,
} from "@/lib/hive/background.server";

export const Route = createFileRoute("/api/hive/background")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const id = new URL(request.url).searchParams.get("id") ?? undefined;
          const jobs = await readBackgroundJobs(id);
          if (id) {
            const job = jobs[0];
            return job ? Response.json(job) : Response.json({ error: "Not found" }, { status: 404 });
          }
          return Response.json({ jobs });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 401 });
        }
      },

      POST: async ({ request }) => {
        try {
          const input = (await request.json()) as Partial<BackgroundInput> & {
            action?: string;
            id?: string;
          };

          if (input.action === "cancel") {
            if (!input.id) return Response.json({ error: "Missing job id." }, { status: 400 });
            await cancelBackgroundJob(input.id);
            return Response.json({ ok: true });
          }

          if (!input.projectId || !input.prompt || !input.projectName) {
            return Response.json({ error: "Invalid background job payload." }, { status: 400 });
          }

          const result = await enqueueBackgroundJob(input as BackgroundInput);
          return result.ok
            ? Response.json({ jobId: result.jobId }, { status: 202 })
            : Response.json({ error: result.error }, { status: 503 });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Background job failed." },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ request }) => {
        try {
          const id = new URL(request.url).searchParams.get("id");
          if (!id) return Response.json({ error: "Missing job id." }, { status: 400 });
          await consumeBackgroundJob(id);
          return new Response(null, { status: 204 });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Could not consume job." },
            { status: 500 },
          );
        }
      },
    },
  },
});
