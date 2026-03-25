import { prisma } from "@/lib/db";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { discoverCompany } from "@/lib/discovery";
import type { DiscoveryResult } from "@/lib/discovery";

export const runtime = "nodejs";
export const maxDuration = 60;

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";

// ─── Perplexity intel fetcher ────────────────────────────────────────────────

async function fetchPerplexityIntel(
  competitorName: string,
  extraKeywords: string[],
  apiKey: string
): Promise<string | null> {
  const keywordsStr =
    extraKeywords.length > 0 ? ` ${extraKeywords.join(" ")}` : "";
  const query = `Latest user reviews, complaints, and praise for ${competitorName}${keywordsStr}. Include recent customer feedback, recurring issues, and standout strengths from review platforms and social media.`;

  try {
    const res = await fetch(PERPLEXITY_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "You are a competitive intelligence analyst. Search for recent customer reviews and feedback about the specified company. Return a structured report with: key user complaints, recurring barriers, notable praise, user motivations, and recent sentiment shifts. Format as plain text suitable for behavioural analysis.",
          },
          { role: "user", content: query },
        ],
        search_recency_filter: "week",
        return_citations: true,
      }),
    });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ─── Multi-source data fetchers ──────────────────────────────────────────────

async function fetchRedditIntel(
  discovery: DiscoveryResult,
  baseUrl: string
): Promise<{ text: string; count: number } | null> {
  if (discovery.reddit.subreddits.length === 0) return null;
  try {
    const res = await fetch(`${baseUrl}/api/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        query: discovery.reddit.query,
        subreddit: discovery.reddit.subreddits[0],
        timeframe: "week",
        sort: "top",
        limit: 10,
        includeComments: false,
        sources: ["reddit"],
      }),
    });
    const data = (await res.json()) as { items?: Array<{ title?: string; text?: string }>; error?: string };
    if (data.error || !data.items?.length) return null;
    const texts = data.items.map((item) => [item.title, item.text].filter(Boolean).join(": ")).join("\n\n");
    return { text: `Reddit discussions (r/${discovery.reddit.subreddits[0]}, past week):\n\n${texts}`, count: data.items.length };
  } catch {
    return null;
  }
}

async function fetchTrustpilotIntel(
  discovery: DiscoveryResult,
  baseUrl: string
): Promise<{ text: string; count: number } | null> {
  if (!discovery.trustpilot.found || !discovery.trustpilot.domain) return null;
  try {
    const res = await fetch(`${baseUrl}/api/sources/trustpilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ company: discovery.trustpilot.domain, pages: 1 }),
    });
    const data = (await res.json()) as { reviews?: Array<{ title?: string; text?: string; rating?: number; date?: string }>; error?: string };
    if (data.error || !data.reviews?.length) return null;
    const texts = data.reviews.slice(0, 15).map((r) => `[${r.rating}★] ${r.title}: ${r.text}`).join("\n\n");
    return { text: `Trustpilot reviews (${discovery.trustpilot.domain}, page 1):\n\n${texts}`, count: data.reviews.length };
  } catch {
    return null;
  }
}

async function fetchGlassdoorIntel(
  discovery: DiscoveryResult,
  baseUrl: string
): Promise<{ text: string; count: number } | null> {
  if (!discovery.glassdoor?.found || !discovery.glassdoor.slug) return null;
  try {
    const res = await fetch(`${baseUrl}/api/sources/glassdoor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ slug: discovery.glassdoor.slug, pages: 1 }),
    });
    const data = (await res.json()) as { reviews?: Array<{ title?: string; text?: string; rating?: number; pros?: string; cons?: string }>; error?: string };
    if (data.error || !data.reviews?.length) return null;
    const texts = data.reviews.slice(0, 10).map((r) => {
      const parts = [r.title ? `[${r.rating}★] ${r.title}` : `[${r.rating}★]`];
      if (r.pros) parts.push(`Pros: ${r.pros}`);
      if (r.cons) parts.push(`Cons: ${r.cons}`);
      return parts.join("\n");
    }).join("\n\n");
    return { text: `Glassdoor employee reviews (page 1):\n\n${texts}`, count: data.reviews.length };
  } catch {
    return null;
  }
}

// ─── SSE stream consumer ─────────────────────────────────────────────────────

async function consumeAnalysisStream(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let buffer = "";
  let analysisId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6)) as { type: string; savedId?: string };
        if (payload.type === "complete") analysisId = payload.savedId ?? null;
      } catch { /* skip malformed SSE */ }
    }
  }
  return analysisId;
}

// ─── Schedule helper ─────────────────────────────────────────────────────────

function nextRunDate(schedule: string): Date {
  const now = new Date();
  if (schedule === "daily") now.setDate(now.getDate() + 1);
  else if (schedule === "weekly") now.setDate(now.getDate() + 7);
  else if (schedule === "monthly") now.setMonth(now.getMonth() + 1);
  return now;
}

// ─── GET /api/cron/monitoring ────────────────────────────────────────────────
// Vercel Cron calls this daily at 06:00 UTC
// Runs all monitors whose nextRunAt is in the past

export async function GET(req: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    return Response.json({ error: "NEXTAUTH_URL not configured" }, { status: 500 });
  }

  try {
    const dueMonitors = await prisma.competitorMonitor.findMany({
      where: {
        active: true,
        nextRunAt: { lte: new Date() },
      },
    });

    if (dueMonitors.length === 0) {
      return Response.json({ ran: 0, message: "No monitors due" });
    }

    const results: Array<{
      id: string;
      name: string;
      success: boolean;
      analysisId?: string | null;
      sourcesUsed?: string[];
      error?: string;
    }> = [];

    for (const monitor of dueMonitors) {
      try {
        const keywords: string[] = JSON.parse(monitor.keywords ?? "[]");

        // 1. Resolve Perplexity key
        const pplxKey = await resolveApiKey("perplexity", monitor.userId ?? undefined);
        if (!pplxKey) {
          results.push({ id: monitor.id, name: monitor.name, success: false, error: "No Perplexity API key" });
          continue;
        }

        // 2. Run discovery for the competitor (uses 24h cache)
        const discovery = await discoverCompany(monitor.competitorName);

        // 3. Fetch all sources in parallel
        const sourcesUsed: string[] = [];
        const [perplexityIntel, redditIntel, trustpilotIntel, glassdoorIntel] = await Promise.allSettled([
          fetchPerplexityIntel(monitor.competitorName, keywords, pplxKey.key),
          fetchRedditIntel(discovery, baseUrl),
          fetchTrustpilotIntel(discovery, baseUrl),
          fetchGlassdoorIntel(discovery, baseUrl),
        ]);

        // 4. Combine all intel into a single text
        const sections: string[] = [];

        const pplxResult = perplexityIntel.status === "fulfilled" ? perplexityIntel.value : null;
        if (pplxResult) {
          sections.push(`Perplexity AI Research:\n\n${pplxResult}`);
          sourcesUsed.push("perplexity");
        }

        const redditResult = redditIntel.status === "fulfilled" ? redditIntel.value : null;
        if (redditResult) {
          sections.push(redditResult.text);
          sourcesUsed.push(`reddit (${redditResult.count} posts)`);
        }

        const tpResult = trustpilotIntel.status === "fulfilled" ? trustpilotIntel.value : null;
        if (tpResult) {
          sections.push(tpResult.text);
          sourcesUsed.push(`trustpilot (${tpResult.count} reviews)`);
        }

        const gdResult = glassdoorIntel.status === "fulfilled" ? glassdoorIntel.value : null;
        if (gdResult) {
          sections.push(gdResult.text);
          sourcesUsed.push(`glassdoor (${gdResult.count} reviews)`);
        }

        if (sections.length === 0) {
          results.push({ id: monitor.id, name: monitor.name, success: false, error: "All source fetches failed" });
          continue;
        }

        const combinedIntel = sections.join("\n\n---\n\n");
        const sourcesSummary = sourcesUsed.join(", ");

        // 5. Send combined intel to analysis API
        const analyzeRes = await fetch(`${baseUrl}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: combinedIntel,
            dataType: "competitor",
            actor: `cron:${monitor.name}`,
            projectContext: `Competitor monitoring: ${monitor.competitorName}. Keywords: ${keywords.join(", ") || "none"}. Sources: ${sourcesSummary}.`,
            project: monitor.name,
          }),
        });

        const analysisId = await consumeAnalysisStream(analyzeRes);

        // 6. Update monitor metadata
        await prisma.competitorMonitor.update({
          where: { id: monitor.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: nextRunDate(monitor.schedule),
            lastAnalysisId: analysisId,
            runCount: { increment: 1 },
          },
        });

        results.push({
          id: monitor.id,
          name: monitor.name,
          success: true,
          analysisId,
          sourcesUsed,
        });
      } catch (err) {
        results.push({
          id: monitor.id,
          name: monitor.name,
          success: false,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    return Response.json({ ran: results.length, results });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
