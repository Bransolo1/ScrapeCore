interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Per-IP in-memory store — resets on server restart
const store = new Map<string, RateLimitEntry>();

const LIMIT = process.env.NODE_ENV === "development" ? 100 : 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + WINDOW_MS;
    store.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: LIMIT - 1, resetAt, limit: LIMIT };
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: LIMIT };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: LIMIT - entry.count,
    resetAt: entry.resetAt,
    limit: LIMIT,
  };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
