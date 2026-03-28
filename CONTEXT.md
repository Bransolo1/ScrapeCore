# ScrapeCore — Session Context Tracker

**Last updated:** 2026-03-28
**Goal:** Behavioural market intelligence web platform

---

## What Is ScrapeCore

A **behavioural market intelligence platform** that converts qualitative text (interviews, reviews, survey responses) into structured **COM-B behavioural analysis** using Claude Opus 4.6.

**Core loop:** Paste text / scrape URLs / social listen → Claude analyses → COM-B mapping, barriers, motivators, interventions, confidence scores → Export PDF/MD/JSON.

---

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router, SSE streaming) | Conditional `output: "standalone"` for Docker |
| AI | Anthropic Claude Opus 4.6 via `@anthropic-ai/sdk` | User provides own API key |
| Database | **SQLite** via Prisma 7 + `@prisma/adapter-libsql` | Supports `libsql://` URLs (Turso) for cloud hosting |
| Auth | NextAuth.js credentials + JWT | `SKIP_AUTH=true` for local dev |
| Styling | Tailwind CSS | |
| Charts | Recharts | |
| Tests | Vitest (12 unit tests) | |
| CI | GitHub Actions | Typecheck + tests on PR |

---

## Key Files

| File | Purpose |
|---|---|
| `lib/db.ts` | Prisma client init — handles `libsql://` for Turso |
| `prisma/schema.prisma` | SQLite provider, 7 models (User, Organisation, Analysis, CompetitorMonitor, AnalysisCorrection, RateLimit, AuditLog) |
| `middleware.ts` | NextAuth route protection |
| `lib/getApiKey.ts` | API key retrieval |
| `next.config.mjs` | Conditional `output: "standalone"` for Docker |
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

## Deployment Options

1. **Vercel + Turso** (recommended) — free cloud hosting, see `DEPLOY_GUIDE.md`
2. **Docker** — self-hosted team instance via `docker-compose`
3. **Local dev** — `npm run dev` with local SQLite

---

## Work Log

| Date | Action |
|---|---|
| 2026-03-18 | Initial codebase analysis complete. Writing migration plan. |
| 2026-03-18 | Implemented all code changes for Vercel + Turso hosting. 12/12 tests pass, typecheck clean. |
| 2026-03-18 | Added DEPLOY_GUIDE.md — plain English step-by-step deployment walkthrough. |
| 2026-03-18 | Updated prisma.config.ts for Turso adapter support. Added /api/setup endpoint for terminal-free DB setup. Updated deploy guide to be fully terminal-free. |
| 2026-03-28 | Removed all Electron/desktop app code. ScrapeCore is now a web-only platform. |
