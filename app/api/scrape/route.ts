import { extractTextFromHtml } from "@/lib/scraper";
import type { ScrapeResult } from "@/lib/scraper";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_URLS = 15;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9,en-US;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
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

export async function POST(req: Request) {
  try {
    const { urls } = (await req.json()) as { urls: string[] };

    if (!Array.isArray(urls) || urls.length === 0) {
      return Response.json({ error: "No URLs provided" }, { status: 400 });
    }

    const limited = urls.slice(0, MAX_URLS);

    const results: ScrapeResult[] = await Promise.all(
      limited.map(async (url): Promise<ScrapeResult> => {
        try {
          const parsed = new URL(url);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return {
              url,
              title: url,
              text: "",
              wordCount: 0,
              success: false,
              error: "Only http/https URLs are supported",
            };
          }

          const res = await fetch(url, {
            headers: FETCH_HEADERS,
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            redirect: "follow",
          });

          if (!res.ok) {
            return {
              url,
              title: url,
              text: "",
              wordCount: 0,
              success: false,
              error: `HTTP ${res.status}`,
            };
          }

          const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
          const isTextType = TEXT_CONTENT_TYPES.some((t) => contentType.includes(t));
          if (!isTextType) {
            return {
              url,
              title: url,
              text: "",
              wordCount: 0,
              success: false,
              error: `Unsupported content type: ${contentType.split(";")[0].trim()}`,
            };
          }

          const html = await res.text();
          const { title, text } = extractTextFromHtml(html);
          const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

          if (wordCount < 20) {
            return {
              url,
              title: title || url,
              text: "",
              wordCount: 0,
              success: false,
              error:
                "Could not extract meaningful text (page may be JavaScript-rendered or blocked)",
            };
          }

          return { url, title: title || url, text, wordCount, success: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return { url, title: url, text: "", wordCount: 0, success: false, error: message };
        }
      })
    );

    return Response.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
