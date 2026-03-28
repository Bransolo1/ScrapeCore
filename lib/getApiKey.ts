/**
 * Returns the platform-level Anthropic API key from environment variables.
 * Returns null if no key is configured.
 */
export function getApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}
