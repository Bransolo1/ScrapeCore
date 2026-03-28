# ScrapeCore — Behavioural Market Intelligence

> Converts raw qualitative text into structured COM-B behavioural insight, powered by Claude Opus 4.6.

Built for startup founders, product managers, behavioural scientists, and insight researchers who need a diagnosis — not a chatbot summary.

---

## Getting started

ScrapeCore is a web platform. Deploy it for free using Vercel + Turso, or self-host with Docker.

### Deploy to the web (free)

Follow the step-by-step guide in **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** to deploy on Vercel + Turso in ~20 minutes at zero cost.

### Docker (self-hosted team instance)

```bash
cp .env.docker.example .env.docker
# Set ANTHROPIC_API_KEY and NEXTAUTH_SECRET in .env.docker

docker compose --env-file .env.docker up -d
# → http://localhost:3000
```

### Local development

```bash
git clone <repo-url>
cd ScrapeCore
npm install
cp .env.local.example .env.local
# Set ANTHROPIC_API_KEY and NEXTAUTH_SECRET in .env.local

npx prisma db push
npm run dev          # → http://localhost:3000
```

---

## What an analysis gives you

| Output | Description |
|---|---|
| **COM-B mapping** | Capability / Opportunity / Motivation signals per sub-dimension with evidence quotes |
| **Key behaviours** | Observed behaviours rated by frequency and importance |
| **Barriers** | What stops the target behaviour — ranked by severity, with source text |
| **Motivators & Facilitators** | What drives and enables the behaviour |
| **Behavioural context** | Where, when, and with whom behaviours occur |
| **Intervention opportunities** | BCW interventions ranked by priority, mapped to specific BCT techniques |
| **Contradictions** | Where evidence conflicts and what it means |
| **Confidence assessment** | Grounding score, high-trust flag, limitations summary |
| **Evidence click-through** | Every quote links back to its exact location in your input |
| **Export** | PDF (print dialog), Markdown report, JSON data |

---

## Input modes

| Mode | How to use |
|---|---|
| **Paste text** | Paste interviews, survey open-ends, notes, transcripts directly |
| **Scrape URLs** | Paste one or more URLs — ScrapeCore fetches and extracts the text |
| **Social listening** | Reddit, HackerNews, App Store / Play Store reviews |
| **Digital footprint** | Competitor URL analysis |
| **Batch** | Analyse multiple documents in one session, then compare them side-by-side |

---

## Pages

| Page | Purpose |
|---|---|
| **Analyse** (`/`) | Main workspace |
| **Dashboard** (`/dashboard`) | COM-B frequency trends and quality metrics across all your analyses |
| **Compare** (`/compare`) | Side-by-side COM-B diff between any two analyses |
| **Eval Lab** (`/eval`) | Rubric scoring, prompt version diff, A/B evaluation |
| **Monitor** (`/monitoring`) | Scheduled competitor scans with change detection |
| **Audit Log** (`/audit`) | Full record of every analysis run and PII events |

---

## Optional integrations

Set these via **⚙ Settings** or in your `.env.local` / `.env.docker` file:

| Key | Enables |
|---|---|
| `PERPLEXITY_API_KEY` | Live web research + Twitter/X listening via Perplexity Sonar |
| `FIRECRAWL_API_KEY` | JS-rendered site scraping (G2, Capterra, SPAs) |

---

## Key commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run start        # Run production build
npm run test         # Vitest unit tests (12 tests)
npx tsc --noEmit     # TypeScript type check
npx prisma db push   # Apply schema changes
npx prisma studio    # Browse database in browser
```

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude Opus 4.6 |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production only | Your public URL |
| `DATABASE_URL` | Optional | Defaults to `file:./dev.db`; supports `libsql://` for Turso |
| `TURSO_AUTH_TOKEN` | Turso only | Auth token for hosted libsql |
| `SKIP_AUTH` | Optional | `true` disables login (local dev) |
| `PERPLEXITY_API_KEY` | Optional | Live research features |
| `FIRECRAWL_API_KEY` | Optional | JS-render scraping |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, SSE streaming) |
| AI | Anthropic Claude Opus 4.6 |
| Database | Prisma 7 + SQLite via libsql adapter (local or Turso) |
| Auth | NextAuth.js credentials + JWT |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Tests | Vitest (12 unit tests — schema validation, grounding, PII, CSRF) |
| CI | GitHub Actions — typecheck + tests on every PR |

---

## Licence

Private — all rights reserved.
