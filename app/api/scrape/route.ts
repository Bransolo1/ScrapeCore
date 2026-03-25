import { extractTextFromHtml } from "@/lib/scraper";
import type { ScrapeResult } from "@/lib/scraper";
import { requireAuth } from "@/lib/apiAuth";
import { checkRateLimitWithConfig, getClientIp } from "@/lib/rateLimit";
import { validateCSRF } from "@/lib/csrf";

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

function isPrivateUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    // Block obvious private/reserved hostnames
    if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "[::1]") return true;
    // Block cloud metadata endpoints
    if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") return true;
    // Block private IPv4 ranges
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 127) return true;
      if (parts[0] === 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  // Rate limit: 60 scrape requests per hour per user
  const rl = await checkRateLimitWithConfig(`scrape:${auth.userId ?? getClientIp(req)}`, 60);
  if (!rl.allowed) {
    return Response.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

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

          if (isPrivateUrl(url)) {
            return {
              url,
              title: url,
              text: "",
              wordCount: 0,
              success: false,
              error: "URL points to a private or reserved address",
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
