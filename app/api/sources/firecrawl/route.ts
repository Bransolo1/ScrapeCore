// POST /api/sources/firecrawl
// Scrapes URLs via Firecrawl API (handles JS-heavy sites, SPAs, dynamic content)
// Falls back to the standard /api/scrape if no FIRECRAWL_API_KEY is set
// Body: { urls: string[] }

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";
const MAX_URLS = 15;
const CHAR_LIMIT = 32_000;

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

async function scrapeWithFirecrawl(
  url: string,
  apiKey: string
): Promise<{ title: string; text: string; wordCount: number; success: boolean; error?: string }> {
  const res = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      excludeTags: ["nav", "footer", "header", "aside", "script", "style"],
      timeout: 30000,
    }),
    signal: AbortSignal.timeout(40_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Firecrawl ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as FirecrawlResponse;
  if (!data.success || !data.data?.markdown) {
    throw new Error(data.error ?? "Firecrawl returned no content");
  }

  const text = data.data.markdown.slice(0, CHAR_LIMIT);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    title: data.data.metadata?.title ?? new URL(url).hostname,
    text,
    wordCount,
    success: true,
  };
}

import { requireAuth } from "@/lib/apiAuth";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { validateCSRF } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const resolved = await resolveApiKey("firecrawl", auth.userId);
  if (!resolved) {
    return Response.json(
      { error: "No Firecrawl API key configured. Add your key in Settings.", code: "no_api_key" },
      { status: 503 }
    );
  }
  const apiKey = resolved.key;

  let body: { urls?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrls = Array.isArray(body.urls) ? body.urls : [];
  const urls = rawUrls
    .filter((u): u is string => typeof u === "string")
    .slice(0, MAX_URLS)
    .filter((u) => {
      try { return ["http:", "https:"].includes(new URL(u).protocol); } catch { return false; }
    });

  if (!urls.length) {
    return Response.json({ error: "No valid URLs provided" }, { status: 400 });
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const result = await scrapeWithFirecrawl(url, apiKey);
        return { url, ...result };
      } catch (err) {
        return {
          url,
          title: new URL(url).hostname,
          text: "",
          wordCount: 0,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    })
  );

  return Response.json({ results });
}
