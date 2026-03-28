// POST /api/sources/perplexity
// Uses Perplexity Sonar to search the web and return structured research
// Supports two modes:
//   "research" — general web research on a topic (market reports, competitor intel)
//   "twitter"  — searches Twitter/X discussions about a topic
// Body: { query: string, mode: "research" | "twitter", recency?: "day" | "week" | "month" }

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  citations?: string[];
  error?: string;
}

function buildPrompt(query: string, mode: string): PerplexityMessage[] {
  if (mode === "twitter") {
    return [
      {
        role: "system",
        content:
          "You are a social media analyst. Search Twitter/X for recent discussions and return a structured summary of what people are saying. Include: key opinions, sentiment patterns, common complaints, praise, and notable quotes. Format as a clear report that can be used for behavioural research.",
      },
      {
        role: "user",
        content: `Search Twitter/X for recent discussions about: "${query}". Focus on user opinions, experiences, complaints, and praise. Include relevant quotes or paraphrases from users. Provide at least 15-20 data points.`,
      },
    ];
  }

  // Research mode — supports both company-specific and general consumer insight queries
  return [
    {
      role: "system",
      content:
        "You are a behavioural research analyst. Search the web and return a comprehensive, structured research report. Include: key findings, user/consumer perspectives, motivations and barriers, contextual factors (social, cultural, regulatory), trends, and notable data points. Format clearly for behavioural analysis purposes. Adapt your focus to the query — this could be about a specific company, a consumer behaviour pattern, a health topic, a market trend, or any other research question.",
    },
    {
      role: "user",
      content: `Research the following topic in depth: "${query}". Provide a comprehensive report covering key findings, consumer or user perspectives, behavioural motivations and barriers, relevant contextual factors, and any supporting data or trends. Aim for depth and breadth.`,
    },
  ];
}

import { requireAuth } from "@/lib/apiAuth";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { validateCSRF } from "@/lib/csrf";
import { checkBudget, incrementUsage } from "@/lib/costGuard";

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  // Check budget before proceeding
  const budget = await checkBudget(auth.userId, "perplexity");
  if (!budget.allowed) {
    return Response.json(
      { error: `Monthly Perplexity budget exceeded ($${((budget.limit ?? 0) / 100).toFixed(2)}). Adjust in Settings > Cost Controls.`, code: "budget_exceeded" },
      { status: 402 }
    );
  }

  const resolved = await resolveApiKey("perplexity", auth.userId);
  if (!resolved) {
    return Response.json(
      { error: "No Perplexity API key configured. Add your key in Settings.", code: "no_api_key" },
      { status: 503 }
    );
  }
  const apiKey = resolved.key;

  let body: { query?: string; mode?: string; recency?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const mode = body.mode === "twitter" ? "twitter" : "research";
  const recency = ["day", "week", "month"].includes(body.recency ?? "") ? body.recency : "month";

  if (!query) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  const domainFilter = mode === "twitter" ? ["twitter.com", "x.com"] : [];

  const payload = {
    model: "sonar",
    messages: buildPrompt(query, mode),
    search_recency_filter: recency,
    return_citations: true,
    ...(domainFilter.length > 0 && { search_domain_filter: domainFilter }),
  };

  const res = await fetch(PERPLEXITY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json(
      { error: `Perplexity API ${res.status}: ${text.slice(0, 300)}` },
      { status: res.status }
    );
  }

  const data = (await res.json()) as PerplexityResponse;

  if (data.error) {
    return Response.json({ error: data.error }, { status: 500 });
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  const citations = data.citations ?? [];
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const title =
    mode === "twitter"
      ? `Twitter/X — ${query}`
      : `Perplexity research — ${query}`;

  // Track usage
  await incrementUsage(auth.userId, "perplexity", 1);

  return Response.json({
    title,
    text: content,
    wordCount,
    citations,
    mode,
    query,
  });
}
