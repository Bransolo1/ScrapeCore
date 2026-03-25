# ScrapeCore UX Overhaul Plan

## Mission (to be communicated through every screen)
**ScrapeCore scrapes data from the web, then applies behavioural science to help you understand it.**

Two-phase flow: **Collect** (scrape/gather) → **Analyse** (COM-B behavioural science)

Primary user: UX/CX researchers who know qualitative research but may be new to COM-B.

---

## Problem Statement
The platform feels disjointed. There's no clear user flow, the mission isn't obvious, and the 6 nav items (Analyse, Dashboard, Compare, Eval Lab, Monitor, Audit Log) feel like separate tools rather than one coherent platform. A new user landing on the page doesn't understand what ScrapeCore does or why they should care.

---

## Phase 1: Mission-First Landing & Navigation Hierarchy

### 1A. Replace the "jump straight to analysis" landing with a mission-clear hero section
**File:** `app/page.tsx` (lines 409–435 area, above the grid)

Currently users land directly into a two-column analysis interface with no context. Add a compact hero banner above the workspace that:
- States the mission in one line: **"Scrape the web. Apply behavioural science. Understand your users."**
- Shows the two-phase flow visually: `Collect → Analyse → Validate → Act`
- Has a single primary CTA: "Start collecting data" (scrolls/focuses the input panel)
- Dismissible after first use (localStorage flag), collapses to a single-line tagline on return visits
- Replaces the current vague "Start with guided setup" button with something that explains *what* the guided setup does

### 1B. Restructure the navigation into a clear hierarchy
**File:** `components/Header.tsx`

Current nav is flat: Analyse, Dashboard, Compare, Eval Lab, Monitor, Audit Log. This gives equal weight to 6 items, none of which explain the workflow.

Restructure into grouped nav that mirrors the mission flow:

```
[Collect & Analyse]  [Intelligence]  [Quality]
     (home)          Dashboard        Eval Lab
                     Compare          Audit Log
                     Monitor
```

Implementation:
- Keep "Collect & Analyse" as the home/primary nav item (current "/" page)
- Group Dashboard, Compare, Monitor under a "Intelligence" dropdown or visual group
- Group Eval Lab, Audit Log under a "Quality" dropdown
- Add subtle dividers or group labels in the nav bar
- This immediately communicates: "the core activity is collecting & analysing; everything else supports that"

### 1C. Rename confusing nav items
- "Analyse" → "Collect & Analyse" (makes the scraping mission visible)
- "Eval Lab" → "Quality Lab" (clearer purpose)
- "Monitor" → "Track Competitors" (action-oriented)
- Update header subtitle from "Behavioural Market Intelligence" to "Scrape. Analyse. Understand behaviour."

---

## Phase 2: Unified "Collect → Analyse" Flow on the Main Page

### 2A. Restructure mode tabs to emphasise the two-phase nature
**File:** `app/page.tsx` (MODE_TABS and MODE_GROUPS around lines 35–97)

Current groups are "Your data / Collect / Advanced". This is confusing because:
- "Your data" (paste) is separate from "Collect" even though both are data input
- "Advanced" (batch) doesn't explain when you'd use it

Restructure to:
```
COLLECT DATA                          YOUR DATA
[Scrape URLs] [Social] [Footprint]    [Paste text] [Upload file] [Batch]
```

The primary group should be "Collect data" (the scraping tools), with "Your data" as secondary. This reinforces the mission: **ScrapeCore is for scraping first, pasting second.**

### 2B. Add a visual pipeline indicator above the input panel
**File:** `app/page.tsx`

Add a small horizontal stepper showing where the user is in the workflow:
```
① Collect  →  ② Preview  →  ③ Analyse  →  ④ Validate
   [active]
```
- Lights up as the user progresses
- "Collect" is active when in any input mode
- "Preview" activates when TextPreviewModal opens
- "Analyse" activates during streaming
- "Validate" activates when results are shown
- Gives users confidence they're on a clear path

### 2C. Improve the empty state to explain the flow
**File:** `components/AnalysisResults.tsx` (idle state)

Current empty state shows "Ready to analyse" with abstract COM-B boxes. Replace with:
1. A visual showing the two-phase flow: "Scrape data from the web → Get behavioural insights"
2. Quick-start suggestions: "Try scraping a competitor's app store reviews" / "Search Reddit for user complaints about [topic]"
3. Example output preview — show a sample COM-B chart and barrier list so users know what they'll get

---

## Phase 3: Connect the Disconnected Pages

### 3A. Add contextual "next step" prompts after analysis completes
**File:** `components/AnalysisResults.tsx` (footer section, lines 535+)

Current footer has links but no explanation of *why* you'd go there. Add contextual prompts:
- "Want to track this competitor over time?" → Monitor page
- "Have another competitor to compare against?" → Compare page
- "Check the quality of this analysis" → Eval Lab
- Each with a 1-line description explaining how it connects to the current analysis

### 3B. Add breadcrumb context to secondary pages
**Files:** `app/dashboard/page.tsx`, `app/compare/page.tsx`, `app/eval/page.tsx`, `app/monitoring/page.tsx`, `app/audit/page.tsx`

Each secondary page should show a subtle breadcrumb or "how you got here" context:
- Dashboard: "Patterns across all your analyses → [Back to Collect & Analyse]"
- Compare: "Compare two analyses side by side → [Back to Collect & Analyse]"
- This ties every page back to the core flow

### 3C. Add "How this fits" tooltip to each nav item
**File:** `components/Header.tsx`

On hover, each nav item should show a brief tooltip explaining how it connects to the mission:
- "Collect & Analyse" → "Scrape web data and run COM-B behavioural analysis"
- "Dashboard" → "See patterns across all your analyses"
- "Compare" → "Diff two analyses to spot competitive gaps"
- "Track Competitors" → "Set up automated competitor scraping on a schedule"
- "Quality Lab" → "Score and validate your analysis quality"
- "Audit Log" → "Full trail of who ran what and when"

---

## Phase 4: Streamline the Results Experience

### 4A. Add a results summary card at the top
**File:** `components/AnalysisResults.tsx`

Before diving into 11+ sections, show a high-level "What we found" card:
```
┌─────────────────────────────────────────────┐
│  3 key barriers  ·  5 motivators  ·  4 BCW  │
│  interventions identified                    │
│                                              │
│  Confidence: HIGH  ·  Data type: Reviews     │
│  Sources: 12 app store reviews (2,400 words) │
└─────────────────────────────────────────────┘
```
This gives researchers an instant "was this worth running?" signal before they invest time reading each section.

### 4B. Collapse sections by default with expand-on-click
**File:** `components/AnalysisResults.tsx` and section sub-components

Currently all sections are open, creating a very long scroll. Instead:
- **Always open:** Summary card (new), COM-B chart, Key Behaviours
- **Collapsed by default:** Behavioural Context, Facilitators, Contradictions, Subgroup Insights
- **Always open:** Barriers, Motivators, Interventions (the actionable outputs)
- Each collapsed section shows a count badge: "Behavioural Context (4 signals)" so users know if it's worth expanding

### 4C. Add section explanations for COM-B newcomers
**File:** Section components (ComBSection, BarriersMotivators, InterventionsSection, etc.)

Each section should have a small (?) icon that reveals a one-line explanation:
- COM-B: "Maps behaviours to Capability, Opportunity, and Motivation — the three things that must be present for any behaviour to occur"
- Barriers: "Things preventing your target audience from performing the desired behaviour"
- Interventions: "Evidence-based strategies from the Behaviour Change Wheel to address identified barriers"

This educates UX/CX researchers who are new to COM-B without cluttering the interface for experts. Could tie into the existing "plain mode" toggle.

---

## Phase 5: Source Provenance & Trust

### 5A. Show which sources contributed to each finding
**File:** `components/AnalysisResults.tsx` (barriers, motivators, key behaviours sections)

When data comes from scraped sources (not pasted text), each finding should show a small tag indicating its provenance:
- "From: Trustpilot reviews (3 mentions)" or "From: Reddit r/UXDesign (2 threads)"
- This makes the scraping → analysis connection tangible and builds trust

### 5B. Add a "Sources used" panel to the results header
**File:** `components/AnalysisResults.tsx`

After analysis completes, show a collapsible "Sources" section listing:
- All sources that were analysed
- Word count per source
- Source type (scrape, social, reviews, etc.)
- This shows the user "what went in" alongside "what came out"

---

## Phase 6: Polish & Consistency

### 6A. Consistent loading/skeleton states
**Files:** `app/dashboard/page.tsx`, `app/compare/page.tsx`, `components/AnalysisHistory.tsx`

Add skeleton loaders (gray animated placeholders) instead of spinners for:
- History panel loading
- Dashboard data loading
- Compare page analysis loading

### 6B. Error pages
**File:** Create `app/not-found.tsx`

Add a branded 404 page that:
- Shows the ScrapeCore logo
- Says "Page not found"
- Links back to "Collect & Analyse" (home)
- Matches the platform design language

### 6C. Footer consistency
**Files:** All page files with footers

Standardise the footer across all pages to always show:
- Mission reminder: "Scrape. Analyse. Understand behaviour."
- "AI-assisted — expert review required"
- Consistent styling

---

## Implementation Order (Priority)

| Order | Phase | Impact | Effort |
|-------|-------|--------|--------|
| 1     | 1A — Hero banner with mission statement | Critical — first thing users see | Small |
| 2     | 1C — Rename nav items | Critical — instant clarity | Tiny |
| 3     | 2A — Restructure input tabs (Collect first) | High — reinforces mission | Small |
| 4     | 2C — Better empty state | High — guides new users | Small |
| 5     | 2B — Pipeline stepper | High — shows the flow | Medium |
| 6     | 4A — Results summary card | High — reduces overwhelm | Small |
| 7     | 3A — Contextual next-step prompts | Medium — connects pages | Small |
| 8     | 1B — Nav grouping | Medium — reduces cognitive load | Medium |
| 9     | 4B — Collapsible sections | Medium — reduces scroll | Medium |
| 10    | 4C — Section explanations for newcomers | Medium — onboards COM-B | Small |
| 11    | 5A/5B — Source provenance tags | Medium — builds trust | Medium |
| 12    | 3B — Breadcrumbs on secondary pages | Low — orientation | Small |
| 13    | 6A — Skeleton loaders | Low — polish | Small |
| 14    | 6B — 404 page | Low — completeness | Tiny |
| 15    | 6C — Footer consistency | Low — polish | Tiny |
