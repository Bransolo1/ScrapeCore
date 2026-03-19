/**
 * POST /api/discover
 *
 * Takes a company name (and optional domain) and auto-discovers identifiers
 * across all supported platforms: Reddit subreddits, Trustpilot domain,
 * App Store ID, Google Play package, G2 slug, Capterra slug, StockTwits symbol.
 *
 * All searches run in parallel — typically completes in 2-4 seconds.
 */

import { requireAuth } from "@/lib/apiAuth";

// ─── DuckDuckGo search helper ───────────────────────────────────────────────

const DDG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-GB,en;q=0.9",
};

async function ddgSearch(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: DDG_HEADERS, signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return [];
    const html = await res.text();

    // Extract URLs from DDG redirect links
    const urls: string[] = [];
    const re = /uddg=([^&"]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try {
        urls.push(decodeURIComponent(m[1]));
      } catch { /* skip malformed */ }
    }
    return urls;
  } catch {
    return [];
  }
}

// ─── Platform-specific discovery functions ───────────────────────────────────

async function discoverReddit(company: string): Promise<{ subreddits: string[]; query: string }> {
  const query = `"${company}" review OR complaints OR experience`;
  try {
    // Reddit subreddit search API (public, no auth)
    const res = await fetch(
      `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(company)}&limit=8`,
      {
        headers: { "User-Agent": "ScrapeCore/1.0 (research tool)" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) return { subreddits: [], query };

    const data = await res.json();
    const subs: string[] = (data?.data?.children ?? [])
      .filter((c: { data: { subscribers?: number } }) => (c.data.subscribers ?? 0) > 500)
      .map((c: { data: { display_name: string } }) => c.data.display_name)
      .slice(0, 5);

    return { subreddits: subs, query };
  } catch {
    return { subreddits: [], query };
  }
}

async function discoverTrustpilot(company: string): Promise<{ domain: string | null; found: boolean }> {
  const urls = await ddgSearch(`"${company}" site:trustpilot.com/review`);
  for (const url of urls) {
    const match = url.match(/trustpilot\.com\/review\/([a-zA-Z0-9.-]+)/i);
    if (match) return { domain: match[1], found: true };
  }
  return { domain: null, found: false };
}

async function discoverAppStore(company: string, country = "gb"): Promise<{
  appId: string | null;
  appName: string | null;
  found: boolean;
}> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(company)}&entity=software&country=${country}&limit=5`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return { appId: null, appName: null, found: false };

    const data = await res.json();
    const results = data?.results ?? [];
    if (results.length === 0) return { appId: null, appName: null, found: false };

    // Pick best match — prefer exact name match, fallback to first
    const companyLower = company.toLowerCase();
    const exact = results.find(
      (r: { trackName: string }) => r.trackName.toLowerCase().includes(companyLower)
    );
    const best = exact ?? results[0];

    return {
      appId: String(best.trackId),
      appName: best.trackName,
      found: true,
    };
  } catch {
    return { appId: null, appName: null, found: false };
  }
}

async function discoverGooglePlay(company: string): Promise<{
  packageId: string | null;
  appName: string | null;
  found: boolean;
}> {
  const urls = await ddgSearch(`"${company}" app site:play.google.com/store/apps/details`);
  for (const url of urls) {
    const match = url.match(/play\.google\.com\/store\/apps\/details\?.*?id=([a-zA-Z0-9_.]+)/i);
    if (match) {
      // Extract app name from URL or return package ID as name
      return { packageId: match[1], appName: null, found: true };
    }
  }
  return { packageId: null, appName: null, found: false };
}

async function discoverG2(company: string): Promise<{ slug: string | null; found: boolean }> {
  const urls = await ddgSearch(`"${company}" site:g2.com/products`);
  for (const url of urls) {
    const match = url.match(/g2\.com\/products\/([a-zA-Z0-9-]+)/i);
    if (match && match[1] !== "best") return { slug: match[1], found: true };
  }
  return { slug: null, found: false };
}

async function discoverCapterra(company: string): Promise<{ slug: string | null; found: boolean }> {
  const urls = await ddgSearch(`"${company}" reviews site:capterra.com`);
  for (const url of urls) {
    // Pattern: /p/123456/slug or /software/slug
    const match = url.match(/capterra\.com\/(?:p\/\d+\/|software\/)([a-zA-Z0-9-]+)/i);
    if (match) return { slug: match[1], found: true };
    // Pattern: /reviews/12345/slug
    const match2 = url.match(/capterra\.com\/reviews\/\d+\/([a-zA-Z0-9-]+)/i);
    if (match2) return { slug: match2[1], found: true };
  }
  return { slug: null, found: false };
}

async function discoverStockTwits(company: string): Promise<{ symbol: string | null; found: boolean }> {
  const urls = await ddgSearch(`"${company}" site:stocktwits.com/symbol`);
  for (const url of urls) {
    const match = url.match(/stocktwits\.com\/symbol\/([A-Z0-9.]+)/i);
    if (match) return { symbol: match[1].toUpperCase(), found: true };
  }
  return { symbol: null, found: false };
}

async function discoverDomain(company: string): Promise<string | null> {
  const urls = await ddgSearch(`"${company}" official website`);
  for (const url of urls) {
    try {
      const u = new URL(url);
      // Skip social/review/search sites
      const skip = ["google.", "facebook.", "twitter.", "linkedin.", "wikipedia.", "youtube.",
        "trustpilot.", "g2.", "capterra.", "reddit.", "duckduckgo.", "bing."];
      if (skip.some((s) => u.hostname.includes(s))) continue;
      return u.hostname.replace(/^www\./, "");
    } catch { continue; }
  }
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscoveryResult {
  company: string;
  domain: string | null;
  reddit: { subreddits: string[]; query: string };
  trustpilot: { domain: string | null; found: boolean };
  appstore: { appId: string | null; appName: string | null; found: boolean };
  googleplay: { packageId: string | null; appName: string | null; found: boolean };
  g2: { slug: string | null; found: boolean };
  capterra: { slug: string | null; found: boolean };
  stocktwits: { symbol: string | null; found: boolean };
  queries: {
    hackernews: string;
    googlenews: string;
    twitter: string;
    perplexity: string;
  };
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let body: { company?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (!company) {
    return Response.json({ error: "Company name is required" }, { status: 400 });
  }

  // Run all discoveries in parallel
  const [
    reddit,
    trustpilot,
    appstore,
    googleplay,
    g2,
    capterra,
    stocktwits,
    autoDetectedDomain,
  ] = await Promise.all([
    discoverReddit(company),
    discoverTrustpilot(company),
    discoverAppStore(company),
    discoverGooglePlay(company),
    discoverG2(company),
    discoverCapterra(company),
    discoverStockTwits(company),
    body.domain ? Promise.resolve(body.domain) : discoverDomain(company),
  ]);

  const domain = typeof autoDetectedDomain === "string" ? autoDetectedDomain : null;

  const result: DiscoveryResult = {
    company,
    domain,
    reddit,
    trustpilot,
    appstore,
    googleplay,
    g2,
    capterra,
    stocktwits,
    queries: {
      hackernews: company,
      googlenews: company,
      twitter: `${company} review OR problem OR experience`,
      perplexity: `${company} user reviews customer feedback complaints praise`,
    },
  };

  return Response.json(result);
}
