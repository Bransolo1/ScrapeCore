// POST /api/sources/g2
// Scrapes G2.com product reviews using structured data (JSON-LD) and HTML parsing
// Body: { slug: string, pages?: number }
// The slug is the product identifier in g2.com/products/{slug}/reviews

const MAX_PAGES = 5;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CHAR_LIMIT = 800;

interface G2Review {
  title: string;
  text: string;
  rating: number;
  author: string;
  date: string;
  url: string;
  pros?: string;
  cons?: string;
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractJsonLdReviews(html: string, pageUrl: string): G2Review[] {
  const reviews: G2Review[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        // Could be a Product with review array, or an ItemList of reviews
        const reviewList = item.review ?? (item["@type"] === "Review" ? [item] : []);
        for (const r of Array.isArray(reviewList) ? reviewList : []) {
          const body = stripTags(r.reviewBody ?? "").slice(0, CHAR_LIMIT);
          if (!body) continue;

          reviews.push({
            title: r.name ?? stripTags(body).slice(0, 60),
            text: body,
            rating: Number(r.reviewRating?.ratingValue ?? 0),
            author: r.author?.name ?? "Anonymous",
            date: r.datePublished ?? "",
            url: r.url ?? pageUrl,
          });
        }
      }
    } catch {
      // Skip unparseable JSON-LD
    }
  }

  return reviews;
}

function extractNextDataReviews(html: string, pageUrl: string): G2Review[] {
  const reviews: G2Review[] = [];

  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) return reviews;

  try {
    const data = JSON.parse(match[1]);
    // Traverse to find reviews array - G2 stores them at different paths
    const traverse = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        for (const item of obj) traverse(item);
        return;
      }
      const o = obj as Record<string, unknown>;
      // G2 review objects typically have: star_rating, comment_answers, etc.
      if (o.star_rating && o.comment_answers) {
        const answers = (o.comment_answers as Record<string, unknown>[]) ?? [];
        const body = answers
          .map((a) => {
            const q = String(a.comment_question_question ?? "");
            const t = String(a.value ?? "");
            return q ? `${q}: ${t}` : t;
          })
          .filter(Boolean)
          .join("\n")
          .slice(0, CHAR_LIMIT);

        if (body) {
          reviews.push({
            title: String(o.title ?? body.slice(0, 60)),
            text: body,
            rating: Number(o.star_rating),
            author: "G2 User",
            date: String(o.submitted_at ?? ""),
            url: pageUrl,
          });
        }
        return;
      }
      for (const val of Object.values(o)) traverse(val);
    };

    traverse(data);
  } catch {
    // Ignore parse errors
  }

  return reviews;
}

async function scrapeG2Page(slug: string, page: number): Promise<G2Review[]> {
  const url = page === 1
    ? `https://www.g2.com/products/${slug}/reviews`
    : `https://www.g2.com/products/${slug}/reviews?page=${page}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-GB,en;q=0.9",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`G2 returned ${res.status} for ${url}`);
  const html = await res.text();

  // Try JSON-LD first (most reliable)
  const jsonLdReviews = extractJsonLdReviews(html, url);
  if (jsonLdReviews.length > 0) return jsonLdReviews;

  // Fall back to __NEXT_DATA__
  return extractNextDataReviews(html, url);
}

import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let body: { slug?: string; pages?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const pages = Math.min(MAX_PAGES, Math.max(1, Number(body.pages ?? 2)));

  if (!slug) {
    return Response.json({ error: "slug is required (e.g. 'salesforce-crm')" }, { status: 400 });
  }

  const reviews: G2Review[] = [];
  const errors: string[] = [];

  for (let p = 1; p <= pages; p++) {
    try {
      const pageReviews = await scrapeG2Page(slug, p);
      reviews.push(...pageReviews);
      if (pageReviews.length === 0) break; // No more reviews
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Page ${p} failed`);
      break;
    }
  }

  if (reviews.length === 0 && errors.length > 0) {
    return Response.json(
      {
        error: errors[0],
        hint: "G2 uses heavy JavaScript rendering. For better results, enable Firecrawl in the URL scraper and scrape g2.com/products/{slug}/reviews directly.",
        reviews: [],
      },
      { status: 200 }
    );
  }

  return Response.json({ reviews, errors, slug });
}
