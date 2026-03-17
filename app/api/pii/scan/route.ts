import { scanForPII } from "@/lib/pii";

export async function POST(req: Request) {
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
