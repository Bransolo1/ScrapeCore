import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { runAnalysisPipeline } from "@/lib/analysisPipeline";

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

    // 2 — Run analysis directly via the pipeline (no HTTP self-request)
    const resolved = await resolveApiKey("anthropic", auth.userId);
    if (!resolved) {
      return Response.json({
        error: "No Anthropic API key configured. Add your key in Settings.",
      }, { status: 503 });
    }

    const result = await runAnalysisPipeline({
      text: intel,
      dataType: "competitor",
      apiKey: resolved.key,
      userId: auth.userId ?? monitor.userId,
      actor: `monitor:${monitor.name}`,
      projectContext: `Competitor monitoring: ${monitor.competitorName}. Keywords: ${keywords.join(", ") || "none"}.`,
      project: monitor.name,
    });

    // 3 — Update monitor metadata
    await prisma.competitorMonitor.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: nextRunDate(monitor.schedule),
        lastAnalysisId: result.savedId,
        runCount: { increment: 1 },
        userId: auth.userId ?? monitor.userId,
      },
    });

    return Response.json({
      success: true,
      analysisId: result.savedId,
      analysisTitle: result.analysis.key_behaviours?.[0]?.behaviour ?? `${monitor.competitorName} — auto-monitor`,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
