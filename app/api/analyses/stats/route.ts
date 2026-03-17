import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { BehaviourAnalysis } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id ?? undefined;

    const where: Record<string, unknown> = {};
    if (sessionUserId && process.env.SKIP_AUTH !== "true") {
      where.OR = [{ userId: sessionUserId }, { userId: null }];
    }

    const all = await prisma.analysis.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        dataType: true,
        inputTokens: true,
        outputTokens: true,
        durationMs: true,
        analysisJson: true,
        promptVersion: true,
        rubricJson: true,
        evalJson: true,
      },
    });

    const total = all.length;

    // Parse confidence from each analysisJson
    const confidence: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const comBStrength: Record<string, number> = {
      cap_physical: 0,
      cap_psych: 0,
      opp_physical: 0,
      opp_social: 0,
      mot_reflective: 0,
      mot_automatic: 0,
    };
    let totalBarriers = 0;
    let totalMotivators = 0;
    let totalInterventions = 0;

    for (const row of all) {
      try {
        const parsed: BehaviourAnalysis = JSON.parse(row.analysisJson);
        const c = parsed.confidence?.overall?.toLowerCase() ?? "medium";
        confidence[c] = (confidence[c] ?? 0) + 1;

        comBStrength.cap_physical += parsed.com_b_mapping.capability.physical.length;
        comBStrength.cap_psych += parsed.com_b_mapping.capability.psychological.length;
        comBStrength.opp_physical += parsed.com_b_mapping.opportunity.physical.length;
        comBStrength.opp_social += parsed.com_b_mapping.opportunity.social.length;
        comBStrength.mot_reflective += parsed.com_b_mapping.motivation.reflective.length;
        comBStrength.mot_automatic += parsed.com_b_mapping.motivation.automatic.length;

        totalBarriers += parsed.barriers.length;
        totalMotivators += parsed.motivators.length;
        totalInterventions += parsed.intervention_opportunities.length;
      } catch {
        // Skip unparseable rows
      }
    }

    // Rubric grade distribution + grounding scores + prompt version breakdown
    const rubricGrades: Record<string, number> = { strong: 0, acceptable: 0, needs_revision: 0 };
    const rubricTrend: { date: string; avgTotal: number; count: number }[] = [];
    const rubricByDay: Record<string, { sum: number; count: number }> = {};
    const promptVersions: Record<string, number> = {};
    let totalGrounding = 0;
    let groundingCount = 0;

    for (const row of all) {
      // Prompt version tally
      const pv = row.promptVersion ?? "unknown";
      promptVersions[pv] = (promptVersions[pv] ?? 0) + 1;

      // Rubric grade
      if (row.rubricJson) {
        try {
          const rubric = JSON.parse(row.rubricJson) as { grade: string; total: number };
          rubricGrades[rubric.grade] = (rubricGrades[rubric.grade] ?? 0) + 1;
          const day = row.createdAt.toISOString().slice(0, 10);
          if (!rubricByDay[day]) rubricByDay[day] = { sum: 0, count: 0 };
          rubricByDay[day].sum += rubric.total;
          rubricByDay[day].count += 1;
        } catch { /* skip */ }
      }

      // Grounding score
      if (row.evalJson) {
        try {
          const ev = JSON.parse(row.evalJson) as { groundingScore?: number };
          if (typeof ev.groundingScore === "number") {
            totalGrounding += ev.groundingScore;
            groundingCount += 1;
          }
        } catch { /* skip */ }
      }
    }

    // Build rubric trend (avg rubric total per day)
    for (const [date, { sum, count }] of Object.entries(rubricByDay)) {
      rubricTrend.push({ date, avgTotal: Math.round((sum / count) * 10) / 10, count });
    }
    rubricTrend.sort((a, b) => a.date.localeCompare(b.date));

    const avgGroundingScore = groundingCount > 0 ? Math.round((totalGrounding / groundingCount) * 10) / 10 : null;

    // Analyses by data type
    const byDataType: Record<string, number> = {};
    for (const row of all) {
      byDataType[row.dataType] = (byDataType[row.dataType] ?? 0) + 1;
    }

    // Analyses by day (last 90 days)
    const byDay: Record<string, number> = {};
    for (const row of all) {
      const day = row.createdAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
    const trend = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Averages
    const avgInputTokens =
      total > 0 ? Math.round(all.reduce((s, r) => s + r.inputTokens, 0) / total) : 0;
    const avgOutputTokens =
      total > 0 ? Math.round(all.reduce((s, r) => s + (r.outputTokens ?? 0), 0) / total) : 0;
    const avgDurationMs =
      total > 0
        ? Math.round(
            all.filter((r) => r.durationMs).reduce((s, r) => s + (r.durationMs ?? 0), 0) /
              all.filter((r) => r.durationMs).length || 0
          )
        : 0;

    return Response.json({
      total,
      avgInputTokens,
      avgOutputTokens,
      avgDurationMs,
      totalBarriers,
      totalMotivators,
      totalInterventions,
      confidence,
      byDataType,
      comBStrength,
      rubricGrades,
      rubricTrend,
      promptVersions,
      avgGroundingScore,
      trend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
