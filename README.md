# ScrapeCore — Behavioural Market Intelligence

ScrapeCore is a desktop-first AI research platform that converts raw qualitative text — interviews, reviews, social posts, survey responses — into structured behavioural insight using the COM-B framework (Capability, Opportunity, Motivation → Behaviour), the Behaviour Change Wheel, and BCT taxonomy.

Built for startup founders, product managers, behavioural scientists, insight leads, and UX researchers who need actionable intelligence fast — not a chatbot, not a generic summary, but a diagnosis.

---

## What It Does

| Feature | Description |
|---|---|
| **COM-B Analysis** | Maps free text into Capability, Opportunity, and Motivation signals with physical/psychological/social sub-dimensions |
| **Barriers & Motivators** | Identifies and ranks what blocks and enables target behaviours, with severity/strength scores |
| **Intervention Opportunities** | Recommends BCW-aligned interventions ranked by priority, mapped to specific BCT techniques with implementation guidance |
| **Key Behaviours** | Extracts target behaviours with frequency and importance scores |
| **Contradictions & Tensions** | Surfaces where evidence conflicts and provides interpretation |
| **Subgroup Insights & Personas** | Detects different user segments and generates persona cards |
| **Competitor Comparison** | Side-by-side COM-B diff of two analyses to spot competitive gaps |
| **The Eyes** | Perplexity Sonar for live market research + Twitter/X listening; Firecrawl for JS-rendered sites |
| **B2B Review Mining** | G2 and Capterra scrapers with JSON-LD extraction + HTML fallbacks |
| **Analytics Dashboard** | COM-B frequency trends, confidence distribution, source breakdown, token usage |
| **History & Search** | Persistent analysis store with full-text search, tags, and project labels |
| **Export** | JSON + PDF export of any analysis |
| **Dark Mode** | Full system-preference-aware dark mode with toggle |
| **Desktop App** | Electron wrapper with NSIS Windows installer, macOS DMG, Linux AppImage |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router, Server Components, SSE streaming) |
| AI | Anthropic Claude Opus 4.6 via streaming API |
| Desktop | Electron 33.4 + electron-builder |
| Database | Prisma 7.5 + LibSQL/SQLite |
| Styling | Tailwind CSS 3.4 with dark mode class strategy |
| Charts | Recharts 2.x |
| Research | Perplexity Sonar API, Firecrawl v1 API |

---

## Quick Start (Developer)

### Prerequisites

- Node.js 18+ and npm
- An Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

### Setup

```bash
git clone <repo-url>
cd ScrapeCore
npm install
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — "The Eyes" research features
PERPLEXITY_API_KEY=pplx-...   # Perplexity Sonar — live research + Twitter/X
FIRECRAWL_API_KEY=fc-...      # Firecrawl — JS-rendered sites, G2, Capterra SPAs
```

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server at localhost:3000 |
| `npm run build` | Production Next.js build |
| `npm run electron:dev` | Electron + Next.js dev mode |
| `npm run build:desktop` | Full desktop build (Next + copy standalone) |
| `npm run dist:win` | Build Windows NSIS installer (.exe) |
| `npm run dist:mac` | Build macOS DMG |
| `npm run dist:linux` | Build Linux AppImage |
| `npm run dist` | Build all platforms |

---

## Architecture

```
app/
├── page.tsx                  # Main analysis workspace (split-pane)
├── dashboard/page.tsx        # Analytics dashboard
├── compare/page.tsx          # Competitor COM-B comparison
├── api/
│   ├── analyse/route.ts      # SSE streaming analysis (Claude Opus)
│   ├── scrape/route.ts       # Basic URL scraper (cheerio)
│   ├── analyses/             # CRUD + search + stats
│   ├── sources/
│   │   ├── firecrawl/        # Firecrawl JS-render scraper
│   │   ├── perplexity/       # Perplexity Sonar (research + Twitter/X)
│   │   ├── g2/               # G2 review scraper
│   │   └── capterra/         # Capterra review scraper
components/
├── AnalysisResults.tsx       # Full results renderer
├── ComBChart.tsx             # Recharts COM-B bar chart
├── ComBSection.tsx           # COM-B detail columns
├── BarriersMotivators.tsx    # Barrier/motivator cards
├── InterventionsSection.tsx  # Intervention priority cards
├── KeyBehaviours.tsx         # Key behaviour cards
├── ContradictionsSection.tsx # Contradiction explorer
├── ConfidencePanel.tsx       # Evidence confidence + next steps
├── PersonaCards.tsx          # Segment persona cards
├── SocialListener.tsx        # Multi-source data collector
├── AnalysisHistory.tsx       # Searchable history panel
├── Header.tsx                # Nav + dark mode toggle
lib/
├── types.ts                  # Full TypeScript schema for analysis output
├── theme.tsx                 # ThemeProvider context
prisma/
└── schema.prisma             # Analysis model with project/tags fields
electron/
├── main.js                   # Electron main process + Next.js spawner
├── preload.js                # contextBridge IPC
└── setup.html                # First-run API key wizard
master_documents/             # Six specialist Claude knowledge docs
task_prompts/                 # Ten research task prompts
```

---

## Analysis Output Schema

Every analysis produces a structured JSON object conforming to:

```typescript
{
  summary: string
  data_type_detected: string
  text_units_analysed: number
  key_behaviours: KeyBehaviour[]       // behaviour, frequency, importance, evidence
  com_b_mapping: ComBMapping           // capability/opportunity/motivation sub-dimensions
  barriers: Barrier[]                  // barrier, com_b_type, severity, evidence
  motivators: Motivator[]              // motivator, com_b_type, strength, evidence
  intervention_opportunities: Intervention[] // BCW category, target, BCT specifics, priority
  contradictions: Contradiction[]      // description, evidence_a, evidence_b, interpretation
  subgroup_insights: SubgroupInsight[] // subgroup, key_insight, com_b_profile
  confidence: ConfidenceAssessment     // overall, rationale, limitations, sample_size_note
  recommended_next_research: string[]
}
```

---

## Claude Project Documents

The `master_documents/` folder contains six specialist knowledge files designed for use in a Claude Project for long-horizon product strategy and behavioural science research:

| Document | Role |
|---|---|
| `company_reverse_engineering_engine.md` | Forensic competitor and market analyst |
| `behavioural_science_intelligence_engine.md` | COM-B / BCW behavioural science core |
| `product_and_ux_architect.md` | Founding PM and UX strategist |
| `technical_architecture_and_responsible_ai_lead.md` | Principal architect (security, audit, scale) |
| `evidence_evaluation_and_red_team_reviewer.md` | Internal critic and red team reviewer |
| `claude_prompt_systems_designer.md` | Modular prompt systems specialist |

See `project_instruction.md` for Claude Project setup and `task_prompts/` for ten ready-to-use research task prompts.

---

## Known Gaps vs Full Vision

The following capabilities are defined in the master documents but not yet implemented. They represent the next-phase roadmap:

| Gap | Master Doc | Priority |
|---|---|---|
| User authentication & multi-tenancy | Technical Architecture | High |
| Analyst annotation/correction of AI findings | Product UX + Red Team | High |
| PII detection and redaction layer | Technical Architecture | High |
| Guided step-by-step analysis wizard | Product UX | Medium |
| Audit logging for governance/enterprise | Technical Architecture | Medium |
| Emotional valence + sentiment overlay | Behavioural Science | Medium |
| Facilitators as distinct concept (vs motivators) | Behavioural Science | Medium |
| Confidence-threshold output gating | Red Team | Medium |
| Prompt versioning and eval framework | Prompt Systems | Medium |
| Slack / Notion / Airtable export integrations | Product UX | Low |
| Automated competitor monitoring & alerts | Company Reverse Engineering | Low |

---

## Desktop Installer

Pre-built installers are attached to each GitHub Release (built via GitHub Actions on `v*` tags):

- **Windows**: `ScrapeCore-Setup-{version}.exe` (NSIS installer)
- **macOS**: `ScrapeCore-{version}.dmg`
- **Linux**: `ScrapeCore-{version}.AppImage`

On first launch, a setup wizard will prompt for your Anthropic API key.

See [INSTALL.md](./INSTALL.md) for the full non-technical installation guide.

---

## Licence

Private — all rights reserved.
