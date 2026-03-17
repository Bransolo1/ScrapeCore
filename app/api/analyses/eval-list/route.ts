import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Lightweight list of analyses for the eval comparison page — includes rubric + eval data
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id ?? undefined;

    const where: Record<string, unknown> = {};
    if (sessionUserId && process.env.SKIP_AUTH !== "true") {
      where.OR = [{ userId: sessionUserId }, { userId: null }];
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

    const rows = await prisma.analysis.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        title: true,
        dataType: true,
        promptVersion: true,
        rubricJson: true,
        evalJson: true,
        evalPassed: true,
        evalNotes: true,
        analysisJson: true,
      },
    });

    const items = rows.map((r) => {
      let rubric: { grade: string; total: number; dimensions?: unknown[] } | null = null;
      let evalData: { groundingScore?: number; avgValidityScore?: number } | null = null;
      let confidence: string | null = null;
      let summary: string | null = null;
      let interventionCount = 0;
      let barrierCount = 0;

      try { rubric = JSON.parse(r.rubricJson!); } catch { /* skip */ }
      try { evalData = JSON.parse(r.evalJson!); } catch { /* skip */ }
      try {
        const a = JSON.parse(r.analysisJson);
        confidence = a.confidence?.overall ?? null;
        summary = a.summary ?? null;
        interventionCount = a.intervention_opportunities?.length ?? 0;
        barrierCount = a.barriers?.length ?? 0;
      } catch { /* skip */ }

      return {
        id: r.id,
        createdAt: r.createdAt,
        title: r.title,
        dataType: r.dataType,
        promptVersion: r.promptVersion,
        rubricGrade: rubric?.grade ?? null,
        rubricTotal: rubric?.total ?? null,
        rubricDimensions: rubric?.dimensions ?? null,
        groundingScore: evalData?.groundingScore ?? null,
        avgValidityScore: evalData?.avgValidityScore ?? null,
        evalPassed: r.evalPassed,
        evalNotes: r.evalNotes,
        confidence,
        summary,
        interventionCount,
        barrierCount,
      };
    });

    return Response.json({ items });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
