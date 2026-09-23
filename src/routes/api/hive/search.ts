import { createFileRoute } from "@tanstack/react-router";
import { searchWebServer } from "@/lib/hive/web-search.server";

export const Route = createFileRoute("/api/hive/search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { query?: string };
          const query = body.query?.trim().slice(0, 500) ?? "";
          if (!query) return Response.json({ results: [] });
          const results = await searchWebServer(query);
          return Response.json({ results });
        } catch (err) {
          return Response.json(
            { results: [], error: err instanceof Error ? err.message : "Web search failed." },
            { status: 200 },
          );
        }
      },
    },
  },
});
