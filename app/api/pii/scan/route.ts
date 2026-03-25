import { scanForPII } from "@/lib/pii";
import { requireAuth } from "@/lib/apiAuth";
import { validateCSRF } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { text } = (await req.json()) as { text: string };
    if (!text?.trim()) {
      return Response.json({ hasPII: false, matches: [], totalCount: 0 });
    }
    const result = scanForPII(text);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
