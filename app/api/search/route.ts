import type { WebSearchResult } from "@/lib/scraper";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";
import { webSearch } from "@/lib/webSearch";

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { queries, limit = 10 } = (await req.json()) as {
      queries: string | string[];
      limit?: number;
    };

    const queryList = Array.isArray(queries) ? queries.slice(0, 5) : [queries];

    if (!queryList.length || !queryList[0]?.trim()) {
      return Response.json({ error: "No query provided" }, { status: 400 });
    }

    const allResults: WebSearchResult[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    let lastProvider = "none";

    for (const query of queryList) {
      if (!query?.trim()) continue;
      try {
        const response = await webSearch(query, limit);
        lastProvider = response.provider;

        if (response.failed) {
          errors.push(`"${query}": all search providers failed`);
          continue;
        }

        for (const r of response.results) {
          if (!seen.has(r.url)) {
            seen.add(r.url);
            allResults.push({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
              source: "websearch",
            });
          }
        }
      } catch (err) {
        errors.push(`"${query}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return Response.json({
      results: allResults.slice(0, limit * queryList.length),
      provider: lastProvider,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
