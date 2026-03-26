import { prisma } from "@/lib/db";

// Approximate costs per operation (USD cents)
export const COST_ESTIMATES = {
  firecrawl: { perCall: 0.1, label: "$0.001/page" },    // ~$0.001 per page
  perplexity: { perCall: 0.5, label: "$0.005/query" },   // ~$0.005 per query
  anthropic: { perKToken: 1.5, label: "$0.015/1k tokens" }, // ~$0.015 per 1k tokens
};

type Provider = "firecrawl" | "perplexity" | "anthropic";

interface BudgetCheck {
  allowed: boolean;
  remaining: number | null;  // cents remaining, null = no limit
  limit: number | null;      // cents limit, null = no limit
  used: number;              // cents used this month
  maxUrls?: number;
  maxPages?: number;
}

async function ensureMonthlyReset(userId: string) {
  const settings = await prisma.userCostSettings.findUnique({ where: { userId } });
  if (!settings) return null;

  const now = new Date();
  const resetAt = new Date(settings.usageResetAt);

  // Check if we need to reset (different month)
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    return prisma.userCostSettings.update({
      where: { userId },
      data: {
        firecrawlCallsThisMonth: 0,
        perplexityCallsThisMonth: 0,
        anthropicTokensThisMonth: 0,
        usageResetAt: now,
      },
    });
  }

  return settings;
}

export async function checkBudget(userId: string, provider: Provider): Promise<BudgetCheck> {
  const settings = await ensureMonthlyReset(userId);

  if (!settings) {
    // No cost settings configured — allow everything, no limits
    return { allowed: true, remaining: null, limit: null, used: 0 };
  }

  const budgetField = `${provider}BudgetCents` as const;
  const limit = settings[budgetField as keyof typeof settings] as number | null;

  // Calculate usage in cents
  let usedCents: number;
  if (provider === "firecrawl") {
    usedCents = settings.firecrawlCallsThisMonth * COST_ESTIMATES.firecrawl.perCall;
  } else if (provider === "perplexity") {
    usedCents = settings.perplexityCallsThisMonth * COST_ESTIMATES.perplexity.perCall;
  } else {
    usedCents = (settings.anthropicTokensThisMonth / 1000) * COST_ESTIMATES.anthropic.perKToken;
  }

  if (limit === null) {
    return {
      allowed: true,
      remaining: null,
      limit: null,
      used: Math.round(usedCents),
      maxUrls: settings.maxUrlsPerScrape,
      maxPages: settings.maxPagesPerCrawl,
    };
  }

  const remaining = limit - usedCents;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, Math.round(remaining)),
    limit,
    used: Math.round(usedCents),
    maxUrls: settings.maxUrlsPerScrape,
    maxPages: settings.maxPagesPerCrawl,
  };
}

export async function incrementUsage(userId: string, provider: Provider, amount: number = 1) {
  try {
    const field =
      provider === "firecrawl"
        ? "firecrawlCallsThisMonth"
        : provider === "perplexity"
        ? "perplexityCallsThisMonth"
        : "anthropicTokensThisMonth";

    await prisma.userCostSettings.upsert({
      where: { userId },
      create: {
        userId,
        [field]: amount,
      },
      update: {
        [field]: { increment: amount },
      },
    });
  } catch {
    // Non-critical — don't block the operation
  }
}

export async function getCostSettings(userId: string) {
  const settings = await ensureMonthlyReset(userId);
  return settings;
}
