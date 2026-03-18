# ScrapeCore — Behavioural Market Intelligence

ScrapeCore converts raw qualitative text — interviews, reviews, social posts, survey responses — into structured behavioural insight using the **COM-B model** (Capability, Opportunity, Motivation → Behaviour), the Behaviour Change Wheel, and BCT taxonomy. Powered by Claude Opus 4.6.

Built for startup founders, product managers, behavioural scientists, and insight researchers who need actionable intelligence fast — not a chatbot summary, but a diagnosis.

---

## Install (Desktop App — recommended for most users)

### Step 1 — Download

Go to **[Releases](../../releases)** and download the installer for your platform:

| Platform | File | Notes |
|---|---|---|
| **Windows** | `ScrapeCore-Setup-{version}.exe` | Double-click to install via NSIS wizard |
| **macOS** | `ScrapeCore-{version}.dmg` | Drag to Applications. Right-click → Open on first launch |
| **Linux** | `ScrapeCore-{version}.AppImage` | `chmod +x *.AppImage` then double-click |

No Node.js, no Docker, no terminal required. All dependencies are bundled.

### Step 2 — Add your Anthropic API key

1. Get a free API key at **[console.anthropic.com](https://console.anthropic.com/settings/keys)** → API Keys
2. Open ScrapeCore → click the **⚙ Settings** gear (top-right)
3. Paste your key → Save

That's it. The key is stored securely in your user data folder and never leaves your machine.

---

## Install (Docker — teams and self-hosted)

```bash
# 1. Copy env template
cp .env.docker.example .env.docker

# 2. Fill in two values:
#    ANTHROPIC_API_KEY=sk-ant-...
#    NEXTAUTH_SECRET=$(openssl rand -base64 32)

# 3. Start
docker compose --env-file .env.docker up -d
```

Open **http://localhost:3000** — the first person to register becomes the admin.

---

## Install (Local development)

```bash
git clone <repo-url>
cd ScrapeCore
npm install
cp .env.local.example .env.local
# Edit .env.local — set ANTHROPIC_API_KEY and NEXTAUTH_SECRET

npx prisma db push
npm run dev
# → http://localhost:3000
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Claude Opus 4.6 — core analysis engine |
| `NEXTAUTH_SECRET` | **Yes** (web) | Random session secret. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | In production | Your public URL e.g. `https://scrapecore.myorg.com` |
| `PERPLEXITY_API_KEY` | Optional | Enables live web research and social listening |
| `FIRECRAWL_API_KEY` | Optional | Enables JS-rendered site scraping (G2, Capterra, SPAs) |
| `DATABASE_URL` | Optional | Defaults to `file:./dev.db`. Docker uses `file:/data/scrapecore.db` |
| `SKIP_AUTH` | Optional | `true` disables login screen — local dev / Electron builds only |

---

## Pages

| Page | What it does |
|---|---|
| `/` — **Analyse** | Main workspace: paste text or scrape sources, run COM-B analysis |
| `/dashboard` — **Dashboard** | Aggregate stats, quality trends, COM-B frequency across all analyses |
| `/compare` — **Compare** | Side-by-side COM-B diff between two analyses — competitor benchmarking |
| `/eval` — **Eval Lab** | Rubric scoring, prompt A/B comparison, quality tracking across versions |
| `/monitoring` — **Monitor** | Scheduled competitor monitoring — recurring scans with change detection |
| `/audit` — **Audit Log** | Full record of who ran what analysis, when, and any PII events |

---

## What each analysis produces

- **COM-B mapping** — signals per sub-dimension with evidence quotes
- **Key behaviours** — observed behaviours, rated by frequency and importance
- **Barriers** — what stops the target behaviour, ranked by severity, with source text
- **Motivators & Facilitators** — what drives and enables the behaviour
- **Behavioural context** — where, when, and with whom behaviours occur
- **Intervention opportunities** — ranked BCW interventions with specific BCT techniques
- **Contradictions** — where evidence conflicts and what it means
- **Confidence assessment** — grounding score, high-trust suitability flag, limitations
- **Evidence click-through** — every quote links back to the original input text
- **Export** — PDF (print dialog), Markdown report, JSON data

---

## Input modes

| Mode | Description |
|---|---|
| **Paste text** | Direct text input — surveys, transcripts, notes |
| **Scrape URLs** | Paste URLs and scrape page content |
| **Social listening** | Reddit, HackerNews, App Store / Play Store reviews |
| **Digital footprint** | Competitor URL analysis |
| **Batch** | Analyse multiple documents in one session — run all in sequence |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, SSE streaming) |
| AI | Anthropic Claude Opus 4.6 |
| Database | Prisma + SQLite (libsql adapter, Turso-compatible) |
| Auth | NextAuth.js — credentials + JWT, org/user scoping |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Deployment | Docker (single-service, SQLite volume) / Electron (desktop, no dependencies) |
| Tests | Vitest — schema validation, grounding, PII, CSRF |

---

## Development commands

```bash
npm run dev              # Dev server at :3000
npm run test             # Run Vitest unit tests
npm run build            # Production build
npx prisma db push       # Apply schema changes
npx prisma studio        # Browse database in browser

# Desktop
npm run electron:dev     # Dev mode (Next.js + Electron)
npm run dist:mac         # Build macOS .dmg
npm run dist:win         # Build Windows .exe installer
npm run dist:linux       # Build Linux .AppImage
```

Set `SKIP_AUTH=true` in `.env.local` for Electron builds.

---

## Building releases

Desktop installers are built with [electron-builder](https://www.electron.build) and can be published to GitHub Releases:

```bash
npm run dist             # Build for all platforms
```

The resulting files in `dist/` can be attached to a GitHub Release. Users download and install them like any normal desktop app — no terminal or developer tools required.

---

## Licence

Private — all rights reserved.
