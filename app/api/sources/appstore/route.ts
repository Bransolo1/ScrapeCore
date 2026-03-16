import type { AppStoreReview } from "@/lib/scraper";

// Apple's public RSS API for customer reviews — no auth required
// https://itunes.apple.com/{country}/rss/customerreviews/page={n}/id={appId}/sortBy=mostRecent/json

interface AppleRssEntry {
  "im:rating"?: { label?: string };
  "im:version"?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  id?: { label?: string };
  link?: { attributes?: { href?: string } };
}

interface AppleFeedResponse {
  feed?: {
    entry?: AppleRssEntry[];
    title?: { label?: string };
    id?: { label?: string };
  };
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fetchPage(
  appId: string,
  country: string,
  page: number
): Promise<AppStoreReview[]> {
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BehaviourInsight/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 404) return []; // No more pages or app not found
  if (!res.ok) throw new Error(`App Store API returned ${res.status}`);

  const json = (await res.json()) as AppleFeedResponse;
  const entries = json.feed?.entry ?? [];

  // First entry is app metadata on page 1, skip it
  const reviewEntries = entries.filter((e) => e["im:rating"] !== undefined);

  const appStoreUrl = `https://apps.apple.com/${country}/app/id${appId}`;

  return reviewEntries.map((entry): AppStoreReview => ({
    title: decodeHtml(entry.title?.label ?? "(no title)"),
    text: decodeHtml(entry.content?.label ?? ""),
    rating: parseInt(entry["im:rating"]?.label ?? "0", 10),
    version: entry["im:version"]?.label ?? "",
    url: entry.link?.attributes?.href ?? appStoreUrl,
    source: "appstore",
  }));
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { appId, country = "gb", pages = 2 } = (await req.json()) as {
      appId: string;
      country?: string;
      pages?: number;
    };

    if (!appId?.trim()) {
      return Response.json({ error: "No App Store ID provided" }, { status: 400 });
    }

    // Normalise: strip non-numeric characters from ID
    const cleanId = appId.trim().replace(/\D/g, "");
    if (!cleanId) {
      return Response.json(
        { error: "Invalid App Store ID — must be numeric (e.g. 1234567890)" },
        { status: 400 }
      );
    }

    const cleanCountry = country.trim().toLowerCase().slice(0, 2);
    const pageCount = Math.min(Math.max(1, pages), 10); // Apple allows up to 10 pages

    const allReviews: AppStoreReview[] = [];
    const errors: string[] = [];

    for (let page = 1; page <= pageCount; page++) {
      try {
        const pageReviews = await fetchPage(cleanId, cleanCountry, page);
        if (pageReviews.length === 0) break; // No more data
        allReviews.push(...pageReviews);
      } catch (err) {
        errors.push(
          `Page ${page}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        break;
      }
    }

    return Response.json({
      reviews: allReviews,
      appId: cleanId,
      country: cleanCountry,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
