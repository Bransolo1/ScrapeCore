import { prisma } from "./db";
import type { BehaviourAnalysis } from "./types";

/**
 * Fetch the 3 most recent analyses for a given project and build a compact
 * "Prior project research context" block to inject into the analysis prompt.
 *
 * This is a pragmatic project-memory approach: exact project name matching +
 * recency, injected as structured context. No vector embeddings required.
 */
export async function buildProjectMemoryBlock(
  project: string,
  userId?: string
): Promise<string | null> {
  try {
    const where: Record<string, unknown> = { project };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
      delete where.userId;
      // Re-apply project constraint alongside user scoping
      where.AND = [{ project }, { OR: [{ userId }, { userId: null }] }];
      delete where.project;
    }

    const prior = await prisma.analysis.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, createdAt: true, analysisJson: true, title: true },
    });

    if (prior.length === 0) return null;

    const summaries: string[] = [];
    for (const row of prior) {
      try {
        const a: BehaviourAnalysis = JSON.parse(row.analysisJson);
        const date = row.createdAt.toISOString().slice(0, 10);

        const topBarriers = a.barriers?.slice(0, 3).map((b) => b.barrier).join("; ") ?? "none";
        const topMotivators = a.motivators?.slice(0, 3).map((m) => m.motivator).join("; ") ?? "none";
        const topInterventions = a.intervention_opportunities?.slice(0, 2).map((i) => i.intervention).join("; ") ?? "none";

        summaries.push(
          `  [${date}] "${row.title}" (confidence: ${a.confidence?.overall ?? "?"})\n` +
          `    Key barriers: ${topBarriers}\n` +
          `    Key motivators: ${topMotivators}\n` +
          `    Top interventions recommended: ${topInterventions}`
        );
      } catch {
        // Skip unparseable rows
      }
    }

    if (summaries.length === 0) return null;

    return (
      `PRIOR RESEARCH IN THIS PROJECT ("${project}") — use this to identify patterns, confirm repeated signals, or flag contradictions with previous findings:\n` +
      summaries.join("\n\n")
    );
  } catch {
    return null;
  }
}
