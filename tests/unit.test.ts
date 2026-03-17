import { describe, it, expect } from "vitest";
import { validateAnalysis } from "@/lib/analysisSchema";
import { groundQuote, groundAnalysis } from "@/lib/grounding";
import { scanForPII, redactPII } from "@/lib/pii";
import { validateCSRF } from "@/lib/csrf";

// ---------------------------------------------------------------------------
// 1. Zod validation — valid analysis
// ---------------------------------------------------------------------------
describe("validateAnalysis", () => {
  const MINIMAL_VALID = {
    summary: "Test summary",
    com_b_mapping: {
      capability: { physical: [], psychological: [] },
      opportunity: { physical: [], social: [] },
      motivation: { reflective: [], automatic: [] },
    },
    confidence: { overall: "medium", rationale: "test" },
  };

  it("accepts a minimal valid analysis and fills defaults", () => {
    const result = validateAnalysis(MINIMAL_VALID);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("Test summary");
    expect(result!.key_behaviours).toEqual([]);
    expect(result!.barriers).toEqual([]);
    expect(result!.text_units_analysed).toBe(0);
  });

  // 2. Zod validation — rejects garbage
  it("rejects non-object input", () => {
    expect(validateAnalysis("not json")).toBeNull();
    expect(validateAnalysis(42)).toBeNull();
    expect(validateAnalysis(null)).toBeNull();
  });

  // 3. Zod validation — rejects missing required fields
  it("rejects input missing required fields", () => {
    expect(validateAnalysis({ summary: "ok" })).toBeNull();
    expect(validateAnalysis({ confidence: { overall: "low" } })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Grounding — exact match
// ---------------------------------------------------------------------------
describe("groundQuote", () => {
  it("returns grounded for exact substring", () => {
    const input = "People reported feeling overwhelmed by the number of choices available";
    const result = groundQuote("feeling overwhelmed by the number of choices", input);
    expect(result.level).toBe("grounded");
    expect(result.similarity).toBe(1.0);
  });

  // 5. Grounding — ungrounded hallucination
  it("returns ungrounded for fabricated quote", () => {
    const input = "Users enjoy using the mobile app for daily tasks";
    const result = groundQuote("Participants expressed deep frustration with regulatory compliance", input);
    expect(result.level).toBe("ungrounded");
  });

  // 6. Grounding — empty input
  it("returns ungrounded for empty inputs", () => {
    expect(groundQuote("", "some text").level).toBe("ungrounded");
    expect(groundQuote("quote", "").level).toBe("ungrounded");
  });
});

// ---------------------------------------------------------------------------
// 7. PII — detects email
// ---------------------------------------------------------------------------
describe("scanForPII", () => {
  it("detects email addresses", () => {
    const result = scanForPII("Contact john.doe@example.com for details");
    expect(result.hasPII).toBe(true);
    expect(result.matches.some((m) => m.type === "email")).toBe(true);
  });

  // 8. PII — clean text
  it("returns no PII for clean text", () => {
    const result = scanForPII("Users reported that they enjoy walking in the park on weekends");
    expect(result.hasPII).toBe(false);
    expect(result.totalCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. PII redaction
// ---------------------------------------------------------------------------
describe("redactPII", () => {
  it("redacts email addresses from text", () => {
    const redacted = redactPII("Email me at test@example.com");
    expect(redacted).not.toContain("test@example.com");
    expect(redacted).toContain("[REDACTED");
  });
});

// ---------------------------------------------------------------------------
// 10. CSRF — blocks cross-origin POST
// ---------------------------------------------------------------------------
describe("validateCSRF", () => {
  it("allows same-origin requests", () => {
    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    });
    expect(validateCSRF(req)).toBeNull();
  });

  it("blocks cross-origin POST requests", () => {
    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://evil.com",
      },
    });
    const result = validateCSRF(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows GET requests regardless of origin", () => {
    const req = new Request("http://localhost:3000/api/analyses", {
      method: "GET",
      headers: {
        host: "localhost:3000",
        origin: "http://evil.com",
      },
    });
    expect(validateCSRF(req)).toBeNull();
  });
});
