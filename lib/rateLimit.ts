/**
 * DB-backed rate limiting.
 *
 * Stores per-identifier (IP or userId) counters in the RateLimit table so
 * the limit survives server restarts and works across processes.
 *
 * Falls back to an in-memory store if the DB write fails (never blocks a request).
 */

import { prisma } from "./db";

const LIMIT = process.env.NODE_ENV === "development" ? 100 : 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

// In-memory fallback — used if DB is unavailable
const fallback = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = new Date(now + WINDOW_MS);

  try {
    // Upsert: create row if missing, increment if present and within window
    const row = await prisma.rateLimit.findUnique({ where: { id: identifier } });

    if (!row || row.resetAt.getTime() <= now) {
      // First use or window expired — reset
      await prisma.rateLimit.upsert({
        where: { id: identifier },
        update: { count: 1, resetAt },
        create: { id: identifier, count: 1, resetAt },
      });
      return { allowed: true, remaining: LIMIT - 1, resetAt: resetAt.getTime(), limit: LIMIT };
    }

    if (row.count >= LIMIT) {
      return { allowed: false, remaining: 0, resetAt: row.resetAt.getTime(), limit: LIMIT };
    }

    const updated = await prisma.rateLimit.update({
      where: { id: identifier },
      data: { count: { increment: 1 } },
    });

    return {
      allowed: true,
      remaining: LIMIT - updated.count,
      resetAt: row.resetAt.getTime(),
      limit: LIMIT,
    };
  } catch (err) {
    // DB unavailable — fall back to in-memory
    console.warn("[rateLimit] DB error, using in-memory fallback:", err instanceof Error ? err.message : err);

    const entry = fallback.get(identifier);
    if (!entry || entry.resetAt <= now) {
      const resetAtMs = now + WINDOW_MS;
      fallback.set(identifier, { count: 1, resetAt: resetAtMs });
      return { allowed: true, remaining: LIMIT - 1, resetAt: resetAtMs, limit: LIMIT };
    }
    if (entry.count >= LIMIT) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: LIMIT };
    }
    entry.count++;
    return { allowed: true, remaining: LIMIT - entry.count, resetAt: entry.resetAt, limit: LIMIT };
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
