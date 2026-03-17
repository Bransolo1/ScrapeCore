import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password, name } = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email?.trim() || !password?.trim()) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // Only allow registration if no users exist (first-user setup)
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return Response.json(
        { error: "Registration is closed. Contact your administrator." },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        passwordHash,
        role: "admin", // First user is always admin
      },
    });

    return Response.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Unique constraint")) {
      return Response.json({ error: "Email already registered." }, { status: 409 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
