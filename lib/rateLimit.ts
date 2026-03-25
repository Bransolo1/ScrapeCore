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

/** Purge expired fallback entries to prevent unbounded memory growth. */
function purgeFallback() {
  const now = Date.now();
  fallback.forEach((entry, key) => {
    if (entry.resetAt <= now) fallback.delete(key);
  });
}

// Run cleanup every 10 minutes
setInterval(purgeFallback, 10 * 60 * 1000).unref();

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

/**
 * Rate limiter with custom limit — for routes that need a different threshold.
 * Uses same DB/fallback mechanism but with a separate namespace.
 */
export async function checkRateLimitWithConfig(
  identifier: string,
  limit: number,
  windowMs: number = WINDOW_MS
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    const row = await prisma.rateLimit.findUnique({ where: { id: identifier } });

    if (!row || row.resetAt.getTime() <= now) {
      await prisma.rateLimit.upsert({
        where: { id: identifier },
        update: { count: 1, resetAt },
        create: { id: identifier, count: 1, resetAt },
      });
      return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime(), limit };
    }

    if (row.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: row.resetAt.getTime(), limit };
    }

    const updated = await prisma.rateLimit.update({
      where: { id: identifier },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, remaining: limit - updated.count, resetAt: row.resetAt.getTime(), limit };
  } catch {
    const entry = fallback.get(identifier);
    if (!entry || entry.resetAt <= now) {
      const resetAtMs = now + windowMs;
      fallback.set(identifier, { count: 1, resetAt: resetAtMs });
      return { allowed: true, remaining: limit - 1, resetAt: resetAtMs, limit };
    }
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit };
    }
    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt, limit };
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
