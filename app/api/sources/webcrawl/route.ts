import type { Source } from "@/lib/scraper";
import { scrapeUrl, SCRAPE_HEADERS } from "@/lib/scraper";

// ─── URL priority scoring ─────────────────────────────────────────────────────

const PRIORITY_PATTERNS: { re: RegExp; score: number }[] = [
  // Responsible gambling / safer gambling / player protection
  { re: /responsible.?gambl|safer.?gambl|gamble.?aware|self.?exclus|gamstop|deposit.?limit|cooling.?off|player.?protect/i, score: 10 },
  // Regulatory / compliance / licensing
  { re: /regulat|licens|compliance|fca|gambling.?commission|gcb|mga|ukgc/i, score: 9 },
  // Terms / fairness / policies
  { re: /terms|conditions|fair.?play|code.?of.?conduct|ethics|whistleblow/i, score: 8 },
  // About / corporate / values
  { re: /\/about|\/company|\/who.?we.?are|\/our.?values|\/mission|\/vision|\/leadership|\/executive|\/management/i, score: 7 },
  // Help / support / FAQ
  { re: /\/help|\/support|\/faq|\/contact|\/customer.?service/i, score: 6 },
  // News / press / investor relations
  { re: /\/news|\/press|\/media|\/investor|\/investor.?relat|\/ir\/|\/annual.?report/i, score: 5 },
  // Blog / insights
  { re: /\/blog|\/insights|\/articles|\/stories/i, score: 4 },
  // Promotions / bonuses (useful for understanding offer behaviour)
  { re: /\/promot|\/bonus|\/offers|\/rewards/i, score: 3 },
  // Privacy / data
  { re: /\/privacy|\/data.?protect|\/gdpr|\/cookie/i, score: 2 },
  // Careers
  { re: /\/careers|\/jobs|\/vacancies|\/work.?with.?us/i, score: 1 },
];

function scoreUrl(url: string): number {
  const u = url.toLowerCase();
  for (const { re, score } of PRIORITY_PATTERNS) {
    if (re.test(u)) return score;
  }
  return 0;
}

// ─── Internal link extractor ──────────────────────────────────────────────────

function extractInternalLinks(html: string, baseOrigin: string): string[] {
  const seen = new Set<string>();
  const links: string[] = [];

  const hrefRe = /href=["']([^"'#?]+)/gi;
  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;

    let full: string;
    try {
      full = new URL(raw, baseOrigin).href;
    } catch {
      continue;
    }

    // Only same origin
    try {
      if (new URL(full).origin !== baseOrigin) continue;
    } catch {
      continue;
    }

    // Skip assets
    if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|xml|json)(\?|$)/i.test(full)) continue;

    const clean = full.replace(/\/$/, "");
    if (!seen.has(clean)) {
      seen.add(clean);
      links.push(clean);
    }
  }

  return links;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { domain, maxPages = 12 } = (await req.json()) as {
      domain: string;
      maxPages?: number;
    };

    if (!domain?.trim()) {
      return Response.json({ error: "No domain provided" }, { status: 400 });
    }

    // Normalise domain → https://example.com
    let cleanDomain = domain.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
    // Strip paths if user pasted full URL
    const firstSlash = cleanDomain.indexOf("/");
    if (firstSlash !== -1) cleanDomain = cleanDomain.slice(0, firstSlash);

    const baseUrl = `https://${cleanDomain}`;
    const clampedMax = Math.min(Math.max(3, maxPages), 30);

    // 1. Fetch homepage
    let homepageHtml = "";
    let origin = baseUrl;
    try {
      const res = await fetch(baseUrl, {
        headers: SCRAPE_HEADERS,
        signal: AbortSignal.timeout(15_000),
        redirect: "follow",
      });
      if (res.ok) {
        homepageHtml = await res.text();
        origin = new URL(res.url).origin; // follow redirects
      }
    } catch {
      // Try www prefix fallback
      try {
        const fallback = `https://www.${cleanDomain}`;
        const res2 = await fetch(fallback, {
          headers: SCRAPE_HEADERS,
          signal: AbortSignal.timeout(15_000),
          redirect: "follow",
        });
        if (res2.ok) {
          homepageHtml = await res2.text();
          origin = new URL(res2.url).origin;
        }
      } catch {
        return Response.json({ error: `Could not reach ${baseUrl}` }, { status: 502 });
      }
    }

    if (!homepageHtml) {
      return Response.json({ error: `Could not reach ${baseUrl}` }, { status: 502 });
    }

    // 2. Extract and score internal links
    const internalLinks = extractInternalLinks(homepageHtml, origin);

    const scored = internalLinks
      .map((url) => ({ url, score: scoreUrl(url) }))
      .filter((x) => x.score > 0 || x.url !== origin) // keep all scored + homepage
      .sort((a, b) => b.score - a.score);

    // Top N unique links (excluding homepage itself)
    const homepageClean = origin.replace(/\/$/, "");
    const toFetch = scored
      .filter((x) => x.url.replace(/\/$/, "") !== homepageClean)
      .slice(0, clampedMax - 1); // reserve one slot for homepage

    // 3. Scrape homepage + priority pages in parallel
    const urlsToScrape = [origin, ...toFetch.map((x) => x.url)];
    const results = await Promise.allSettled(urlsToScrape.map((url) => scrapeUrl(url)));

    const sources: Source[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        sources.push(result.value);
      }
    }

    return Response.json({
      sources,
      domain: cleanDomain,
      pagesAttempted: urlsToScrape.length,
      pagesSucceeded: sources.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
