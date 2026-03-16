export interface ScrapeResult {
  url: string;
  title: string;
  text: string;
  wordCount: number;
  success: boolean;
  error?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  text: string;
  url: string;
  permalink: string;
  subreddit: string;
  score: number;
  numComments: number;
  source: "reddit";
  type: "post" | "comment";
}

export interface HNItem {
  id: number;
  title: string;
  text: string;
  url: string;
  score: number;
  source: "hackernews";
  type: "story" | "comment";
}

export interface GNewsItem {
  title: string;
  text: string;
  url: string;
  publishedAt: string;
  source: "gnews";
}

export interface StockTwitsMessage {
  id: number;
  text: string;
  url: string;
  sentiment?: string;
  likes: number;
  source: "stocktwits";
}

export interface TrustpilotReview {
  title: string;
  text: string;
  rating: number;
  date: string;
  url: string;
  source: "trustpilot";
}

export interface AppStoreReview {
  title: string;
  text: string;
  rating: number;
  version: string;
  url: string;
  source: "appstore";
}

export interface RssFeedItem {
  title: string;
  text: string;
  url: string;
  feedTitle: string;
  source: "rss";
}

export interface GooglePlayReview {
  title: string;
  text: string;
  rating: number;
  date: string;
  version: string;
  url: string;
  source: "googleplay";
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: "websearch";
}

export type SocialItem = RedditPost | HNItem | GNewsItem | StockTwitsMessage;

export interface Source {
  id: string;
  title: string;
  text: string;
  url: string;
  wordCount: number;
  source: "url" | "reddit" | "hackernews" | "gnews" | "stocktwits" | "trustpilot" | "appstore" | "rss" | "googleplay" | "websearch";
  meta?: string;
  selected: boolean;
}

// ─── Shared fetch headers + scrapeUrl utility ────────────────────────────────

export const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

const TEXT_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "application/xml",
  "text/xml",
  "text/plain",
  "application/rss+xml",
  "application/atom+xml",
];

/** Fetch a URL, extract its text, and return a Source object — or null on failure. */
export async function scrapeUrl(url: string): Promise<Source | null> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    const res = await fetch(url, {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const ct = res.headers.get("content-type") ?? "";
    if (!TEXT_CONTENT_TYPES.some((t) => ct.includes(t))) return null;

    const html = await res.text();
    const { title, text } = extractTextFromHtml(html);
    if (!text.trim() || text.trim().length < 100) return null;

    return {
      id: `url-${res.url || url}`,
      title: title || parsed.hostname,
      text,
      url: res.url || url,
      wordCount: text.trim().split(/\s+/).length,
      source: "url",
      selected: true,
    };
  } catch {
    return null;
  }
}

// ─── HTML entity decoder ──────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

function extractJsonLd(html: string): string {
  const results: string[] = [];
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const body = item.articleBody ?? item.description ?? item.text ?? null;
        if (typeof body === "string" && body.length > 100) results.push(body.trim());
        if (Array.isArray(item["@graph"])) {
          for (const node of item["@graph"]) {
            const nb = node.articleBody ?? node.description ?? null;
            if (typeof nb === "string" && nb.length > 100) results.push(nb.trim());
          }
        }
      }
    } catch {
      // Malformed JSON-LD — skip
    }
  }
  return results.join("\n\n");
}

// ─── Title extraction ─────────────────────────────────────────────────────────

function extractTitle(html: string): string {
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogTitle?.[1]) return decodeHtmlEntities(ogTitle[1].trim());

  const twitterTitle =
    html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i);
  if (twitterTitle?.[1]) return decodeHtmlEntities(twitterTitle[1].trim());

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) {
    const text = decodeHtmlEntities(h1[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text) return text;
  }

  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return decodeHtmlEntities((titleTag?.[1] ?? "").trim());
}

// ─── RSS / Atom feed: flat text ───────────────────────────────────────────────

function extractFeedText(xml: string): string | null {
  if (!/(<rss|<feed|<channel)/i.test(xml)) return null;
  const items: string[] = [];
  const stripped = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const itemRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(stripped)) !== null) {
    const block = m[1];
    const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descM = block.match(
      /<(?:description|summary|content:encoded|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content:encoded|content)>/i
    );
    const parts: string[] = [];
    if (titleM?.[1]) parts.push(decodeHtmlEntities(titleM[1].replace(/<[^>]+>/g, "").trim()));
    if (descM?.[1]) {
      const bodyText = decodeHtmlEntities(descM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      if (bodyText.length > 20) parts.push(bodyText);
    }
    if (parts.length) items.push(parts.join(" — "));
  }
  return items.length ? items.join("\n") : null;
}

// ─── RSS / Atom feed: structured items (exported) ────────────────────────────

export function parseRssItems(
  xml: string,
  feedUrl: string
): RssFeedItem[] {
  const results: RssFeedItem[] = [];
  const stripped = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  // Feed-level title
  const feedTitleM = stripped.match(/<(?:channel|feed)[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  const feedTitle = feedTitleM
    ? decodeHtmlEntities(feedTitleM[1].replace(/<[^>]+>/g, "").trim())
    : new URL(feedUrl).hostname;

  const itemRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(stripped)) !== null) {
    const block = m[1];

    const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkM =
      block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i) ??
      block.match(/<link[^>]*>(https?:\/\/[^<]+)<\/link>/i) ??
      block.match(/<link>(https?:\/\/[^<]+)<\/link>/i);
    const descM = block.match(
      /<(?:description|summary|content:encoded|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content:encoded|content)>/i
    );

    const title = titleM ? decodeHtmlEntities(titleM[1].replace(/<[^>]+>/g, "").trim()) : "(untitled)";
    const url = linkM?.[1]?.trim() ?? feedUrl;
    const rawDesc = descM?.[1] ?? "";
    const text = decodeHtmlEntities(rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

    if (!text && title === "(untitled)") continue;

    results.push({
      title,
      text: text || title,
      url,
      feedTitle,
      source: "rss",
    });
  }

  return results;
}

// ─── Boilerplate / noise patterns ────────────────────────────────────────────

const NOISE_PATTERNS: RegExp[] = [
  /^(accept|reject|manage)\s+(cookies?|all|preferences)/i,
  /^cookie\s+(policy|settings|preferences|notice|consent)/i,
  /^(privacy|terms)\s+(policy|of\s+service|and\s+conditions)/i,
  /^(sign\s+in|log\s+in|log\s+out|sign\s+up|register|subscribe|newsletter)/i,
  /^(share\s+(this|on)|tweet|follow\s+us|like\s+us)/i,
  /^(skip\s+to|jump\s+to)\s+(content|main|navigation)/i,
  /^\s*(menu|home|search|back\s+to\s+top|©|all\s+rights\s+reserved)\s*$/i,
  /^(advertisement|sponsored|related\s+articles?|you\s+might\s+also\s+like)/i,
  /^\s*\d+\s*(min(ute)?s?\s+read|views?|shares?|comments?|likes?)\s*$/i,
];

function isNoiseLine(line: string): boolean {
  const l = line.trim();
  if (l.length < 20) return true;
  for (const p of NOISE_PATTERNS) {
    if (p.test(l)) return true;
  }
  return false;
}

// ─── Main HTML extractor ──────────────────────────────────────────────────────

const MAX_CHARS = 25_000;

export function extractTextFromHtml(html: string): { title: string; text: string } {
  const title = extractTitle(html);

  const jsonLdText = extractJsonLd(html);
  if (jsonLdText.length > 300) {
    return { title, text: jsonLdText.slice(0, MAX_CHARS) };
  }

  const feedText = extractFeedText(html);
  if (feedText && feedText.length > 200) {
    return { title, text: feedText.slice(0, MAX_CHARS) };
  }

  let cleaned = html
    .replace(/<script(?![^>]+type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, " ")
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const contentSelectors: RegExp[] = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<[^>]+role=["']main["'][^>]*>([\s\S]*?)<\/(?:div|section|main)>/i,
    /<[^>]+class=["'][^"']*\b(?:article-body|entry-content|post-content|post-body|article-content|story-body|content-body|main-content|page-content|single-content)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
    /<[^>]+id=["'](?:main-content|article-body|post-content|content|story|article)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|main|article)>/i,
    /<[^>]+itemprop=["'](?:articleBody|description)["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
    /<[^>]+class=["'][^"']*\b(?:content|body|text|story)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
  ];

  let bestContent = "";
  for (const sel of contentSelectors) {
    const m = cleaned.match(sel);
    if (m && m[1] && m[1].length > bestContent.length) bestContent = m[1];
  }

  const content = bestContent.length > 500 ? bestContent : cleaned;

  const withBreaks = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/(?:div|section|article|blockquote)>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(?:h[1-6]|dt|dd|td|th|tr)>/gi, "\n");

  const text = withBreaks
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((line) => decodeHtmlEntities(line.replace(/\s+/g, " ").trim()))
    .filter((line) => !isNoiseLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS);

  return { title, text };
}

// ─── Source formatter ─────────────────────────────────────────────────────────

export function formatSourcesAsText(sources: Source[]): string {
  return sources
    .filter((s) => s.selected && s.text.trim())
    .map((s) => {
      let header: string;
      switch (s.source) {
        case "reddit":
          header = `[Reddit — ${s.meta ?? s.url}]`;
          break;
        case "hackernews":
          header = `[Hacker News — ${s.title}]`;
          break;
        case "gnews":
          header = `[Google News — ${s.title}]`;
          break;
        case "stocktwits":
          header = `[StockTwits${s.meta ? ` — ${s.meta}` : ""}]`;
          break;
        case "trustpilot":
          header = `[Trustpilot Review${s.meta ? ` — ${s.meta}` : ""}]`;
          break;
        case "appstore":
          header = `[App Store Review${s.meta ? ` — ${s.meta}` : ""}]`;
          break;
        case "rss":
          header = `[${s.meta ?? "RSS"} — ${s.title}]`;
          break;
        case "googleplay":
          header = `[Google Play Review${s.meta ? ` — ${s.meta}` : ""}]`;
          break;
        case "websearch":
          header = `[Web — ${s.title || s.url}]`;
          break;
        default:
          header = `[${s.title || s.url}]`;
      }
      return `${header}\n${s.text.trim()}`;
    })
    .join("\n\n---\n\n");
}
