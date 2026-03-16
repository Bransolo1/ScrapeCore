import { extractTextFromHtml } from "@/lib/scraper";
import type { ScrapeResult } from "@/lib/scraper";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_URLS = 10;

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
          // Validate URL
          const parsed = new URL(url);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return { url, title: url, text: "", wordCount: 0, success: false, error: "Only http/https URLs are supported" };
          }

          const res = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; BehaviourInsight/1.0; +https://github.com/Bransolo1/ScrapeCore)",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-GB,en;q=0.9",
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            redirect: "follow",
          });

          if (!res.ok) {
            return { url, title: url, text: "", wordCount: 0, success: false, error: `HTTP ${res.status}` };
          }

          const contentType = res.headers.get("content-type") ?? "";
          if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
            return { url, title: url, text: "", wordCount: 0, success: false, error: `Unsupported content type: ${contentType.split(";")[0]}` };
          }

          const html = await res.text();
          const { title, text } = extractTextFromHtml(html);
          const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

          if (wordCount < 20) {
            return { url, title: title || url, text: "", wordCount: 0, success: false, error: "Could not extract meaningful text (page may be JavaScript-rendered)" };
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
