import type { WebSearchResult } from "@/lib/scraper";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";

// DuckDuckGo HTML version — no API key required, explicitly scraper-friendly
const DDG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
};

function parseDDGResults(html: string, limit: number): WebSearchResult[] {
  const results: WebSearchResult[] = [];

  // Match anchors with class result__a — title and redirect URL
  const linkRe = /class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  // Match snippet divs in order
  const snippetAllRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/(?:div|a)>/gi;

  const links: { href: string; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    links.push({ href: m[1], title: m[2] });
  }

  const snippets: string[] = [];
  while ((m = snippetAllRe.exec(html)) !== null) {
    snippets.push(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }

  for (let i = 0; i < links.length && results.length < limit; i++) {
    const { href, title } = links[i];

    // DDG redirect URLs: /l/?uddg=ENCODED_URL&rut=...
    let url: string;
    if (href.includes("uddg=")) {
      const uddgMatch = href.match(/uddg=([^&]+)/);
      if (!uddgMatch) continue;
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {
        continue;
      }
    } else if (href.startsWith("http")) {
      url = href;
    } else {
      continue;
    }

    // Skip DDG internal and ad links
    if (url.includes("duckduckgo.com") || url.includes("duck.co")) continue;

    const cleanTitle = title.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!cleanTitle || !url.startsWith("http")) continue;

    results.push({
      title: cleanTitle,
      url,
      snippet: snippets[i] ?? "",
      source: "websearch",
    });
  }

  return results;
}

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

    for (const query of queryList) {
      if (!query?.trim()) continue;
      try {
        const res = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
          {
            headers: DDG_HEADERS,
            signal: AbortSignal.timeout(12_000),
          }
        );

        if (!res.ok) {
          errors.push(`"${query}": HTTP ${res.status}`);
          continue;
        }

        const html = await res.text();
        const results = parseDDGResults(html, limit);

        for (const r of results) {
          if (!seen.has(r.url)) {
            seen.add(r.url);
            allResults.push(r);
          }
        }
      } catch (err) {
        errors.push(`"${query}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return Response.json({
      results: allResults.slice(0, limit * queryList.length),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
