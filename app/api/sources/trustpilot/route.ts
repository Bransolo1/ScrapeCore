import type { TrustpilotReview } from "@/lib/scraper";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
};

// ─── Extract reviews from Trustpilot SSR page ────────────────────────────────

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'");
}

interface RawReview {
  title?: string;
  text?: string;
  rating?: { stars?: number } | number;
  dates?: { publishedDate?: string };
  id?: string;
  // alternate shapes
  reviewBody?: string;
  reviewRating?: { ratingValue?: number | string };
  datePublished?: string;
  name?: string;
}

function extractFromNextData(html: string): TrustpilotReview[] {
  const match = html.match(
    /<script\s+id=["']__NEXT_DATA__["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i
  ) ??
  html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = JSON.parse(match[1]) as any;
    const pageProps = data?.props?.pageProps ?? {};

    // Trustpilot may nest reviews under several keys depending on page version
    const candidates: RawReview[] =
      pageProps.reviews ??
      pageProps.initialState?.reviewsList?.reviews ??
      pageProps.data?.reviews ??
      [];

    if (!Array.isArray(candidates) || candidates.length === 0) return [];

    return candidates
      .map((r): TrustpilotReview | null => {
        const title = r.title ?? r.name ?? "";
        const text = r.text ?? r.reviewBody ?? "";
        if (!text) return null;
        const stars =
          typeof r.rating === "number"
            ? r.rating
            : (r.rating as { stars?: number })?.stars ??
              Number(r.reviewRating?.ratingValue ?? 0);
        const date =
          r.dates?.publishedDate ??
          r.datePublished ??
          new Date().toISOString();

        return {
          title: decodeHtml(title),
          text: decodeHtml(text),
          rating: stars,
          date,
          url: "",
          source: "trustpilot",
        };
      })
      .filter((r): r is TrustpilotReview => r !== null);
  } catch {
    return [];
  }
}

function extractFromJsonLd(html: string): TrustpilotReview[] {
  const reviews: TrustpilotReview[] = [];
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = scriptRe.exec(html)) !== null) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(m[1]) as any;
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const reviewList: RawReview[] = Array.isArray(item.review) ? item.review : [];
        for (const r of reviewList) {
          const text = r.reviewBody ?? r.text ?? "";
          if (!text) continue;
          reviews.push({
            title: decodeHtml(r.name ?? ""),
            text: decodeHtml(text),
            rating: Number(r.reviewRating?.ratingValue ?? 0),
            date: r.datePublished ?? new Date().toISOString(),
            url: "",
            source: "trustpilot",
          });
        }
      }
    } catch {
      // skip malformed
    }
  }

  return reviews;
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { company, pages = 2 } = (await req.json()) as {
      company: string;
      pages?: number;
    };

    if (!company?.trim()) {
      return Response.json({ error: "No company provided" }, { status: 400 });
    }

    // Normalise: strip https?://, www., trailing slash
    const slug = company
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

    const pageCount = Math.min(Math.max(1, pages), 5);
    const allReviews: TrustpilotReview[] = [];
    const errors: string[] = [];
    let companyUrl = `https://www.trustpilot.com/review/${slug}`;

    for (let page = 1; page <= pageCount; page++) {
      const url =
        page === 1
          ? `https://www.trustpilot.com/review/${slug}`
          : `https://www.trustpilot.com/review/${slug}?page=${page}`;

      try {
        const res = await fetch(url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(15_000),
          redirect: "follow",
        });

        if (!res.ok) {
          errors.push(`Page ${page}: HTTP ${res.status}`);
          break;
        }

        companyUrl = res.url || url;
        const html = await res.text();

        // Try __NEXT_DATA__ first, fall back to JSON-LD
        let pageReviews = extractFromNextData(html);
        if (pageReviews.length === 0) pageReviews = extractFromJsonLd(html);

        // Stamp page URL onto each review
        pageReviews.forEach((r) => {
          if (!r.url) r.url = companyUrl;
        });

        allReviews.push(...pageReviews);

        // If we got nothing on page 1, no point going further
        if (page === 1 && pageReviews.length === 0) {
          errors.push(
            "Could not extract reviews — Trustpilot may have changed their page structure or blocked the request"
          );
          break;
        }
      } catch (err) {
        errors.push(
          `Page ${page}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        break;
      }
    }

    return Response.json({
      reviews: allReviews,
      company: slug,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
