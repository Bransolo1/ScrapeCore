import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const analysis = await prisma.analysis.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        createdAt: true,
        title: true,
        dataType: true,
        analysisJson: true,
        promptVersion: true,
        rubricJson: true,
        evalJson: true,
      },
    });

    if (!analysis) return Response.json({ error: "Not found or link revoked" }, { status: 404 });

    return Response.json({
      ...analysis,
      analysisJson: JSON.parse(analysis.analysisJson),
      rubricJson: analysis.rubricJson ? JSON.parse(analysis.rubricJson) : null,
      evalJson: analysis.evalJson ? JSON.parse(analysis.evalJson) : null,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
