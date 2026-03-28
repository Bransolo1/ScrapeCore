import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCSRF } from "@/lib/csrf";

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock rate limiting — allowed by default
// ---------------------------------------------------------------------------
const mockCheckRateLimit = vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 900000, limit: 20 });
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimitWithConfig: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

// ---------------------------------------------------------------------------
// Mock audit logging — no-op
// ---------------------------------------------------------------------------
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import bcrypt for creating test hashes, and the function under test
// ---------------------------------------------------------------------------
import bcrypt from "bcryptjs";
import { authenticateCredentials } from "@/lib/auth";

const TEST_PASSWORD = "securePass123!";
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 4); // low cost for test speed

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_123",
    email: "test@example.com",
    name: "Test User",
    passwordHash: TEST_HASH,
    role: "analyst",
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 900000, limit: 20 });
  mockUpdate.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// 1. Successful login
// ---------------------------------------------------------------------------
describe("authenticateCredentials", () => {
  it("returns user object on valid credentials", async () => {
    mockFindUnique.mockResolvedValue(makeUser());
    const result = await authenticateCredentials("test@example.com", TEST_PASSWORD, "127.0.0.1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("user_123");
    expect(result!.email).toBe("test@example.com");
    expect(result!.role).toBe("analyst");
  });

  // 2. Wrong password
  it("returns null for wrong password", async () => {
    mockFindUnique.mockResolvedValue(makeUser());
    const result = await authenticateCredentials("test@example.com", "wrongPassword!", "127.0.0.1");
    expect(result).toBeNull();
  });

  // 3. Nonexistent user (timing-safe — should still take bcrypt time)
  it("returns null for nonexistent user", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await authenticateCredentials("nobody@example.com", TEST_PASSWORD, "127.0.0.1");
    expect(result).toBeNull();
  });

  // 4. Missing / empty credentials
  it("returns null for empty email", async () => {
    const result = await authenticateCredentials("", TEST_PASSWORD, "127.0.0.1");
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  // 5. IP rate limit exceeded
  it("throws TOO_MANY_ATTEMPTS when IP rate limited", async () => {
    // First call (IP check) returns rate limited
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 900000, limit: 20 });
    await expect(authenticateCredentials("test@example.com", TEST_PASSWORD, "1.2.3.4"))
      .rejects.toThrow("TOO_MANY_ATTEMPTS");
  });

  // 6. Email rate limit exceeded
  it("throws TOO_MANY_ATTEMPTS when email rate limited", async () => {
    // First call (IP check) passes, second call (email check) fails
    mockCheckRateLimit
      .mockResolvedValueOnce({ allowed: true, remaining: 10, resetAt: Date.now() + 900000, limit: 20 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 900000, limit: 5 });
    await expect(authenticateCredentials("test@example.com", TEST_PASSWORD, "127.0.0.1"))
      .rejects.toThrow("TOO_MANY_ATTEMPTS");
  });

  // 7. Locked account
  it("throws ACCOUNT_LOCKED when account is locked", async () => {
    mockFindUnique.mockResolvedValue(makeUser({ lockedUntil: new Date(Date.now() + 60000) }));
    await expect(authenticateCredentials("test@example.com", TEST_PASSWORD, "127.0.0.1"))
      .rejects.toThrow("ACCOUNT_LOCKED");
  });

  // 8. Expired lock allows login
  it("allows login when lock has expired", async () => {
    mockFindUnique.mockResolvedValue(makeUser({ lockedUntil: new Date(Date.now() - 1000), failedLoginAttempts: 5 }));
    const result = await authenticateCredentials("test@example.com", TEST_PASSWORD, "127.0.0.1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("user_123");
  });

  // 9. Password exceeding max length
  it("returns null for password exceeding 128 characters", async () => {
    const longPassword = "a".repeat(129);
    const result = await authenticateCredentials("test@example.com", longPassword, "127.0.0.1");
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  // 10. Successful login resets failure count
  it("resets failedLoginAttempts on successful login", async () => {
    mockFindUnique.mockResolvedValue(makeUser({ failedLoginAttempts: 3, lockedUntil: new Date(Date.now() - 1000) }));
    await authenticateCredentials("test@example.com", TEST_PASSWORD, "127.0.0.1");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_123" },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    );
  });

  // 11. Email over 254 chars
  it("returns null for email exceeding 254 characters", async () => {
    const longEmail = "a".repeat(250) + "@b.com";
    const result = await authenticateCredentials(longEmail, TEST_PASSWORD, "127.0.0.1");
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 12. CSRF — missing host header now returns 403
// ---------------------------------------------------------------------------
describe("validateCSRF — host header fix", () => {
  it("returns 403 when host header is missing", () => {
    const req = new Request("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        // no host header
      },
    });
    const result = validateCSRF(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
