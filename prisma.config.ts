import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbUrl = process.env["DATABASE_URL"] ?? `file:${path.resolve(process.cwd(), "dev.db")}`;
const isTurso = dbUrl.startsWith("libsql://");

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Use JS engine when connecting to Turso (required for libsql adapter)
  ...(isTurso ? { engine: "js" } : {}),
  migrations: {
    path: "prisma/migrations",
  },
  // Prisma CLI validates datasource.url against the SQLite scheme,
  // so for Turso we pass a placeholder here and let the adapter do the real connection
  datasource: { url: isTurso ? "file:./placeholder.db" : dbUrl },
  ...(isTurso
    ? {
        adapter: async () =>
          new PrismaLibSql({
            url: dbUrl,
            authToken: process.env["TURSO_AUTH_TOKEN"],
          }),
      }
    : {}),
});
