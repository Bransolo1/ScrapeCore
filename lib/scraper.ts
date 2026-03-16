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
    .replace(/&#x2F;/g, "/");
}

export function extractTextFromHtml(html: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  const title = decodeHtmlEntities(
    (titleMatch?.[1] ?? h1Match?.[1] ?? "").trim()
  );

  // Remove elements we don't want
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Try to find main content areas
  const mainMatch =
    cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ??
    cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
    cleaned.match(/class="[^"]*(?:content|post|entry|body|article)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|article)>/i);

  const content = mainMatch ? mainMatch[1] : cleaned;

  // Add line breaks for block elements
  const withBreaks = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n");

  // Strip all remaining tags
  const text = withBreaks
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((line) => decodeHtmlEntities(line.replace(/\s+/g, " ").trim()))
    .filter((line) => line.length > 30) // Drop noise lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 12000);

  return { title, text };
}

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
