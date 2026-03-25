import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validateCSRF } from "@/lib/csrf";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  try {
    const { email, password, name } = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email?.trim() || !password?.trim()) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return Response.json({ error: "Invalid email format." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const normalisedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    // Use a transaction to prevent race conditions on role assignment
    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: normalisedEmail } });
      if (existing) return null;

      const userCount = await tx.user.count();
      const role = userCount === 0 ? "admin" : "analyst";

      return tx.user.create({
        data: {
          email: normalisedEmail,
          name: name?.trim() || null,
          passwordHash,
          role,
        },
      });
    });

    if (!user) {
      return Response.json({ error: "Email already registered." }, { status: 409 });
    }

    return Response.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return Response.json({ error: "Email already registered." }, { status: 409 });
    }
    return Response.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
