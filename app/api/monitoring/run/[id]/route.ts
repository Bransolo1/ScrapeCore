import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";

async function fetchPerplexityIntel(competitorName: string, extraKeywords: string[]): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const keywordsStr = extraKeywords.length > 0 ? ` ${extraKeywords.join(" ")}` : "";
  const query = `Latest user reviews, complaints, and praise for ${competitorName}${keywordsStr}. Include recent customer feedback, recurring issues, and standout strengths from review platforms and social media.`;

  try {
    const res = await fetch(PERPLEXITY_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a competitive intelligence analyst. Search for recent customer reviews and feedback about the specified company. Return a structured report with: key user complaints, recurring barriers, notable praise, user motivations, and recent sentiment shifts. Format as plain text suitable for behavioural analysis.",
          },
          { role: "user", content: query },
        ],
        search_recency_filter: "week",
        return_citations: true,
      }),
    });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: string;
    };

    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function nextRunDate(schedule: string): Date {
  const now = new Date();
  if (schedule === "daily")        now.setDate(now.getDate() + 1);
  else if (schedule === "weekly")  now.setDate(now.getDate() + 7);
  else if (schedule === "monthly") now.setMonth(now.getMonth() + 1);
  return now;
}

// POST /api/monitoring/run/[id]  — trigger a monitor run manually
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { id } = await params;

    const monitor = await prisma.competitorMonitor.findUnique({ where: { id } });
    if (!monitor) return Response.json({ error: "Monitor not found" }, { status: 404 });

    const keywords: string[] = JSON.parse(monitor.keywords ?? "[]");

    // 1 — Fetch competitor intel via Perplexity
    const intel = await fetchPerplexityIntel(monitor.competitorName, keywords);

    if (!intel) {
      return Response.json({
        error: "Could not fetch competitor intel. Check PERPLEXITY_API_KEY is set.",
      }, { status: 502 });
    }

    // 2 — Run analysis via the internal analyze endpoint
    // We call the analyze API directly to reuse all existing logic (grounding, rubric, eval log, etc.)
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const analyzeRes = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: intel,
        dataType: "competitor",
        actor: `monitor:${monitor.name}`,
        projectContext: `Competitor monitoring: ${monitor.competitorName}. Keywords: ${keywords.join(", ") || "none"}.`,
        project: monitor.name,
      }),
    });

    // The analyze route returns SSE — we need to consume it and extract the final complete event
    const reader = analyzeRes.body?.getReader();
    const decoder = new TextDecoder();
    let analysisId: string | null = null;
    let analysisTitle = `${monitor.competitorName} — auto-monitor`;

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
              analysis?: { title?: string };
            };
            if (payload.type === "complete") {
              analysisId = payload.savedId ?? null;
              analysisTitle = payload.analysis?.title ?? analysisTitle;
            }
          } catch { /* skip */ }
        }
      }
    }

    // 3 — Update monitor metadata
    await prisma.competitorMonitor.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: nextRunDate(monitor.schedule),
        lastAnalysisId: analysisId,
        runCount: { increment: 1 },
        userId: auth.userId ?? monitor.userId,
      },
    });

    return Response.json({
      success: true,
      analysisId,
      analysisTitle,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
