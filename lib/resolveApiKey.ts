/**
 * Per-user API key resolution.
 *
 * Resolution order:
 *  1. User's own key (encrypted in DB) → decrypt at runtime
 *  2. Platform env var (shared fallback)
 *  3. null — no key available
 */

import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getApiKey } from "@/lib/getApiKey";

const ENV_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  firecrawl: "FIRECRAWL_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  brave: "BRAVE_SEARCH_API_KEY",
};

export type KeySource = "user" | "platform";

export async function resolveApiKey(
  provider: "anthropic" | "firecrawl" | "perplexity" | "brave",
  userId: string | undefined
): Promise<{ key: string; source: KeySource } | null> {
  // 1. Try user's own key
  if (userId && userId !== "anonymous") {
    try {
      const row = await prisma.userApiKey.findUnique({
        where: { userId_provider: { userId, provider } },
      });
      if (row) {
        const key = decrypt({ cipher: row.cipher, iv: row.iv, tag: row.tag });
        if (key) return { key, source: "user" };
      }
    } catch {
      // Decryption or DB failure — fall through to platform key
    }
  }

  // 2. Platform env var
  if (provider === "anthropic") {
    // Use existing getApiKey() which handles Electron env file fallback
    const envKey = getApiKey();
    if (envKey) return { key: envKey, source: "platform" };
  } else {
    const envVar = ENV_MAP[provider];
    const envKey = envVar ? process.env[envVar] : undefined;
    if (envKey) return { key: envKey, source: "platform" };
  }

  return null;
}
