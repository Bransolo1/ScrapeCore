import Anthropic from "@anthropic-ai/sdk";
import type { BehaviourAnalysis } from "@/lib/types";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";

const client = new Anthropic();

function compact(a: BehaviourAnalysis, label: string): string {
  const barriers   = (a.barriers ?? []).slice(0, 5).map((b) => b.barrier).join("; ");
  const motivators = (a.motivators ?? []).slice(0, 5).map((m) => m.motivator).join("; ");
  const interventions = (a.intervention_opportunities ?? []).slice(0, 5).map((i) => i.intervention).join("; ");
  return `${label}:
Summary: ${a.summary}
Barriers: ${barriers || "none listed"}
Motivators: ${motivators || "none listed"}
Interventions: ${interventions || "none listed"}
Confidence: ${a.confidence?.overall ?? "unknown"}`;
}

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { analysisA, analysisB, labelA, labelB } = (await req.json()) as {
      analysisA: BehaviourAnalysis;
      analysisB: BehaviourAnalysis;
      labelA: string;
      labelB: string;
    };

    if (!analysisA || !analysisB) {
      return Response.json({ error: "Both analyses required" }, { status: 400 });
    }

    const prompt = `You are a strategic analyst comparing two behavioural science analyses.

${compact(analysisA, labelA)}

${compact(analysisB, labelB)}

Based on their COM-B profiles, barriers, motivators, and interventions, identify:
1. Opportunities for ${labelA} — gaps in ${labelB}'s approach, unaddressed user needs, or strategic whitespace
2. Watchouts for ${labelA} — areas where ${labelB} appears stronger or where ${labelA} may be exposed
3. A single sentence capturing the core strategic dynamic between them

Return ONLY valid JSON (no markdown, no preamble):
{
  "synthesis": "one sentence describing the strategic dynamic",
  "opportunities": ["specific opportunity 1", "specific opportunity 2", "specific opportunity 3"],
  "watchouts": ["specific watchout 1", "specific watchout 2"]
}`;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const result = JSON.parse(cleaned);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
