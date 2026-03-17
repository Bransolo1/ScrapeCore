import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const actor = searchParams.get("actor") ?? "system";

    const analysis = await prisma.analysis.findUnique({ where: { id } });

    if (!analysis) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Fire-and-forget audit log
    logAudit({ event: "analysis.viewed", actor, analysisId: id, entityId: id, entityType: "analysis" });

    return Response.json({
      ...analysis,
      analysisJson: JSON.parse(analysis.analysisJson),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const actor = searchParams.get("actor") ?? "system";

    await prisma.analysis.delete({ where: { id } });

    logAudit({ event: "analysis.deleted", actor, analysisId: id, entityId: id, entityType: "analysis" });

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
