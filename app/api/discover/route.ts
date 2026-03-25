/**
 * POST /api/discover
 *
 * Takes a company name (and optional domain) and auto-discovers identifiers
 * across all supported platforms. All searches run in parallel.
 */

import { requireAuth } from "@/lib/apiAuth";
import { discoverCompany } from "@/lib/discovery";
import { validateCSRF } from "@/lib/csrf";
export type { DiscoveryResult } from "@/lib/discovery";

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let body: { company?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (!company) {
    return Response.json({ error: "Company name is required" }, { status: 400 });
  }

  const result = await discoverCompany(company, body.domain);

  return Response.json(result, {
    headers: { "Cache-Control": "private, max-age=86400" },
  });
}
