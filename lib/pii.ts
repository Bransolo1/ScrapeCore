/**
 * PII Detection and Redaction
 *
 * Regex-based scanner for common personally identifiable information types.
 * Used as a pre-analysis gate to warn users before sending sensitive data to the API.
 */

export type PIIType =
  | "email"
  | "phone"
  | "credit_card"
  | "ssn"
  | "national_insurance"
  | "nhs_number"
  | "ip_address"
  | "date_of_birth"
  | "passport";

export interface PIIMatch {
  type: PIIType;
  label: string;
  count: number;
  examples: string[]; // first 3 matches, partially masked
}

export interface PIIScanResult {
  hasPII: boolean;
  matches: PIIMatch[];
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const PATTERNS: { type: PIIType; label: string; regex: RegExp }[] = [
  {
    type: "email",
    label: "Email addresses",
    regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    type: "phone",
    label: "Phone numbers",
    // Matches: +44 7700 900000, (555) 123-4567, 07700 900000, +1-800-555-1234
    regex:
      /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/g,
  },
  {
    type: "credit_card",
    label: "Credit/debit card numbers",
    // 16-digit cards with optional separators, also Amex 15-digit
    regex: /\b(?:\d[ \-]?){13,16}\b(?=\s|$|[^\d])/g,
  },
  {
    type: "ssn",
    label: "US Social Security numbers",
    regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  },
  {
    type: "national_insurance",
    label: "UK National Insurance numbers",
    regex: /\b[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]\b/gi,
  },
  {
    type: "nhs_number",
    label: "NHS numbers",
    // 10 digits with optional spaces after 3rd and 6th digit
    regex: /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b/g,
  },
  {
    type: "ip_address",
    label: "IP addresses",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  },
  {
    type: "date_of_birth",
    label: "Dates of birth (explicit DOB context)",
    // Only flag when preceded by DOB/born/date of birth context
    regex:
      /(?:dob|date of birth|born on|born:)\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/gi,
  },
  {
    type: "passport",
    label: "Passport numbers",
    // UK: 9 digits; US: 9 alphanumeric
    regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskExample(s: string, type: PIIType): string {
  const len = s.length;
  if (type === "email") {
    const [local, domain] = s.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (type === "credit_card") {
    const digits = s.replace(/\D/g, "");
    return `****-****-****-${digits.slice(-4)}`;
  }
  // Generic: keep first 3 and last 2 chars
  if (len <= 5) return "*".repeat(len);
  return `${s.slice(0, 3)}${"*".repeat(Math.max(len - 5, 3))}${s.slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Scan text for PII. Returns match summary without exposing raw values.
 */
export function scanForPII(text: string): PIIScanResult {
  const matches: PIIMatch[] = [];
  let totalCount = 0;

  for (const { type, label, regex } of PATTERNS) {
    // Reset lastIndex for global regexes
    regex.lastIndex = 0;
    const found = Array.from(text.matchAll(regex)).map((m) => m[0]);
    if (found.length > 0) {
      const unique = Array.from(new Set(found));
      matches.push({
        type,
        label,
        count: found.length,
        examples: unique.slice(0, 3).map((v) => maskExample(v, type)),
      });
      totalCount += found.length;
    }
  }

  return { hasPII: totalCount > 0, matches, totalCount };
}

/**
 * Redact all detected PII in a text string, replacing with [REDACTED_TYPE] tokens.
 */
export function redactPII(text: string): string {
  let redacted = text;
  for (const { type, regex } of PATTERNS) {
    regex.lastIndex = 0;
    const token = `[REDACTED_${type.toUpperCase()}]`;
    redacted = redacted.replace(regex, token);
  }
  return redacted;
}
