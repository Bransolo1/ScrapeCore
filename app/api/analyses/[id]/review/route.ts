import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";
import { safeErrorMessage } from "@/lib/safeError";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      reviewStatus: string;
      reviewNotes?: string;
      actor?: string;
    };

    const { reviewStatus, reviewNotes, actor } = body;

    const validStatuses = ["pending", "approved", "disputed", "archived"];
    if (!validStatuses.includes(reviewStatus)) {
      return Response.json({ error: "Invalid review status" }, { status: 400 });
    }

    const updated = await prisma.analysis.update({
      where: { id },
      data: {
        reviewStatus,
        reviewNotes: reviewNotes ?? null,
        reviewedAt: new Date(),
        reviewedBy: actor ?? null,
      },
      select: {
        id: true,
        reviewStatus: true,
        reviewNotes: true,
        reviewedAt: true,
        reviewedBy: true,
      },
    });

    await logAudit({
      event: "review.updated",
      actor: actor ?? "system",
      analysisId: id,
      entityId: id,
      entityType: "analysis",
      metadata: { reviewStatus, hadNotes: !!reviewNotes },
    });

    return Response.json(updated);
  } catch (err) {
    return Response.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
