/**
 * Basic CSRF protection for POST/PUT/DELETE API routes.
 * Validates that the Origin or Referer header matches the app's host.
 * Safe methods (GET, HEAD, OPTIONS) are always allowed.
 */
export function validateCSRF(req: Request): Response | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null; // safe methods — no check needed
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!host) {
    return Response.json({ error: "Missing host header" }, { status: 403 });
  }

  const source = origin ?? (referer ? new URL(referer).origin : null);
  if (!source) {
    // No origin/referer — likely a server-side or same-origin fetch.
    // Browsers always send Origin on cross-origin POST, so missing = same-origin.
    return null;
  }

  try {
    const sourceHost = new URL(source).host;
    if (sourceHost === host) return null; // same origin — allowed
  } catch {
    // malformed URL
  }

  return Response.json(
    { error: "Cross-origin request blocked" },
    { status: 403 }
  );
}
