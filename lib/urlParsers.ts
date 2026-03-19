/**
 * Smart URL parsers that auto-extract IDs from pasted URLs.
 * Users can paste a full URL instead of manually finding IDs.
 */

/** Extract iOS App ID from App Store URL: apps.apple.com/.../id1234567890 */
export function extractAppStoreId(input: string): string | null {
  const trimmed = input.trim();
  // Already a numeric ID
  if (/^\d{6,}$/.test(trimmed)) return trimmed;
  // URL format: apps.apple.com/...../id1234567890
  const match = trimmed.match(/apps\.apple\.com\/.*?\/id(\d+)/i);
  return match?.[1] ?? null;
}

/** Extract Android package ID from Play Store URL: play.google.com/store/apps/details?id=com.example.app */
export function extractPlayStoreId(input: string): string | null {
  const trimmed = input.trim();
  // Already a package ID (com.xxx.yyy)
  if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(trimmed)) return trimmed;
  // URL format: play.google.com/store/apps/details?id=com.example.app
  const match = trimmed.match(/play\.google\.com\/store\/apps\/details\?.*?id=([a-zA-Z0-9_.]+)/i);
  return match?.[1] ?? null;
}

/** Extract G2 product slug from URL: g2.com/products/salesforce-crm/reviews */
export function extractG2Slug(input: string): string | null {
  const trimmed = input.trim();
  // URL format
  const match = trimmed.match(/g2\.com\/products\/([a-zA-Z0-9-]+)/i);
  if (match) return match[1];
  // Already a slug (lowercase with hyphens, no spaces)
  if (/^[a-z0-9-]+$/.test(trimmed) && trimmed.includes("-")) return trimmed;
  return null;
}

/** Extract Capterra product slug from URL: capterra.com/p/12345/slug or capterra.com/software/slug */
export function extractCapterraSlug(input: string): string | null {
  const trimmed = input.trim();
  // URL format: /p/12345/slug or /software/slug
  const match = trimmed.match(/capterra\.com\/(?:p\/\d+\/|software\/)([a-zA-Z0-9-]+)/i);
  if (match) return match[1];
  // Numeric ID
  const numMatch = trimmed.match(/capterra\.com\/p\/(\d+)/i);
  if (numMatch) return numMatch[1];
  // Already a slug or ID
  if (/^[a-z0-9-]+$/i.test(trimmed)) return trimmed;
  return null;
}

/** Extract Trustpilot domain from URL: trustpilot.com/review/example.com */
export function extractTrustpilotDomain(input: string): string | null {
  const trimmed = input.trim();
  // URL format
  const match = trimmed.match(/trustpilot\.com\/review\/([a-zA-Z0-9.-]+)/i);
  if (match) return match[1];
  // Already a domain
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed)) return trimmed;
  return null;
}

/**
 * Smart input handler: detects if user pasted a URL and extracts the relevant ID.
 * Returns { value, wasUrl } so the UI can show feedback.
 */
export function smartExtract(
  input: string,
  type: "appstore" | "googleplay" | "g2" | "capterra" | "trustpilot"
): { value: string; wasUrl: boolean } {
  const extractors = {
    appstore: extractAppStoreId,
    googleplay: extractPlayStoreId,
    g2: extractG2Slug,
    capterra: extractCapterraSlug,
    trustpilot: extractTrustpilotDomain,
  };

  const extracted = extractors[type](input);
  if (extracted && extracted !== input.trim()) {
    return { value: extracted, wasUrl: true };
  }
  return { value: input, wasUrl: false };
}
