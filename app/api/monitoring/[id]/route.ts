import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";
import { safeErrorMessage } from "@/lib/safeError";

// PATCH — toggle active / update schedule
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
    const body = (await req.json()) as { active?: boolean; schedule?: string };
    const data: Record<string, unknown> = {};
    if (typeof body.active === "boolean") data.active = body.active;
    if (body.schedule) data.schedule = body.schedule;
    const updated = await prisma.competitorMonitor.update({ where: { id }, data });
    return Response.json({ monitor: updated });
  } catch (err) {
    return Response.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}

// DELETE — remove a monitor
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateCSRF(_req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { id } = await params;
    await prisma.competitorMonitor.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
