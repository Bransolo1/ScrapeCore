import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma(): PrismaClient {
  // DATABASE_URL supports:
  //   file:./dev.db            — local SQLite (default dev)
  //   file:/data/scrapecore.db — Docker volume mount
  //   libsql://...             — Turso remote (production SaaS)
  //
  // For Postgres: install @prisma/adapter-pg + pg, then swap adapter here.
  const dbUrl =
    process.env.DATABASE_URL ??
    `file:${path.resolve(process.cwd(), "dev.db")}`;

  const adapter = new PrismaLibSql({
    url: dbUrl,
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
