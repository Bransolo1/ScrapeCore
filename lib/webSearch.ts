/**
 * Multi-provider web search with automatic fallback.
 *
 * Provider priority (based on available API keys):
 *  1. Brave Search API  — free tier (2000 queries/month), reliable
 *  2. SearXNG           — self-hosted, unlimited, no API key required (needs SEARXNG_URL)
 *  3. DuckDuckGo HTML   — zero-config fallback, can be rate-limited/blocked
 *
 * Each provider is tried in order. If a provider returns 0 results or errors,
 * the next provider is attempted automatically.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  results: SearchResult[];
  provider: string;
  failed: boolean;
}

interface ProviderFn {
  name: string;
  available: () => boolean;
  search: (query: string, limit: number) => Promise<SearchResult[]>;
}

// ─── DuckDuckGo (existing fallback) ─────────────────────────────────────────

const DDG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
};

// Simple semaphore to limit concurrent DDG requests
let ddgActiveRequests = 0;
const DDG_MAX_CONCURRENT = 3;

async function ddgAcquire(): Promise<void> {
  while (ddgActiveRequests >= DDG_MAX_CONCURRENT) {
    await new Promise((r) => setTimeout(r, 200));
  }
  ddgActiveRequests++;
}

function ddgRelease(): void {
  ddgActiveRequests = Math.max(0, ddgActiveRequests - 1);
}

async function searchDDG(query: string, limit: number): Promise<SearchResult[]> {
  await ddgAcquire();
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
          { headers: DDG_HEADERS, signal: AbortSignal.timeout(10_000) }
        );
        if (!res.ok) {
          if (attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
          return [];
        }

        const html = await res.text();

        // Detect captcha / block pages
        if (
          html.includes("Please try again") ||
          html.includes("unusual traffic") ||
          html.includes("bot detection") ||
          html.includes("captcha")
        ) {
          if (attempt === 0) { await new Promise((r) => setTimeout(r, 2000)); continue; }
          return [];
        }

        return parseDDGResults(html, limit);
      } catch {
        if (attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
        return [];
      }
    }
    return [];
  } finally {
    ddgRelease();
  }
}

function parseDDGResults(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];

  const linkRe = /class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
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

    if (url.includes("duckduckgo.com") || url.includes("duck.co")) continue;

    const cleanTitle = title.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!cleanTitle || !url.startsWith("http")) continue;

    results.push({ title: cleanTitle, url, snippet: snippets[i] ?? "" });
  }

  return results;
}

// ─── Brave Search API ────────────────────────────────────────────────────────

function getBraveKey(): string | undefined {
  return process.env.BRAVE_SEARCH_API_KEY;
}

async function searchBrave(query: string, limit: number): Promise<SearchResult[]> {
  const key = getBraveKey();
  if (!key) return [];

  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(limit, 20)),
  });

  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key,
      },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  const webResults = data?.web?.results ?? [];

  return webResults.slice(0, limit).map((r: { title?: string; url?: string; description?: string }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.description ?? "",
  }));
}

// ─── SearXNG (self-hosted) ───────────────────────────────────────────────────

function getSearxngUrl(): string | undefined {
  return process.env.SEARXNG_URL;
}

async function searchSearxng(query: string, limit: number): Promise<SearchResult[]> {
  const baseUrl = getSearxngUrl();
  if (!baseUrl) return [];

  const params = new URLSearchParams({
    q: query,
    format: "json",
    engines: "google,bing,duckduckgo",
  });

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/search?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const results = data?.results ?? [];

  return results.slice(0, limit).map((r: { title?: string; url?: string; content?: string }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.content ?? "",
  }));
}

// ─── Provider chain ──────────────────────────────────────────────────────────

const providers: ProviderFn[] = [
  {
    name: "brave",
    available: () => !!getBraveKey(),
    search: searchBrave,
  },
  {
    name: "searxng",
    available: () => !!getSearxngUrl(),
    search: searchSearxng,
  },
  {
    name: "duckduckgo",
    available: () => true, // always available as fallback
    search: searchDDG,
  },
];

/**
 * Search the web using the best available provider with automatic fallback.
 *
 * Tries providers in order: Brave → SearXNG → DuckDuckGo.
 * Returns results from the first provider that succeeds.
 */
export async function webSearch(
  query: string,
  limit: number = 10,
): Promise<WebSearchResponse> {
  for (const provider of providers) {
    if (!provider.available()) continue;

    try {
      const results = await provider.search(query, limit);
      if (results.length > 0) {
        return { results, provider: provider.name, failed: false };
      }
    } catch {
      // Provider failed, try next
    }
  }

  return { results: [], provider: "none", failed: true };
}

/**
 * Extract URLs from search results — convenience for discovery functions
 * that only need the URL list.
 */
export async function webSearchUrls(
  query: string,
  limit: number = 10,
): Promise<{ urls: string[]; failed: boolean; provider: string }> {
  const response = await webSearch(query, limit);
  return {
    urls: response.results.map((r) => r.url),
    failed: response.failed,
    provider: response.provider,
  };
}
