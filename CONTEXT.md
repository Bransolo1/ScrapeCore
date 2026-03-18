# ScrapeCore — Session Context Tracker

**Last updated:** 2026-03-18
**Branch:** `claude/cloud-migration-plan-3jLo8`
**Goal:** Convert desktop/local app → free web-hosted app

---

## What Is ScrapeCore

A **behavioural market intelligence platform** that converts qualitative text (interviews, reviews, survey responses) into structured **COM-B behavioural analysis** using Claude Opus 4.6.

**Core loop:** Paste text / scrape URLs / social listen → Claude analyses → COM-B mapping, barriers, motivators, interventions, confidence scores → Export PDF/MD/JSON.

---

## Current Architecture

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router, SSE streaming) | `output: "standalone"` in next.config |
| AI | Anthropic Claude Opus 4.6 via `@anthropic-ai/sdk` | User provides own API key |
| Desktop | Electron 33 + electron-builder | Wraps Next.js standalone server |
| Database | **SQLite** via Prisma 7 + `@prisma/adapter-libsql` | `lib/db.ts` already supports `libsql://` URLs (Turso) |
| Auth | NextAuth.js credentials + JWT | `SKIP_AUTH=true` for Electron |
| Styling | Tailwind CSS | |
| Charts | Recharts | |
| Tests | Vitest (12 unit tests) | |
| CI | GitHub Actions | Typecheck + tests on PR; release build on `v*` tags |

---

## Key Files

| File | Purpose |
|---|---|
| `lib/db.ts` | Prisma client init — **already handles `libsql://` for Turso** |
| `prisma/schema.prisma` | SQLite provider, 7 models (User, Organisation, Analysis, CompetitorMonitor, AnalysisCorrection, RateLimit, AuditLog) |
| `middleware.ts` | NextAuth route protection |
| `lib/getApiKey.ts` | API key retrieval |
| `next.config.mjs` | `output: "standalone"` |
| `docker-compose.yml` | Docker setup with SQLite volume |
| `Dockerfile` | Multi-stage Node 20 Alpine build |
| `.env.local.example` | Env var template |

---

## Database Models (Prisma)

- **User** — email, passwordHash, role (analyst/admin), organisationId
- **Organisation** — name, users[], analyses[]
- **Analysis** — title, dataType, analysisJson, inputText, tokens, review workflow, PII flags, rubric scores, eval data, share tokens
- **CompetitorMonitor** — scheduled competitor scans
- **AnalysisCorrection** — analyst corrections on findings
- **RateLimit** — IP/user rate limiting
- **AuditLog** — full event audit trail

---

## Pages / Routes

| Route | Purpose |
|---|---|
| `/` | Main analysis workspace |
| `/dashboard` | COM-B trends, quality metrics |
| `/compare` | Side-by-side analysis diff |
| `/eval` | Rubric scoring, A/B eval |
| `/monitoring` | Scheduled competitor scans |
| `/audit` | Audit log viewer |
| `/share/[token]` | Public read-only shared analysis |

---

## API Routes

`/api/analyze`, `/api/scrape`, `/api/social`, `/api/search`, `/api/sources/*` (googleplay, capterra, perplexity, webcrawl, rss), `/api/monitoring/*`, `/api/compare-summary`, `/api/pii/scan`, `/api/audit`, `/api/share/[token]`, `/api/auth/*`, `/api/analyses/*`

---

## What's Already Web-Ready

1. `lib/db.ts` supports `libsql://` URLs → Turso works with zero code changes
2. NextAuth.js auth is fully built
3. Dockerfile exists and works
4. Docker-compose has env var injection
5. SSE streaming works over HTTP
6. All API routes are standard Next.js route handlers

## What Needs Changing for Web Hosting

1. **Database:** SQLite file → Turso (hosted libsql) — just change DATABASE_URL
2. **Prisma schema:** May need `driver = "libsql"` adapter config
3. **next.config.mjs:** Remove `output: "standalone"` for Vercel (Vercel handles this)
4. **Environment variables:** Set in Vercel dashboard instead of .env files
5. **Monitoring/cron:** CompetitorMonitor scheduled jobs need Vercel Cron or similar
6. **File storage:** No persistent filesystem on Vercel — but app doesn't write files (SQLite was the only concern, solved by Turso)

---

## Work Log

| Date | Action |
|---|---|
| 2026-03-18 | Initial codebase analysis complete. Writing migration plan. |
| 2026-03-18 | Implemented all code changes for Vercel + Turso hosting. 12/12 tests pass, typecheck clean. |
| 2026-03-18 | Added DEPLOY_GUIDE.md — plain English step-by-step deployment walkthrough. |
| 2026-03-18 | Updated prisma.config.ts for Turso adapter support. Added /api/setup endpoint for terminal-free DB setup. Updated deploy guide to be fully terminal-free. |
