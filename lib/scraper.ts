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

export type SocialItem = RedditPost | HNItem;

export interface Source {
  id: string;
  title: string;
  text: string;
  url: string;
  wordCount: number;
  source: "url" | "reddit" | "hackernews";
  meta?: string;
  selected: boolean;
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
        // ArticleBody is the richest field
        const body = item.articleBody ?? item.description ?? item.text ?? null;
        if (typeof body === "string" && body.length > 100) {
          results.push(body.trim());
        }
        // Crawl @graph arrays (common in WordPress)
        if (Array.isArray(item["@graph"])) {
          for (const node of item["@graph"]) {
            const nb = node.articleBody ?? node.description ?? null;
            if (typeof nb === "string" && nb.length > 100) results.push(nb.trim());
          }
        }
      }
    } catch {
      // Malformed JSON-LD — skip silently
    }
  }
  return results.join("\n\n");
}

// ─── Title extraction ─────────────────────────────────────────────────────────

function extractTitle(html: string): string {
  // og:title is usually the cleanest article title (no " | Site Name" suffix)
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogTitle?.[1]) return decodeHtmlEntities(ogTitle[1].trim());

  const twitterTitle = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i);
  if (twitterTitle?.[1]) return decodeHtmlEntities(twitterTitle[1].trim());

  // h1 — strip inner tags
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) {
    const text = decodeHtmlEntities(h1[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text) return text;
  }

  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return decodeHtmlEntities((titleTag?.[1] ?? "").trim());
}

// ─── RSS / Atom feed extraction ───────────────────────────────────────────────

function extractFeedText(xml: string): string | null {
  // Detect RSS or Atom by presence of <rss or <feed
  if (!/(<rss|<feed|<channel)/i.test(xml)) return null;

  const items: string[] = [];

  // Strip CDATA wrappers
  const stripped = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  // Extract item/entry blocks
  const itemRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(stripped)) !== null) {
    const block = m[1];
    const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descM = block.match(/<(?:description|summary|content:encoded|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content:encoded|content)>/i);
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

// ─── Boilerplate / noise patterns ────────────────────────────────────────────

// Patterns that indicate lines are UI chrome, not article content
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

  // 1. Try JSON-LD first — cleanest source for article text
  const jsonLdText = extractJsonLd(html);
  if (jsonLdText.length > 300) {
    return { title, text: jsonLdText.slice(0, MAX_CHARS) };
  }

  // 2. Try RSS/Atom feed
  const feedText = extractFeedText(html);
  if (feedText && feedText.length > 200) {
    return { title, text: feedText.slice(0, MAX_CHARS) };
  }

  // 3. HTML parse pipeline

  // 3a. Preserve script-type JSON-LD (already extracted above) but strip other scripts
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

  // 3b. Priority-ordered content area selectors
  // Try each in order; use the longest match (most content)
  const contentSelectors: RegExp[] = [
    // Semantic HTML5
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    // ARIA role
    /<[^>]+role=["']main["'][^>]*>([\s\S]*?)<\/(?:div|section|main)>/i,
    // Common CMS / WordPress classes
    /<[^>]+class=["'][^"']*\b(?:article-body|entry-content|post-content|post-body|article-content|story-body|content-body|main-content|page-content|single-content)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
    // id-based
    /<[^>]+id=["'](?:main-content|article-body|post-content|content|story|article)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|main|article)>/i,
    // itemprop (schema.org)
    /<[^>]+itemprop=["'](?:articleBody|description)["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
    // Generic content / body class fallback
    /<[^>]+class=["'][^"']*\b(?:content|body|text|story)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
  ];

  let bestContent = "";
  for (const sel of contentSelectors) {
    const m = cleaned.match(sel);
    if (m && m[1] && m[1].length > bestContent.length) {
      bestContent = m[1];
    }
  }

  const content = bestContent.length > 500 ? bestContent : cleaned;

  // 3c. Convert block elements to newlines
  const withBreaks = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/(?:div|section|article|blockquote)>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(?:h[1-6]|dt|dd|td|th|tr)>/gi, "\n");

  // 3d. Strip all remaining tags, decode entities, filter noise
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
      const header =
        s.source === "reddit"
          ? `[Reddit — ${s.meta ?? s.url}]`
          : s.source === "hackernews"
          ? `[Hacker News — ${s.title}]`
          : `[${s.title || s.url}]`;
      return `${header}\n${s.text.trim()}`;
    })
    .join("\n\n---\n\n");
}
