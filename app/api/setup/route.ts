import { createClient } from "@libsql/client";

// One-time database setup endpoint.
// Creates all tables in Turso if they don't exist.
// Safe to call multiple times (uses IF NOT EXISTS).
// After first successful run, this is a no-op.

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'analyst',
    "organisationId" TEXT,
    CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Organisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "analysisJson" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "project" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewNotes" TEXT,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "piiDetected" BOOLEAN NOT NULL DEFAULT false,
    "promptVersion" TEXT,
    "projectContext" TEXT,
    "evalJson" TEXT,
    "rubricJson" TEXT,
    "evalPassed" BOOLEAN,
    "evalNotes" TEXT,
    "userId" TEXT,
    "organisationId" TEXT,
    "shareToken" TEXT,
    CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Analysis_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "CompetitorMonitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "competitorName" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "schedule" TEXT NOT NULL DEFAULT 'weekly',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME NOT NULL,
    "lastAnalysisId" TEXT,
    "userId" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "AnalysisCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "analysisId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "correctedBy" TEXT NOT NULL DEFAULT 'analyst',
    CONSTRAINT "AnalysisCorrection_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "RateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "entityId" TEXT,
    "entityType" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "analysisId" TEXT,
    "userId" TEXT,
    CONSTRAINT "AuditLog_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Analysis_shareToken_key" ON "Analysis"("shareToken")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisCorrection_analysisId_section_itemIndex_key" ON "AnalysisCorrection"("analysisId", "section", "itemIndex")`,
];

export async function GET(req: Request) {
  // Only allow with setup secret or in first-time setup
  const authHeader = req.headers.get("authorization");
  const setupSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (setupSecret && authHeader !== `Bearer ${setupSecret}`) {
    return Response.json(
      { error: "Pass your NEXTAUTH_SECRET as Bearer token to authorize" },
      { status: 401 }
    );
  }

  const dbUrl = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl?.startsWith("libsql://")) {
    return Response.json(
      { error: "DATABASE_URL is not a Turso/libsql URL. Setup not needed for local SQLite." },
      { status: 400 }
    );
  }

  try {
    const client = createClient({ url: dbUrl, authToken });

    const results: Array<{ sql: string; ok: boolean; error?: string }> = [];

    for (const sql of SCHEMA_SQL) {
      try {
        await client.execute(sql);
        results.push({ sql: sql.slice(0, 60) + "...", ok: true });
      } catch (err) {
        results.push({
          sql: sql.slice(0, 60) + "...",
          ok: false,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    client.close();

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      return Response.json({ success: false, results }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "All tables and indexes created. Your database is ready.",
      tables: results.length,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
