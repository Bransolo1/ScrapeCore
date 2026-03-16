import { parseRssItems } from "@/lib/scraper";
import type { RssFeedItem } from "@/lib/scraper";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; BehaviourInsight/1.0; +https://github.com/Bransolo1/ScrapeCore)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
};

async function fetchFeed(url: string): Promise<{ items: RssFeedItem[]; error?: string }> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { items: [], error: "Only http/https URLs are supported" };
    }

    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });

    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };

    const text = await res.text();
    const items = parseRssItems(text, url);

    if (items.length === 0) {
      return { items: [], error: "No items found — URL may not be an RSS/Atom feed" };
    }

    return { items };
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { urls } = (await req.json()) as { urls: string[] };

    if (!Array.isArray(urls) || urls.length === 0) {
      return Response.json({ error: "No RSS URLs provided" }, { status: 400 });
    }

    const limited = urls.slice(0, 10);

    const settled = await Promise.allSettled(limited.map((url) => fetchFeed(url)));

    const allItems: RssFeedItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      if (result.status === "fulfilled") {
        allItems.push(...result.value.items);
        if (result.value.error) errors.push(`${limited[i]}: ${result.value.error}`);
      } else {
        errors.push(
          `${limited[i]}: ${result.reason instanceof Error ? result.reason.message : "Unknown error"}`
        );
      }
    }

    return Response.json({
      items: allItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
