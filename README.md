# ScrapeCore — Behavioural Intelligence Platform

> Research any topic. Scrape any source. Get structured COM-B behavioural insight — powered by Claude Opus 4.6.

Built for startup founders, product managers, behavioural scientists, and insight researchers who need a diagnosis — not a chatbot summary.

### What can you research?

- **Consumer behaviour** — what motivates people to quit smoking, switch banks, adopt EVs
- **Company intelligence** — auto-discover a competitor's full digital footprint across review sites, app stores, and social channels
- **Market trends** — barriers to adoption, sentiment shifts, emerging needs
- **Health & policy** — patient motivations, intervention effectiveness, public attitudes
- **Any qualitative question** — if people are talking about it, ScrapeCore can analyse it

### How it works

```
Ask a question or collect sources  →  Review & select data  →  COM-B behavioural analysis
```

ScrapeCore combines two web intelligence tools with Claude's analysis engine:

| Tool | What it does | Powered by |
|---|---|---|
| **Research** | Searches the live web and synthesises a research report from multiple sources | Perplexity AI |
| **Scrape URLs** | Extracts full page content from specific URLs, including JavaScript-heavy sites | Firecrawl |

You can also pull data from Reddit, Twitter/X, Trustpilot, App Store, Google Play, Hacker News, Google News, RSS feeds, and more — or paste your own transcripts, surveys, and interview notes.

Everything feeds into the same pipeline: **sources → review → COM-B analysis → structured output**.

---

## Install the desktop app

No terminal. No Docker. No Node.js. Just download and run.

### 1 — Download your installer

Go to the **[Releases page](../../releases/latest)** and grab the file for your OS:

| OS | File to download |
|---|---|
| **macOS** | `ScrapeCore-{version}.dmg` |
| **Windows** | `ScrapeCore-Setup-{version}.exe` |
| **Linux** | `ScrapeCore-{version}.AppImage` |

**macOS note:** Right-click → Open on first launch (Gatekeeper prompt for unsigned apps).
**Linux note:** `chmod +x ScrapeCore-*.AppImage` then double-click.

### 2 — Add your API keys

1. Get an Anthropic key at **[console.anthropic.com](https://console.anthropic.com/settings/keys)** → API Keys (free to sign up)
2. Open ScrapeCore → click **⚙** (gear icon, top-right) → paste your key → **Save**
3. *(Optional)* Add a **Perplexity API key** for AI web research and a **Firecrawl API key** for JS-rendered scraping

Keys are stored in your user data folder on disk. They never leave your machine.

### 3 — Start analysing

Head to the **Research** tab to ask any question, **Scrape URLs** to extract specific pages, or **Upload / Paste** your own qualitative data — then hit **Run analysis** for a full COM-B behavioural diagnosis.

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

### Web Intelligence

| Mode | How to use |
|---|---|
| **Research** | Type any question — consumer behaviour, health motivations, market trends, company sentiment — and get AI-powered web research via Perplexity, ready for COM-B analysis |
| **Scrape URLs** | Paste one or more URLs — extract content directly from pages. Toggle Firecrawl for JavaScript-heavy sites (G2, Capterra, SPAs) |
| **Social listening** | Multi-source social data collection — Reddit, HackerNews, Twitter/X, Trustpilot, App Store, Google Play, Google News, RSS feeds, and more |
| **Company research** | Enter a company name to auto-discover and scrape its full digital footprint across review platforms, app stores, social channels, and the web |

### Your Data

| Mode | How to use |
|---|---|
| **Upload / Paste** | Paste interviews, survey open-ends, notes, transcripts directly |
| **Batch** | Analyse multiple documents in one session, then compare side-by-side |

### How Perplexity and Firecrawl work together

ScrapeCore uses two complementary external services for web intelligence:

| Service | Role | When to use |
|---|---|---|
| **Perplexity AI** | Searches the live web, reads multiple sources, and synthesises a research report | You have a **question** but no specific URLs — e.g. "what motivates people to switch banks", "barriers to EV adoption in the UK" |
| **Firecrawl** | Renders JavaScript and extracts full page content from specific URLs | You have **specific pages** to extract — e.g. G2 reviews, Capterra listings, SPAs, dynamic content |

**Perplexity** powers the **Research** tab (standalone queries), **Twitter/X** listening, and **Perplexity Research** within Social Listening. **Firecrawl** powers the **Scrape URLs** tab (with toggle) and website crawls within **Company Research**.

They feed into the same pipeline: collected sources → user review → COM-B behavioural analysis via Claude.

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

Set these via **⚙ Settings** (Electron) or in your `.env.local` / `.env.docker` file:

| Key | Enables |
|---|---|
| `PERPLEXITY_API_KEY` | AI web research, Twitter/X listening, and consumer insight queries via Perplexity Sonar |
| `FIRECRAWL_API_KEY` | JS-rendered site scraping for dynamic pages (G2, Capterra, SPAs) |

---

## For developers

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

### Docker (self-hosted team instance)

```bash
cp .env.docker.example .env.docker
# Set ANTHROPIC_API_KEY and NEXTAUTH_SECRET in .env.docker

docker compose --env-file .env.docker up -d
# → http://localhost:3000
```

### Build desktop installers

```bash
npm run dist:mac     # → dist-desktop/ScrapeCore-*.dmg
npm run dist:win     # → dist-desktop/ScrapeCore-Setup-*.exe
npm run dist:linux   # → dist-desktop/ScrapeCore-*.AppImage
```

Installers are also built automatically by GitHub Actions on every `v*` tag and attached to the GitHub Release as a draft.

### Key commands

```bash
npm run dev          # Next.js dev server
npm run test         # Vitest unit tests (12 tests)
npx tsc --noEmit     # TypeScript type check
npx prisma db push   # Apply schema changes
npx prisma studio    # Browse database in browser
npm run electron:dev # Electron + Next.js dev mode
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude Opus 4.6 |
| `NEXTAUTH_SECRET` | Yes (web/Docker) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production only | Your public URL |
| `DATABASE_URL` | Optional | Defaults to `file:./dev.db` |
| `SKIP_AUTH` | Optional | `true` disables login (Electron / local dev) |
| `PERPLEXITY_API_KEY` | Optional | AI web research + Twitter/X listening |
| `FIRECRAWL_API_KEY` | Optional | JS-render scraping for dynamic pages |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, SSE streaming) |
| AI | Anthropic Claude Opus 4.6 |
| Web Research | Perplexity Sonar (search + synthesis) |
| Page Extraction | Firecrawl (JS rendering + content extraction) |
| Desktop | Electron 33 + electron-builder (bundles everything — no runtime deps) |
| Database | Prisma 7 + SQLite via libsql adapter |
| Auth | NextAuth.js credentials + JWT |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Tests | Vitest (12 unit tests — schema validation, grounding, PII, CSRF) |
| CI | GitHub Actions — typecheck + tests on every PR; release build on `v*` tags |

---

## Licence

Private — all rights reserved.
