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

  // Research mode
  return [
    {
      role: "system",
      content:
        "You are a market research analyst. Search the web and return a comprehensive, structured research report. Include: market overview, key players, user/customer feedback, regulatory context, trends, and notable findings. Format clearly for behavioural analysis purposes.",
    },
    {
      role: "user",
      content: `Research the following topic for market intelligence: "${query}". Provide a comprehensive report including market trends, competitor positioning, customer sentiment, key barriers and motivators, and any relevant regulatory or industry context. Aim for depth and breadth.`,
    },
  ];
}

import { requireAuth } from "@/lib/apiAuth";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { validateCSRF } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

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

  return Response.json({
    title,
    text: content,
    wordCount,
    citations,
    mode,
    query,
  });
}
