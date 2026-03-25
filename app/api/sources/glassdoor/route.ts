// POST /api/sources/glassdoor
// Scrapes Glassdoor employee reviews using JSON-LD and HTML parsing
// Body: { slug: string, pages?: number }
// slug is the Glassdoor review page slug (e.g. "Company-Name-Reviews-E12345")

import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";

const MAX_PAGES = 3;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CHAR_LIMIT = 800;

interface GlassdoorReview {
  title: string;
  text: string;
  rating: number;
  pros: string;
  cons: string;
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

function extractJsonLdReviews(html: string, pageUrl: string): GlassdoorReview[] {
  const reviews: GlassdoorReview[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        const reviewList = item.review ?? (item["@type"] === "Review" ? [item] : []);
        for (const r of Array.isArray(reviewList) ? reviewList : []) {
          const body = typeof r.reviewBody === "string" ? stripTags(r.reviewBody).slice(0, CHAR_LIMIT) : "";
          const title = typeof r.name === "string" ? stripTags(r.name) : "";
          const rating = r.reviewRating?.ratingValue ?? r.ratingValue ?? 0;
          const author = typeof r.author?.name === "string" ? r.author.name : "Anonymous";
          const date = r.datePublished ?? "";

          // Try to extract pros/cons from structured body
          let pros = "";
          let cons = "";
          const prosMatch = body.match(/(?:Pros?[:\s-]+)([\s\S]*?)(?:Cons?[:\s-]+|$)/i);
          const consMatch = body.match(/(?:Cons?[:\s-]+)([\s\S]*?)$/i);
          if (prosMatch) pros = prosMatch[1].trim().slice(0, CHAR_LIMIT);
          if (consMatch) cons = consMatch[1].trim().slice(0, CHAR_LIMIT);

          if (body || title) {
            reviews.push({ title, text: body, rating: Number(rating), pros, cons, author, date, url: pageUrl });
          }
        }
      }
    } catch { /* skip malformed JSON-LD */ }
  }
  return reviews;
}

function extractHtmlReviews(html: string, pageUrl: string): GlassdoorReview[] {
  const reviews: GlassdoorReview[] = [];

  // Pattern: Glassdoor review blocks with data attributes or class patterns
  const reviewBlockRegex = /<div[^>]*class="[^"]*review[^"]*gdReview[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*review[^"]*gdReview[^"]*"|<\/main|$)/gi;
  let block: RegExpExecArray | null;

  while ((block = reviewBlockRegex.exec(html)) !== null) {
    const content = block[1];

    // Extract title
    const titleMatch = content.match(/<a[^>]*class="[^"]*reviewLink[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      ?? content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";

    // Extract rating
    const ratingMatch = content.match(/(?:star-rating|rating)[^>]*>[\s\S]*?(\d(?:\.\d)?)/i)
      ?? content.match(/aria-label="(\d(?:\.\d)?)\s*(?:out of|stars)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // Extract pros
    const prosMatch = content.match(/(?:Pros|pros)[^>]*>([\s\S]*?)(?:<\/(?:div|span|p)>)/i);
    const pros = prosMatch ? stripTags(prosMatch[1]).slice(0, CHAR_LIMIT) : "";

    // Extract cons
    const consMatch = content.match(/(?:Cons|cons)[^>]*>([\s\S]*?)(?:<\/(?:div|span|p)>)/i);
    const cons = consMatch ? stripTags(consMatch[1]).slice(0, CHAR_LIMIT) : "";

    // Extract date
    const dateMatch = content.match(/datetime="([^"]+)"/i)
      ?? content.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : "";

    // Extract author
    const authorMatch = content.match(/class="[^"]*authorJobTitle[^"]*"[^>]*>([\s\S]*?)<\//i)
      ?? content.match(/class="[^"]*authorInfo[^"]*"[^>]*>([\s\S]*?)<\//i);
    const author = authorMatch ? stripTags(authorMatch[1]) : "Employee";

    const text = [pros ? `Pros: ${pros}` : "", cons ? `Cons: ${cons}` : ""].filter(Boolean).join("\n");

    if (title || text) {
      reviews.push({ title, text: text || title, rating, pros, cons, author, date, url: pageUrl });
    }
  }

  return reviews;
}

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

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) {
    return Response.json(
      { error: "Glassdoor slug is required", hint: "Use the slug from glassdoor.com/Reviews/{slug}.htm" },
      { status: 400 }
    );
  }

  const pages = Math.min(Math.max(1, body.pages ?? 1), MAX_PAGES);
  const allReviews: GlassdoorReview[] = [];

  for (let page = 1; page <= pages; page++) {
    const suffix = page === 1 ? "" : `_P${page}`;
    const url = `https://www.glassdoor.com/Reviews/${slug}${suffix}.htm`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
          "Accept-Language": "en-GB,en;q=0.9",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        if (page === 1) {
          return Response.json(
            { error: `Glassdoor returned ${res.status}`, hint: "Check the slug — it should look like 'Company-Name-Reviews-E12345'" },
            { status: 502 }
          );
        }
        break;
      }

      const html = await res.text();

      // Try JSON-LD first, then fallback to HTML parsing
      let pageReviews = extractJsonLdReviews(html, url);
      if (pageReviews.length === 0) {
        pageReviews = extractHtmlReviews(html, url);
      }

      allReviews.push(...pageReviews);

      if (pageReviews.length === 0) break; // no more reviews
    } catch (err) {
      if (page === 1) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Glassdoor fetch failed" },
          { status: 502 }
        );
      }
      break;
    }
  }

  return Response.json({ reviews: allReviews });
}
