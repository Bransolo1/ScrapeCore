import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

/**
 * Enforce authentication on API routes.
 * Returns the authenticated user's ID, or a 401 Response if unauthenticated.
 * When SKIP_AUTH=true (Electron/dev), returns "anonymous".
 */
export async function requireAuth(): Promise<{ userId: string } | Response> {
  if (process.env.SKIP_AUTH === "true") {
    return { userId: "anonymous" };
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  return { userId };
}

/** Same as requireAuth but returns null instead of Response — for optional auth. */
export async function optionalAuth(): Promise<string | undefined> {
  if (process.env.SKIP_AUTH === "true") return "anonymous";
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? undefined;
}
