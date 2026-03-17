import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search = (searchParams.get("search") ?? "").trim();
    const reviewStatus = (searchParams.get("reviewStatus") ?? "").trim();
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) where.title = { contains: search };
    if (reviewStatus) where.reviewStatus = reviewStatus;

    const [analyses, total] = await Promise.all([
      prisma.analysis.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          title: true,
          dataType: true,
          inputTokens: true,
          outputTokens: true,
          durationMs: true,
          project: true,
          tags: true,
          reviewStatus: true,
          piiDetected: true,
        },
      }),
      prisma.analysis.count({ where }),
    ]);

    return Response.json({
      analyses,
      total,
      page,
      pages: Math.ceil(total / limit),
      search,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
