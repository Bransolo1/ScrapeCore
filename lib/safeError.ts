/**
 * Sanitize error messages for API responses.
 * In production, returns a generic message to avoid leaking internals.
 * In development, returns the full error for debugging.
 */
export function safeErrorMessage(err: unknown, fallback = "An unexpected error occurred. Please try again."): string {
  if (process.env.NODE_ENV === "development") {
    return err instanceof Error ? err.message : String(err);
  }

  // In production, only expose known safe error messages
  if (err instanceof Error) {
    // Prisma unique constraint — safe to expose
    if (err.message.includes("Unique constraint")) {
      return "A record with that value already exists.";
    }
    // Not found — safe
    if (err.message.includes("Record to update not found") || err.message.includes("Record to delete does not exist")) {
      return "The requested record was not found.";
    }
  }

  // Log the real error server-side
  console.error("[API Error]", err);

  return fallback;
}
