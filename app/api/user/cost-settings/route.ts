import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { getCostSettings, COST_ESTIMATES } from "@/lib/costGuard";

// GET — return user's cost settings + current usage
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const settings = await getCostSettings(auth.userId);

  if (!settings) {
    return NextResponse.json({
      settings: null,
      usage: null,
      estimates: COST_ESTIMATES,
    });
  }

  // Calculate usage in cents for display
  const firecrawlUsedCents = Math.round(settings.firecrawlCallsThisMonth * COST_ESTIMATES.firecrawl.perCall);
  const perplexityUsedCents = Math.round(settings.perplexityCallsThisMonth * COST_ESTIMATES.perplexity.perCall);
  const anthropicUsedCents = Math.round((settings.anthropicTokensThisMonth / 1000) * COST_ESTIMATES.anthropic.perKToken);

  return NextResponse.json({
    settings: {
      firecrawlBudgetCents: settings.firecrawlBudgetCents,
      perplexityBudgetCents: settings.perplexityBudgetCents,
      anthropicBudgetCents: settings.anthropicBudgetCents,
      maxUrlsPerScrape: settings.maxUrlsPerScrape,
      maxPagesPerCrawl: settings.maxPagesPerCrawl,
    },
    usage: {
      firecrawl: { calls: settings.firecrawlCallsThisMonth, cents: firecrawlUsedCents },
      perplexity: { calls: settings.perplexityCallsThisMonth, cents: perplexityUsedCents },
      anthropic: { tokens: settings.anthropicTokensThisMonth, cents: anthropicUsedCents },
    },
    resetAt: settings.usageResetAt,
    estimates: COST_ESTIMATES,
  });
}

// PUT — update budget limits and per-operation limits
export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const body = await req.json();

  // Validate numeric fields
  const data: Record<string, number | null> = {};

  for (const field of ["firecrawlBudgetCents", "perplexityBudgetCents", "anthropicBudgetCents"] as const) {
    if (field in body) {
      const val = body[field];
      if (val === null || val === undefined) {
        data[field] = null;
      } else if (typeof val === "number" && val >= 0 && val <= 100000) {
        data[field] = Math.round(val);
      }
    }
  }

  if ("maxUrlsPerScrape" in body) {
    const val = body.maxUrlsPerScrape;
    if (typeof val === "number" && val >= 1 && val <= 15) {
      data.maxUrlsPerScrape = Math.round(val);
    }
  }

  if ("maxPagesPerCrawl" in body) {
    const val = body.maxPagesPerCrawl;
    if (typeof val === "number" && val >= 5 && val <= 30) {
      data.maxPagesPerCrawl = Math.round(val);
    }
  }

  const settings = await prisma.userCostSettings.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      ...data,
    },
    update: data,
  });

  return NextResponse.json({ ok: true, settings });
}
