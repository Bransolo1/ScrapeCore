import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";
import { safeErrorMessage } from "@/lib/safeError";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { id } = await params;
    const corrections = await prisma.analysisCorrection.findMany({
      where: { analysisId: id },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ corrections });
  } catch (err) {
    return Response.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(
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
      section: string;
      itemIndex: number;
      status: string;
      note?: string;
      actor?: string;
    };

    const validSections = ["barriers", "motivators", "key_behaviours", "interventions"];
    const validStatuses = ["confirmed", "disputed", "removed"];

    if (!validSections.includes(body.section)) {
      return Response.json({ error: "Invalid section" }, { status: 400 });
    }
    if (!validStatuses.includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    // Upsert: one correction per analysis+section+index
    const correction = await prisma.analysisCorrection.upsert({
      where: {
        analysisId_section_itemIndex: {
          analysisId: id,
          section: body.section,
          itemIndex: body.itemIndex,
        },
      },
      update: {
        status: body.status,
        note: body.note ?? null,
        correctedBy: body.actor ?? "analyst",
      },
      create: {
        analysisId: id,
        section: body.section,
        itemIndex: body.itemIndex,
        status: body.status,
        note: body.note ?? null,
        correctedBy: body.actor ?? "analyst",
      },
    });

    await logAudit({
      event: "review.updated",
      actor: body.actor ?? "analyst",
      analysisId: id,
      entityId: correction.id,
      entityType: "correction",
      metadata: {
        section: body.section,
        itemIndex: body.itemIndex,
        status: body.status,
        hasNote: !!body.note,
      },
    });

    return Response.json(correction);
  } catch (err) {
    return Response.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
