import { prisma } from "@/lib/db";
import { resolveApiKey } from "@/lib/resolveApiKey";

export const runtime = "nodejs";
export const maxDuration = 60;

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";

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

function nextRunDate(schedule: string): Date {
  const now = new Date();
  if (schedule === "daily") now.setDate(now.getDate() + 1);
  else if (schedule === "weekly") now.setDate(now.getDate() + 7);
  else if (schedule === "monthly") now.setMonth(now.getMonth() + 1);
  return now;
}

// GET /api/cron/monitoring — Vercel Cron calls this daily at 06:00 UTC
// Runs all monitors whose nextRunAt is in the past
export async function GET(req: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
      error?: string;
    }> = [];

    for (const monitor of dueMonitors) {
      try {
        const keywords: string[] = JSON.parse(monitor.keywords ?? "[]");

        // Resolve Perplexity key for the monitor's owner
        const pplxKey = await resolveApiKey("perplexity", monitor.userId ?? undefined);
        if (!pplxKey) {
          results.push({ id: monitor.id, name: monitor.name, success: false, error: "No Perplexity API key" });
          continue;
        }

        const intel = await fetchPerplexityIntel(
          monitor.competitorName,
          keywords,
          pplxKey.key
        );

        if (!intel) {
          results.push({
            id: monitor.id,
            name: monitor.name,
            success: false,
            error: "Perplexity fetch failed",
          });
          continue;
        }

        // Call the analyze API internally
        const baseUrl = process.env.NEXTAUTH_URL;
        if (!baseUrl) {
          results.push({ id: monitor.id, name: monitor.name, success: false, error: "NEXTAUTH_URL not configured" });
          continue;
        }
        const analyzeRes = await fetch(`${baseUrl}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: intel,
            dataType: "competitor",
            actor: `cron:${monitor.name}`,
            projectContext: `Competitor monitoring: ${monitor.competitorName}. Keywords: ${keywords.join(", ") || "none"}.`,
            project: monitor.name,
          }),
        });

        // Consume SSE stream to get the analysis ID
        const reader = analyzeRes.body?.getReader();
        const decoder = new TextDecoder();
        let analysisId: string | null = null;

        if (reader) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const payload = JSON.parse(line.slice(6)) as {
                  type: string;
                  savedId?: string;
                };
                if (payload.type === "complete") {
                  analysisId = payload.savedId ?? null;
                }
              } catch {
                /* skip malformed SSE */
              }
            }
          }
        }

        // Update monitor metadata
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
