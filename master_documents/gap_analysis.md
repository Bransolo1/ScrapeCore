# ScrapeCore — Master Document Gap Analysis

**Date:** March 2026
**Purpose:** Review what each master document specifies versus what is currently built. Identifies concrete gaps for the next development phase.

---

## Summary Scorecard

| Master Document | Coverage | Status |
|---|---|---|
| 1 — Company Reverse Engineering Engine | ~60% | Partial |
| 2 — Behavioural Science Intelligence Engine | ~80% | Strong |
| 3 — Product and UX Architect | ~55% | Partial |
| 4 — Technical Architecture and Responsible AI | ~35% | Early |
| 5 — Evidence, Evaluation, and Red Team Reviewer | ~50% | Partial |
| 6 — Claude Prompt Systems Designer | ~60% | Partial |

---

## Master Document 1 — Company Reverse Engineering Engine

### What Is Built

- `/compare` page with side-by-side COM-B diff of two analyses
- Perplexity Sonar research source (general market intelligence)
- G2 and Capterra review scrapers
- Competitor insight visible through analysis of competitor review text

### Gaps

| Gap | Impact | Suggested Build |
|---|---|---|
| No dedicated **competitor research workflow** — the structured output format (`<observed_signals>`, `<inferences>`, `<unknowns>`, `<strategic_implications>`) is not surfaced in the UI | High | Add a "Competitor Profile" analysis mode that generates the structured company model alongside COM-B analysis |
| No **automated competitor monitoring** — users cannot set up recurring scans on a competitor's reviews, social, or web presence | Medium | Scheduled Perplexity + G2 jobs with change-detection alerts |
| Compare page only shows COM-B diff; it does not expose **strategic opportunity gaps** derived from competitor weaknesses | Medium | Add an AI-generated "competitive gap summary" section below the diff |
| No **team/hiring signal analysis** — master doc explicitly calls out team backgrounds as roadmap clues | Low | Perplexity query mode for LinkedIn/Crunchbase signals |

---

## Master Document 2 — Behavioural Science Intelligence Engine

### What Is Built

- Full COM-B mapping (capability/opportunity/motivation with physical/psychological/social/reflective/automatic sub-dimensions)
- Barriers with severity + COM-B type + evidence
- Motivators with strength + COM-B type + evidence
- Intervention opportunities with BCW category, BCT specifics, target, rationale, and implementation guidance
- Key behaviours with frequency + importance
- Contradictions with evidence A/B and interpretation
- Subgroup insights and persona cards
- Confidence assessment with rationale, limitations, and sample size note
- Recommended next research

### Gaps

| Gap | Impact | Suggested Build |
|---|---|---|
| **Emotional valence / sentiment** is not a distinct output field. The master doc specifies `sentiment or emotional valence` as a required mapping dimension | Medium | Add a `sentiment_signals` field to the analysis schema — overall valence and per-subgroup emotional tone |
| **Facilitators** are listed as a distinct concept in the master doc (`facilitators` ≠ `motivators`). Currently merged into motivators | Medium | Add a `facilitators` array to the schema — environmental/contextual conditions that make behaviour easier without being active motivators |
| **Behavioural context** is specified as a required output but is missing — where, when, and with whom behaviours occur | Medium | Add a `behavioural_context` section (setting, timing, social context) to the analysis prompt and schema |
| Output is not always usable in **high trust settings** (healthcare, public health) without a clearer uncertainty communication layer | High | Add a `suitable_for_high_trust_use` flag and required human review note when confidence is low or input sample is small |

---

## Master Document 3 — Product and UX Architect

### What Is Built

- Core analysis workspace with split-pane input/output
- Export (JSON + PDF)
- Persona cards from subgroup insights
- Analytics dashboard
- Dark mode with system preference detection
- Navigation: Analyse / Dashboard / Compare
- Analysis history with search, tags, projects

### Gaps

| Gap | Impact | Suggested Build |
|---|---|---|
| **Guided analysis wizard** — master doc explicitly states "Favour guided analysis workflows over blank prompt boxes." Currently the UI is a blank text box | High | Step-by-step wizard: (1) Define context, (2) Add sources, (3) Set research question, (4) Review and analyse |
| **Analyst annotation and correction** — no way for users to edit, flag, or dispute individual findings (barrier, motivator, intervention) | High | Inline annotation UI on each card; ability to mark findings as "confirmed", "disputed", or "not applicable" |
| **Trust layers** — no confidence threshold gating. Low-confidence analyses are displayed identically to high-confidence ones | High | Visual confidence banner; option to suppress sections below a threshold; require acknowledgement for low-confidence outputs |
| **Evidence inspection** — users cannot click through from a finding to the specific source text that generated it | Medium | Highlight source text in original input when a finding card is clicked |
| **Multi-user collaboration** — no team workspaces, no sharing, no role-based permissions | Medium | Auth layer + team/org model + shareable analysis links |
| **Integration with existing tools** — no Slack, Notion, Airtable, or CRM export | Low | Webhook/Zapier integration; Notion page export; CSV export for spreadsheet users |
| **Non-expert mode** — master doc says "Design for both expert and non expert users." Currently assumes familiarity with COM-B | Low | Plain-language mode that replaces COM-B terminology with plain summaries |

---

## Master Document 4 — Technical Architecture and Responsible AI Lead

### What Is Built

- SQLite persistence via Prisma
- SSE streaming analysis
- Basic API route structure
- Electron standalone deployment
- Analysis stored with title, tags, project

### Gaps

| Gap | Impact | Suggested Build |
|---|---|---|
| **No authentication or multi-tenancy** — single-user local app only. No user accounts, no org separation | Critical for SaaS | NextAuth.js + org/workspace model; row-level security in DB |
| **No PII detection or redaction** — users may paste text containing names, emails, or sensitive identifiers | High (especially healthcare/regulated use) | Pre-analysis PII scan (Presidio or similar); redaction toggle; PII warning banner |
| **No audit logging** — no record of who ran what analysis, when, on what data | High for enterprise | Append-only audit log table; exportable audit trail |
| **No human review workflow** — master doc specifies a review/approve/reject step before outputs are used | High | "Under review" status on analyses; reviewer sign-off field; lock analysis after approval |
| **No evaluation or monitoring** — no way to track output quality over time, catch regressions, or compare prompt versions | Medium | Analysis quality scoring; prompt version tracking; eval dataset with expected outputs |
| **No retrieval or memory** — each analysis starts from scratch. No ability to build on prior analyses or project context | Medium | Project-level context injection; RAG over past analyses in same project |
| **No fallback paths for low model confidence** — master doc specifies fallback logic when confidence is low | Medium | Automatic re-prompt with clarification request when confidence = low; flag for manual review |
| **Private deployment** — master doc notes some clients may need private/on-prem deployment | Low (future) | Docker compose packaging; environment variable-driven model endpoint |

---

## Master Document 5 — Evidence, Evaluation, and Red Team Reviewer

### What Is Built

- Confidence assessment with overall rating, rationale, limitations
- Contradictions section
- Recommended next research

### Gaps

| Gap | Impact | Suggested Build |
|---|---|---|
| **No analyst correction loop** — once an analysis is complete, findings cannot be disputed or corrected within the app | High | Annotation/correction UI (see Master Doc 3 gap) |
| **No systematic evaluation rubric tracking** — `evaluation_rubric.md` exists as a file but is not connected to any in-app evaluation | Medium | Run rubric checks automatically on each analysis output; show rubric score alongside confidence |
| **Hallucination risk not surfaced** — when the model makes claims unsupported by source text, there is no flagging mechanism | High | Add a `grounding_check` step that verifies each barrier/motivator can be traced to a quote in the input |
| **No measurement validity check** — if the input text is too homogeneous or from a single biased source, this is not flagged | Medium | Input diversity check (single-source warning, low-variance text warning) |
| **Black box reasoning in high-trust contexts** — intervention recommendations do not show the full reasoning chain from evidence to recommendation | Medium | "Show reasoning" expandable per intervention; evidence-to-recommendation trace |

---

## Master Document 6 — Claude Prompt Systems Designer

### What Is Built

- Structured analysis prompt with XML output schema
- Modular prompts (analysis, stats, sources are separate API routes)
- SSE streaming with graceful error handling

### Gaps

| Gap | Impact | Suggested Build |
|---|---|---|
| **No prompt versioning** — the analysis prompt has no version number; changes are silent | Medium | Prompt version field stored alongside each analysis; diff viewer for prompt versions |
| **No A/B evaluation** — no way to compare outputs from two prompt versions on the same input | Medium | Side-by-side prompt eval mode; metrics on output quality per version |
| **No eval log** — `prompt_eval_log.md` is referenced in the README as a working document but nothing populates it | Medium | Auto-append eval results to a project-level log |
| **No success/failure criteria stored per analysis** — the master doc specifies explicit success and failure criteria; none are captured in the schema | Low | Add `eval_passed` / `eval_notes` fields to the analysis record |
| **Context engineering underutilised** — master doc notes "state when the right answer is context engineering, not prompt engineering." No project-level context is injected into analysis prompts | Medium | Project description field that is prepended to the analysis system prompt |

---

## Priority Recommendations for Next Sprint

Based on severity, business impact, and build effort:

### P0 — Critical for Trust and Safety
1. **PII detection and redaction** (Technical Architecture + Red Team)
2. **Confidence-threshold output gating with human review flag** (Product UX + Red Team)
3. **Evidence grounding check** (Red Team)

### P1 — Core Product Completeness
4. **Analyst annotation and correction of findings** (Product UX + Red Team)
5. **Guided analysis wizard** replacing blank text box (Product UX)
6. **Emotional valence and facilitators** added to analysis schema (Behavioural Science)
7. **Behavioural context** section in analysis output (Behavioural Science)

### P2 — Scale and Enterprise
8. **Authentication and multi-tenancy** (Technical Architecture)
9. **Audit logging** (Technical Architecture)
10. **Human review workflow** with sign-off (Technical Architecture + Product UX)

### P3 — Competitive and Research Features
11. **Competitor profile analysis mode** (Company Reverse Engineering)
12. **Evidence-to-finding trace / "Show reasoning"** (Red Team)
13. **Project-level context injection into prompts** (Prompt Systems)
14. **Prompt versioning and eval log** (Prompt Systems)
