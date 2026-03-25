/**
 * GET /api/platform-keys
 * Returns which platform-level API keys are configured (boolean only, no secrets).
 * Used by the Settings UI to show "Using platform key" vs "Not configured".
 */

import { getApiKey } from "@/lib/getApiKey";

export async function GET() {
  return Response.json({
    anthropic: !!getApiKey(),
    firecrawl: !!process.env.FIRECRAWL_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
  });
}
