import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";
import { safeErrorMessage } from "@/lib/safeError";

function nextRunDate(schedule: string): Date {
  const now = new Date();
  if (schedule === "daily")   { now.setDate(now.getDate() + 1); }
  else if (schedule === "weekly")  { now.setDate(now.getDate() + 7); }
  else if (schedule === "monthly") { now.setMonth(now.getMonth() + 1); }
  return now;
}

// GET — list all monitors for the current user
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const monitors = await prisma.competitorMonitor.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ monitors });
  } catch (err) {
    return Response.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}

// POST — create a new monitor
export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const body = (await req.json()) as {
      name: string;
      competitorName: string;
      keywords?: string[];
      schedule?: string;
    };

    if (!body.name?.trim() || !body.competitorName?.trim()) {
      return Response.json({ error: "name and competitorName are required" }, { status: 400 });
    }

    const schedule = ["daily", "weekly", "monthly"].includes(body.schedule ?? "") ? body.schedule! : "weekly";

    const monitor = await prisma.competitorMonitor.create({
      data: {
        name: body.name.trim(),
        competitorName: body.competitorName.trim(),
        keywords: JSON.stringify(body.keywords ?? []),
        schedule,
        nextRunAt: nextRunDate(schedule),
        userId: auth.userId,
      },
    });

    return Response.json({ monitor });
  } catch (err) {
    return Response.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
