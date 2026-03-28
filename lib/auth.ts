import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { checkRateLimitWithConfig } from "./rateLimit";
import { logAudit } from "./audit";
import type { NextAuthOptions } from "next-auth";

// Dummy hash (cost 12) used for timing-safe comparison when user not found
const DUMMY_HASH = bcrypt.hashSync("dummy-timing-safe-placeholder", 12);

const LOGIN_IP_LIMIT = 20;
const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Compute lockout duration based on consecutive failures. */
function computeLockoutMs(failures: number): number | null {
  if (failures >= 20) return 60 * 60 * 1000;   // 1 hour
  if (failures >= 15) return 15 * 60 * 1000;    // 15 min
  if (failures >= 10) return 5 * 60 * 1000;     // 5 min
  if (failures >= 5) return 60 * 1000;           // 1 min
  return null;
}

/**
 * Core authentication logic, extracted for testability.
 * Returns the user object on success, or throws an Error with a code string.
 * Returns null for invalid credentials (without revealing which field is wrong).
 */
export async function authenticateCredentials(
  email: string,
  password: string,
  ip: string
): Promise<{ id: string; email: string; name?: string; role: string } | null> {
  // Input length guards
  if (email.length > 254 || password.length > 128) return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  // Rate limit by IP
  const ipLimit = await checkRateLimitWithConfig(`login:ip:${ip}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS);
  if (!ipLimit.allowed) {
    logAudit({ event: "auth.login.rate_limited", metadata: { ip, email: normalizedEmail, type: "ip" } });
    throw new Error("TOO_MANY_ATTEMPTS");
  }

  // Rate limit by email
  const emailLimit = await checkRateLimitWithConfig(`login:email:${normalizedEmail}`, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS);
  if (!emailLimit.allowed) {
    logAudit({ event: "auth.login.rate_limited", metadata: { ip, email: normalizedEmail, type: "email" } });
    throw new Error("TOO_MANY_ATTEMPTS");
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Timing-safe: always run bcrypt compare even if user not found
  if (!user || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH);
    logAudit({ event: "auth.login.failed", entityId: normalizedEmail, entityType: "email", metadata: { ip, reason: "user_not_found" } });
    return null;
  }

  // Account lockout check
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    // Still run bcrypt to keep timing consistent
    await bcrypt.compare(password, DUMMY_HASH);
    logAudit({ event: "auth.login.account_locked", userId: user.id, metadata: { ip, lockedUntil: user.lockedUntil.toISOString() } });
    throw new Error("ACCOUNT_LOCKED");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // Increment failure count and potentially lock
    const newFailures = user.failedLoginAttempts + 1;
    const lockMs = computeLockoutMs(newFailures);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newFailures,
        lockedUntil: lockMs ? new Date(Date.now() + lockMs) : null,
      },
    });

    logAudit({ event: "auth.login.failed", userId: user.id, actor: user.email, metadata: { ip, reason: "invalid_password", attempts: newFailures } });
    return null;
  }

  // Success — reset failure counters
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  logAudit({ event: "auth.login.success", userId: user.id, actor: user.email, metadata: { ip } });

  return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Extract IP from request headers
        const headers = req?.headers ?? {};
        const forwarded = typeof headers === "object" && "x-forwarded-for" in headers
          ? String(headers["x-forwarded-for"]).split(",")[0]?.trim()
          : undefined;
        const realIp = typeof headers === "object" && "x-real-ip" in headers
          ? String(headers["x-real-ip"])
          : undefined;
        const ip = forwarded ?? realIp ?? "127.0.0.1";

        return authenticateCredentials(credentials.email, credentials.password, ip);
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "analyst";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
