import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";

// POST  /api/analyses/[id]/share  → create or return existing share token
// DELETE /api/analyses/[id]/share → revoke share token

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateCSRF(_req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { id } = await params;
    const analysis = await prisma.analysis.findUnique({ where: { id }, select: { id: true, shareToken: true } });
    if (!analysis) return Response.json({ error: "Not found" }, { status: 404 });

    // Reuse existing token or create a new one (URL-safe 24-char hex token)
    const token = analysis.shareToken ?? randomBytes(12).toString("hex");
    if (!analysis.shareToken) {
      await prisma.analysis.update({ where: { id }, data: { shareToken: token } });
    }

    return Response.json({ token, url: `/share/${token}` });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

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
    await prisma.analysis.update({ where: { id }, data: { shareToken: null } });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
