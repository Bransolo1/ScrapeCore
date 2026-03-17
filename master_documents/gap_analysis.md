# ScrapeCore — Master Document Gap Analysis

**Updated:** March 2026
**Purpose:** Live tracking of what each master document specifies versus what is currently built. Updated after Sprint 5 + evidence click-through implementation.

---

## Summary Scorecard

| Master Document | Coverage | Status |
|---|---|---|
| 1 — Company Reverse Engineering Engine | ~80% | Strong |
| 2 — Behavioural Science Intelligence Engine | ~95% | Complete |
| 3 — Product and UX Architect | ~90% | Strong |
| 4 — Technical Architecture and Responsible AI | ~90% | Strong |
| 5 — Evidence, Evaluation, and Red Team Reviewer | ~85% | Strong |
| 6 — Claude Prompt Systems Designer | ~85% | Strong |
| **Overall** | **~88%** | **Strong** |

---

## Master Document 1 — Company Reverse Engineering Engine

### Built

- `/compare` page with side-by-side COM-B diff and AI-generated competitive gap summary section
- Perplexity Sonar research source (general market intelligence)
- G2 and Capterra review scrapers
- Dedicated competitor analysis mode — `dataType: "competitor"` in types; `COMPETITOR_PROMPT_SUFFIX` in prompts; `CompetitorProfilePanel` renders structured `company_model` output (`observed_signals`, `inferences`, `unknowns`, `strategic_implications`)
- Automated competitor monitoring — `CompetitorMonitor` Prisma model with schedule, `active` flag, `lastRunAt`, `nextRunAt`; `/monitoring` page UI

### Remaining Gaps

| Gap | Impact | Notes |
|---|---|---|
| **Team/hiring signal analysis** | Low | Perplexity query mode for LinkedIn/Crunchbase signals. Explicitly marked low priority — no business urgency yet |

---

## Master Document 2 — Behavioural Science Intelligence Engine

### Built

- Full COM-B mapping with all sub-dimensions
- Barriers (severity + COM-B type + evidence + source_text + emotional valence)
- Motivators (strength + COM-B type + evidence + source_text + emotional valence)
- `facilitators` array — distinct from motivators; `FacilitatorsSection` component renders them
- `behavioural_context` section — setting, triggers, temporal_pattern, social_context, routine_vs_deliberate; `BehaviouralContextPanel` renders it
- Intervention opportunities with BCW category, BCT specifics, target, rationale, implementation guidance
- Key behaviours with frequency + importance + emotional valence
- Contradictions with evidence A/B and interpretation
- Subgroup insights and persona cards
- Confidence assessment with `suitable_for_high_trust_use` boolean + `high_trust_notes`; `ConfidencePanel` displays trust suitability banner
- Recommended next research

### Remaining Gaps

None at P0/P1. Full spec coverage achieved.

---

## Master Document 3 — Product and UX Architect

### Built

- Core analysis workspace with split-pane input/output
- **Guided analysis wizard** — 4-step `GuidedWizard` component (Research Q → Data Type → Add Data → Review); integrated in `app/page.tsx`
- **Analyst annotation and correction** — `AnalysisCorrection` Prisma model; `CorrectionControls` UI for confirmed / disputed / removed per finding
- **Trust layers** — `LowConfidenceGate` blocks display when confidence = low or < 5 text units; `ConfidencePanel` shows high-trust suitability banner
- **Evidence click-through** — `SourceInspector` modal with exact + fuzzy match; all evidence chips (`EvidenceChip`), source_text quotes (barriers, motivators, key behaviours), and intervention `source_evidence` quotes are now clickable
- **Multi-user collaboration** — NextAuth.js auth; User + Organisation Prisma models; `ShareButton` creates read-only share tokens; `/share/[token]` renders shared analysis
- Export (JSON + PDF)
- Persona cards from subgroup insights
- Analytics dashboard
- Dark mode with system preference detection
- Analysis history with search, tags, projects
- **Non-expert plain language mode** — `plainLanguage.ts` dictionary; `PlainModeToggle`; COM-B terms replaced with plain English across ComBSection, BarriersMotivators, InterventionsSection

### Remaining Gaps

| Gap | Impact | Notes |
|---|---|---|
| **Integration with Slack / Notion / Airtable / CRM** | Low | JSON + PDF export covers most immediate needs. Webhook/Zapier integration deferred |
| **Team workspace UI for real-time collaboration** | Low | Read-only share links built. Live co-editing / team workspace panel not implemented |

---

## Master Document 4 — Technical Architecture and Responsible AI Lead

### Built

- SQLite persistence via Prisma
- SSE streaming analysis
- **Authentication and multi-tenancy** — NextAuth.js CredentialsProvider; User model with role + organisationId; Organisation model; all analyses scoped to userId/organisationId
- **PII detection and redaction** — `lib/pii.ts` detects 9 PII types (email, phone, credit card, SSN, NI number, NHS number, IP, DOB, passport); `scanForPII()` + `redactPII()`; `PIIWarningModal` gates analysis with three options (continue / redact / cancel)
- **Audit logging** — `AuditLog` Prisma model; `logAudit()` called on analysis create, view, export, review update, PII events
- **Human review workflow** — Analysis model has `reviewStatus` (pending/approved/disputed/archived), `reviewNotes`, `reviewedAt`, `reviewedBy`; `ReviewPanel` renders sign-off UI
- **Evaluation and monitoring** — rubric scoring (`lib/rubric.ts`), grounding checks (`lib/grounding.ts`), validity scoring (`lib/validity.ts`), eval log (`lib/evalLog.ts`); Dashboard Quality Trends section shows rubric grades and prompt version breakdown
- **Project-level context injection** — `projectContext` param sent from frontend; `buildProjectMemoryBlock()` injects prior analysis context into system prompt
- **Fallback re-prompt for low confidence** — `fetchClarificationNote()` in `app/api/analyze/route.ts`; called when confidence = low; result stored in `clarification_note`; displayed in `ConfidencePanel`

### Remaining Gaps

| Gap | Impact | Notes |
|---|---|---|
| **Docker / private deployment** | Low | No Dockerfile or docker-compose.yml. Some clients may need on-prem. Deferred — no current request |

---

## Master Document 5 — Evidence, Evaluation, and Red Team Reviewer

### Built

- **Analyst correction loop** — `AnalysisCorrection` Prisma model + `CorrectionControls` UI for marking findings confirmed/disputed/removed; corrections persisted via API
- **Systematic rubric evaluation** — `scoreRubric()` runs at analysis save; rubric scores and grades stored in `rubricJson`; `RubricPanel` displays grades in results; Dashboard shows grade distribution
- **Hallucination / grounding check** — `groundAnalysis()` traces each finding to input text; `GroundingBadge` displayed on all finding cards; `GroundingPanel` shows report-level grounding score
- **Measurement validity check** — input diversity check (`lib/diversity.ts`) warns on single-source or low-variance input; rubric includes diversity dimension
- **Evidence-to-finding trace** — `source_text` and `evidence` arrays on all findings; all evidence quotes are now clickable to locate passage in original input via `SourceInspector`; "Show reasoning" expandable panel on each intervention card shows full evidence chain

### Remaining Gaps

| Gap | Impact | Notes |
|---|---|---|
| **Side-by-side prompt A/B comparison UI** | Medium | Infrastructure is present (rubric/grounding/validity scores per analysis); no dedicated eval mode where two prompt versions run on same input simultaneously |

---

## Master Document 6 — Claude Prompt Systems Designer

### Built

- **Prompt versioning** — `PROMPT_VERSION = "v2.2"` constant in `lib/prompts.ts`; `promptVersion` stored on Analysis model; Dashboard shows version breakdown chart
- **Eval log** — `lib/evalLog.ts`; `appendEvalLog()` called on each analysis; eval data written to analysis metadata
- **Success/failure criteria per analysis** — `evalPassed` (boolean) and `evalNotes` (string) fields on Analysis model; rubric grade determines `evalPassed`
- **Context engineering** — `projectContext` field injected into system prompts; `buildProjectMemoryBlock()` prepends prior findings from same project
- **A/B evaluation comparison** — `/eval` page allows selecting two analyses and comparing rubric grade, grounding score, validity, and confidence side-by-side

### Remaining Gaps

| Gap | Impact | Notes |
|---|---|---|
| **Automated A/B prompt eval mode** | Medium | Can manually compare any two analyses on the eval page. Running both prompt versions against the same input automatically (no re-paste required) not yet implemented |
| **Prompt diff viewer** | Low | Version numbers stored per analysis; no visual diff of what changed between prompt versions |

---

## Open Items Summary

All P0, P1, P2, and most P3 items from the original gap analysis are now built. The remaining open items are all P3 or below:

| Item | Priority | Effort | Blocker? |
|---|---|---|---|
| Docker / private deployment | P3 | Low | No — build and deploy work locally |
| Slack / Notion / Airtable export | P3 | Medium | No — JSON/PDF covers analyst needs |
| Team workspace real-time collaboration | P3 | High | No — share links cover the core use case |
| LinkedIn/Crunchbase hiring signal mode | P3 | Low | No — one-off research mode |
| Automated side-by-side A/B prompt eval | P3 | Medium | No — manual comparison works via /eval page |
| Prompt version diff viewer | P4 | Low | No |
