import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateCSRF } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const nextAuthHandler = NextAuth(authOptions);

async function handler(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  // Validate CSRF on POST (login/register submissions)
  if (req.method === "POST") {
    const csrfError = validateCSRF(req);
    if (csrfError) return csrfError;
  }
  return nextAuthHandler(req as any, context as any);
}

export { handler as GET, handler as POST };
