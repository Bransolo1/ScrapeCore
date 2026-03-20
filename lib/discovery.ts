/**
 * Shared discovery logic — used by both /api/discover route and cron monitoring.
 * Auto-discovers platform identifiers for a company name via parallel searches.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscoveryResult {
  company: string;
  domain: string | null;
  reddit: { subreddits: string[]; query: string };
  trustpilot: { domain: string | null; found: boolean; searchFailed?: boolean };
  appstore: { appId: string | null; appName: string | null; found: boolean };
  googleplay: { packageId: string | null; appName: string | null; found: boolean; searchFailed?: boolean };
  g2: { slug: string | null; found: boolean; searchFailed?: boolean };
  capterra: { slug: string | null; found: boolean; searchFailed?: boolean };
  stocktwits: { symbol: string | null; found: boolean; searchFailed?: boolean };
  linkedin: { slug: string | null; url: string | null; found: boolean; searchFailed?: boolean };
  glassdoor: { slug: string | null; url: string | null; found: boolean; searchFailed?: boolean };
  producthunt: { slug: string | null; url: string | null; found: boolean; searchFailed?: boolean };
  bbb: { url: string | null; found: boolean; searchFailed?: boolean };
  youtube: { channelUrl: string | null; found: boolean; searchFailed?: boolean };
  queries: {
    hackernews: string;
    googlenews: string;
    twitter: string;
    perplexity: string;
  };
  searchErrors?: string[];
  cached?: boolean;
}

// ─── Discovery cache (24h TTL, max 500 entries) ─────────────────────────────

const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const discoveryCache = new Map<string, { result: DiscoveryResult; expiresAt: number }>();

export function getCachedDiscovery(company: string): DiscoveryResult | null {
  const key = company.toLowerCase().trim();
  const entry = discoveryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { discoveryCache.delete(key); return null; }
  return entry.result;
}

function setCache(company: string, result: DiscoveryResult) {
  const key = company.toLowerCase().trim();
  if (discoveryCache.size >= CACHE_MAX) {
    const oldest = discoveryCache.keys().next().value;
    if (oldest !== undefined) discoveryCache.delete(oldest);
  }
  discoveryCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL });
}

// ─── DuckDuckGo search helper ───────────────────────────────────────────────

const DDG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-GB,en;q=0.9",
};

async function ddgSearch(query: string, retries = 1): Promise<{ urls: string[]; failed: boolean }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        { headers: DDG_HEADERS, signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) {
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 2000)); continue; }
        return { urls: [], failed: true };
      }
      const html = await res.text();
      const urls: string[] = [];
      const re = /uddg=([^&"]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        try { urls.push(decodeURIComponent(m[1])); } catch { /* skip malformed */ }
      }
      return { urls, failed: false };
    } catch {
      if (attempt < retries) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      return { urls: [], failed: true };
    }
  }
  return { urls: [], failed: true };
}

// ─── Platform-specific discovery functions ───────────────────────────────────

async function discoverReddit(company: string): Promise<{ subreddits: string[]; query: string }> {
  const query = `"${company}" review OR complaints OR experience`;
  try {
    const res = await fetch(
      `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(company)}&limit=8`,
      { headers: { "User-Agent": "ScrapeCore/1.0 (research tool)" }, signal: AbortSignal.timeout(8_000) }
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

async function discoverTrustpilot(company: string): Promise<{ domain: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" site:trustpilot.com/review`);
  for (const url of urls) {
    const match = url.match(/trustpilot\.com\/review\/([a-zA-Z0-9.-]+)/i);
    if (match) return { domain: match[1], found: true };
  }
  return { domain: null, found: false, searchFailed: failed };
}

async function discoverAppStore(company: string, country = "gb"): Promise<{ appId: string | null; appName: string | null; found: boolean }> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(company)}&entity=software&country=${country}&limit=5`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return { appId: null, appName: null, found: false };
    const data = await res.json();
    const results = data?.results ?? [];
    if (results.length === 0) return { appId: null, appName: null, found: false };
    const companyLower = company.toLowerCase();
    const exact = results.find((r: { trackName: string }) => r.trackName.toLowerCase().includes(companyLower));
    const best = exact ?? results[0];
    return { appId: String(best.trackId), appName: best.trackName, found: true };
  } catch {
    return { appId: null, appName: null, found: false };
  }
}

async function discoverGooglePlay(company: string): Promise<{ packageId: string | null; appName: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" app site:play.google.com/store/apps/details`);
  for (const url of urls) {
    const match = url.match(/play\.google\.com\/store\/apps\/details\?.*?id=([a-zA-Z0-9_.]+)/i);
    if (match) return { packageId: match[1], appName: null, found: true };
  }
  return { packageId: null, appName: null, found: false, searchFailed: failed };
}

async function discoverG2(company: string): Promise<{ slug: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" site:g2.com/products`);
  for (const url of urls) {
    const match = url.match(/g2\.com\/products\/([a-zA-Z0-9-]+)/i);
    if (match && match[1] !== "best") return { slug: match[1], found: true };
  }
  return { slug: null, found: false, searchFailed: failed };
}

async function discoverCapterra(company: string): Promise<{ slug: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" reviews site:capterra.com`);
  for (const url of urls) {
    const match = url.match(/capterra\.com\/(?:p\/\d+\/|software\/)([a-zA-Z0-9-]+)/i);
    if (match) return { slug: match[1], found: true };
    const match2 = url.match(/capterra\.com\/reviews\/\d+\/([a-zA-Z0-9-]+)/i);
    if (match2) return { slug: match2[1], found: true };
  }
  return { slug: null, found: false, searchFailed: failed };
}

async function discoverStockTwits(company: string): Promise<{ symbol: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" site:stocktwits.com/symbol`);
  for (const url of urls) {
    const match = url.match(/stocktwits\.com\/symbol\/([A-Z0-9.]+)/i);
    if (match) return { symbol: match[1].toUpperCase(), found: true };
  }
  return { symbol: null, found: false, searchFailed: failed };
}

async function discoverDomain(company: string): Promise<string | null> {
  const { urls } = await ddgSearch(`"${company}" official website`);
  for (const url of urls) {
    try {
      const u = new URL(url);
      const skip = ["google.", "facebook.", "twitter.", "linkedin.", "wikipedia.", "youtube.",
        "trustpilot.", "g2.", "capterra.", "reddit.", "duckduckgo.", "bing."];
      if (skip.some((s) => u.hostname.includes(s))) continue;
      return u.hostname.replace(/^www\./, "");
    } catch { continue; }
  }
  return null;
}

async function discoverLinkedIn(company: string): Promise<{ slug: string | null; url: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" site:linkedin.com/company`);
  for (const url of urls) {
    const match = url.match(/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1] !== "company") return { slug: match[1], url, found: true };
  }
  return { slug: null, url: null, found: false, searchFailed: failed };
}

async function discoverGlassdoor(company: string): Promise<{ slug: string | null; url: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" reviews site:glassdoor.com/Reviews`);
  for (const url of urls) {
    const match = url.match(/glassdoor\.com\/Reviews\/([a-zA-Z0-9-]+-Reviews-E\d+)/i);
    if (match) return { slug: match[1], url, found: true };
    const match2 = url.match(/glassdoor\.com\/Reviews\/([a-zA-Z0-9-]+)/i);
    if (match2 && match2[1] !== "index") return { slug: match2[1], url, found: true };
  }
  return { slug: null, url: null, found: false, searchFailed: failed };
}

async function discoverProductHunt(company: string): Promise<{ slug: string | null; url: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" site:producthunt.com/products`);
  for (const url of urls) {
    const match = url.match(/producthunt\.com\/products\/([a-zA-Z0-9-]+)/i);
    if (match) return { slug: match[1], url, found: true };
  }
  return { slug: null, url: null, found: false, searchFailed: failed };
}

async function discoverBBB(company: string): Promise<{ url: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" site:bbb.org`);
  for (const url of urls) {
    if (url.includes("bbb.org/us/") || url.includes("bbb.org/ca/")) return { url, found: true };
  }
  return { url: null, found: false, searchFailed: failed };
}

async function discoverYouTube(company: string): Promise<{ channelUrl: string | null; found: boolean; searchFailed?: boolean }> {
  const { urls, failed } = await ddgSearch(`"${company}" official channel site:youtube.com`);
  for (const url of urls) {
    const match = url.match(/youtube\.com\/(?:@[\w-]+|channel\/[\w-]+|c\/[\w-]+|user\/[\w-]+)/i);
    if (match) return { channelUrl: match[0].startsWith("http") ? match[0] : `https://www.${match[0]}`, found: true };
  }
  return { channelUrl: null, found: false, searchFailed: failed };
}

// ─── Main discovery function ─────────────────────────────────────────────────

export async function discoverCompany(company: string, providedDomain?: string): Promise<DiscoveryResult> {
  // Check cache first
  const cached = getCachedDiscovery(company);
  if (cached) return { ...cached, cached: true };

  const [
    reddit, trustpilot, appstore, googleplay, g2, capterra, stocktwits,
    linkedin, glassdoor, producthunt, bbb, youtube, autoDetectedDomain,
  ] = await Promise.all([
    discoverReddit(company),
    discoverTrustpilot(company),
    discoverAppStore(company),
    discoverGooglePlay(company),
    discoverG2(company),
    discoverCapterra(company),
    discoverStockTwits(company),
    discoverLinkedIn(company),
    discoverGlassdoor(company),
    discoverProductHunt(company),
    discoverBBB(company),
    discoverYouTube(company),
    providedDomain ? Promise.resolve(providedDomain) : discoverDomain(company),
  ]);

  const domain = typeof autoDetectedDomain === "string" ? autoDetectedDomain : null;

  const searchErrors: string[] = [];
  const failChecks: [{ searchFailed?: boolean }, string][] = [
    [trustpilot, "Trustpilot"], [googleplay, "Google Play"], [g2, "G2"],
    [capterra, "Capterra"], [stocktwits, "StockTwits"], [linkedin, "LinkedIn"],
    [glassdoor, "Glassdoor"], [producthunt, "Product Hunt"], [bbb, "BBB"], [youtube, "YouTube"],
  ];
  for (const [src, label] of failChecks) {
    if (src.searchFailed) searchErrors.push(`${label} search failed`);
  }

  const result: DiscoveryResult = {
    company, domain, reddit, trustpilot, appstore, googleplay, g2, capterra,
    stocktwits, linkedin, glassdoor, producthunt, bbb, youtube,
    queries: {
      hackernews: company,
      googlenews: company,
      twitter: `${company} review OR problem OR experience`,
      perplexity: `${company} user reviews customer feedback complaints praise`,
    },
    searchErrors: searchErrors.length > 0 ? searchErrors : undefined,
  };

  setCache(company, result);
  return result;
}
