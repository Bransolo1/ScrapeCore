// POST /api/sources/capterra
// Scrapes Capterra software reviews using JSON-LD and HTML parsing
// Body: { slug: string, pages?: number }
// slug is the Capterra product slug from capterra.com
// For best results, use Firecrawl integration for JS-rendered content

const MAX_PAGES = 5;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CHAR_LIMIT = 800;

interface CapterraReview {
  title: string;
  text: string;
  pros: string;
  cons: string;
  rating: number;
  author: string;
  date: string;
  url: string;
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

function extractJsonLdReviews(html: string, pageUrl: string): CapterraReview[] {
  const reviews: CapterraReview[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(m[1]);
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        const reviewList = item.review ?? (item["@type"] === "Review" ? [item] : []);
        for (const r of Array.isArray(reviewList) ? reviewList : []) {
          const body = stripTags(r.reviewBody ?? "").slice(0, CHAR_LIMIT);
          if (!body) continue;

          reviews.push({
            title: r.name ?? body.slice(0, 60),
            text: body,
            pros: "",
            cons: "",
            rating: Number(r.reviewRating?.ratingValue ?? 0),
            author: r.author?.name ?? "Anonymous",
            date: r.datePublished ?? "",
            url: r.url ?? pageUrl,
          });
        }
      }
    } catch {
      // Skip unparseable
    }
  }

  return reviews;
}

function extractHtmlReviews(html: string, pageUrl: string): CapterraReview[] {
  const reviews: CapterraReview[] = [];

  // Find review blocks using itemprop attributes
  const reviewBlockRx =
    /itemprop=["']review["'][^>]*>([\s\S]*?)(?=itemprop=["']review["']|<\/ol>|<\/ul>|$)/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = reviewBlockRx.exec(html)) !== null) {
    const block = blockMatch[1];

    const bodyMatch = block.match(/itemprop=["']reviewBody["'][^>]*>([\s\S]*?)<\//i);
    const ratingMatch = block.match(/itemprop=["']ratingValue["'][^>]*content=["']([\d.]+)["']/i);
    const nameMatch = block.match(/itemprop=["']name["'][^>]*>([\s\S]*?)<\//i);
    const dateMatch = block.match(/itemprop=["']datePublished["'][^>]*content=["']([^"']+)["']/i);

    const text = bodyMatch ? stripTags(bodyMatch[1]).slice(0, CHAR_LIMIT) : "";
    if (!text) continue;

    reviews.push({
      title: nameMatch ? stripTags(nameMatch[1]).slice(0, 80) : text.slice(0, 60),
      text,
      pros: "",
      cons: "",
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
      author: "Capterra User",
      date: dateMatch ? dateMatch[1] : "",
      url: pageUrl,
    });
  }

  return reviews;
}

async function scrapeCapterraPage(slug: string, page: number): Promise<CapterraReview[]> {
  // Try multiple URL patterns Capterra uses
  const candidates = [
    `https://www.capterra.com/p/${slug}/#reviews`,
    `https://www.capterra.com/reviews/${slug}`,
    `https://www.capterra.com/software/${slug}`,
    page > 1
      ? `https://www.capterra.com/p/${slug}/reviews?page=${page}`
      : null,
  ].filter(Boolean) as string[];

  for (const targetUrl of candidates) {
    let res: Response;
    try {
      res = await fetch(targetUrl, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-GB,en;q=0.9",
        },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      continue;
    }

    if (!res.ok) continue;
    const html = await res.text();

    const jsonLd = extractJsonLdReviews(html, targetUrl);
    if (jsonLd.length > 0) return jsonLd;

    const htmlParsed = extractHtmlReviews(html, targetUrl);
    if (htmlParsed.length > 0) return htmlParsed;
  }

  throw new Error(`Could not extract reviews from Capterra for "${slug}"`);
}

export async function POST(req: Request) {
  let body: { slug?: string; pages?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const pages = Math.min(MAX_PAGES, Math.max(1, Number(body.pages ?? 2)));

  if (!slug) {
    return Response.json(
      { error: "slug is required (e.g. 'salesforce-crm')" },
      { status: 400 }
    );
  }

  const reviews: CapterraReview[] = [];
  const errors: string[] = [];

  for (let p = 1; p <= pages; p++) {
    try {
      const pageReviews = await scrapeCapterraPage(slug, p);
      reviews.push(...pageReviews);
      if (pageReviews.length === 0) break;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Page ${p} failed`);
      break;
    }
  }

  if (reviews.length === 0) {
    return Response.json({
      error: errors[0] ?? "No reviews found",
      hint: "Capterra is JS-rendered. Use Firecrawl on the review URL for best results: capterra.com/p/{slug}/#reviews",
      reviews: [],
    });
  }

  return Response.json({ reviews, errors, slug });
}
