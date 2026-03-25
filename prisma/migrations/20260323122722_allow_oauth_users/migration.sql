-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'analyst',
    "organisationId" TEXT,
    CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CompetitorMonitor" (
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
);

-- CreateTable
CREATE TABLE "AnalysisCorrection" (
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
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
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
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Analysis" (
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
);
INSERT INTO "new_Analysis" ("analysisJson", "createdAt", "dataType", "durationMs", "id", "inputText", "inputTokens", "outputTokens", "title") SELECT "analysisJson", "createdAt", "dataType", "durationMs", "id", "inputText", "inputTokens", "outputTokens", "title" FROM "Analysis";
DROP TABLE "Analysis";
ALTER TABLE "new_Analysis" RENAME TO "Analysis";
CREATE UNIQUE INDEX "Analysis_shareToken_key" ON "Analysis"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisCorrection_analysisId_section_itemIndex_key" ON "AnalysisCorrection"("analysisId", "section", "itemIndex");
