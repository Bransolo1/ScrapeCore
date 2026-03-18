/**
 * Dynamic Anthropic API key resolution.
 *
 * Resolution order:
 *  1. ANTHROPIC_API_KEY env var (set at server start)
 *  2. SCRAPECORE_ENV_FILE — path to a persisted env file managed by Electron
 *     (allows Electron users to set their key at runtime without restarting)
 *
 * Returns null if no key is configured.
 */

import fs from "fs";

let cachedKey: string | null | undefined = undefined;
let cacheTs = 0;
const CACHE_TTL_MS = 5_000; // re-read file at most every 5 s

export function getApiKey(): string | null {
  // 1. Env var wins — no file IO needed
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  // 2. Read from Electron userData env file if path is provided
  const envFile = process.env.SCRAPECORE_ENV_FILE;
  if (!envFile) return null;

  const now = Date.now();
  if (cachedKey !== undefined && now - cacheTs < CACHE_TTL_MS) return cachedKey;

  try {
    const content = fs.readFileSync(envFile, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (key === "ANTHROPIC_API_KEY") {
        const val = line.slice(eq + 1).trim();
        cachedKey = val || null;
        cacheTs = now;
        return cachedKey;
      }
    }
  } catch {
    // file not yet created or unreadable
  }

  cachedKey = null;
  cacheTs = now;
  return null;
}
