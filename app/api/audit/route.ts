import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const event = searchParams.get("event") ?? "";
    const analysisId = searchParams.get("analysisId") ?? "";
    const limit = 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (event) where.event = event;
    if (analysisId) where.analysisId = analysisId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          analysis: { select: { id: true, title: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return Response.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
