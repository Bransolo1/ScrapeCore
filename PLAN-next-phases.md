# ScrapeCore — Next Phases Implementation Plan

> Generated from full codebase audit. Prioritised by impact.

---

## Phase A — Performance & Reliability

### A1. Parallelise SocialListener fetches

**Problem:** `SocialListener.handleFetch()` runs 9 source fetches sequentially — each `await fetch(...)` blocks the next. Selecting Reddit + Trustpilot + App Store + G2 + Capterra + Twitter + Perplexity means 60s+ total wait.

**Fix:** Restructure `handleFetch()` to use `Promise.allSettled()`, matching the pattern already used in `CompanyFootprint.run()`.

**Files:**
- `components/SocialListener.tsx` — rewrite `handleFetch()`:
  - Build an array of `Promise<Source[]>` runners, one per active source
  - Fire all with `Promise.allSettled(runners)`
  - Merge results + errors after all settle
  - Add per-source progress state (idle → running → done/error) like CompanyFootprint's `TaskState`
  - Show per-source spinners + counts in the UI

**Estimated scope:** ~80 lines changed in SocialListener

---

### A2. Cache discovery results (24h TTL)

**Problem:** Every call to `POST /api/discover` fires 8 live HTTP requests (Reddit API, Apple API, 5× DuckDuckGo scrapes, 1× domain search). No memoisation — multiple users researching "Bet365" each trigger a full sweep.

**Fix:** Add an in-memory LRU cache with 24h TTL in the discover route.

**Files:**
- `app/api/discover/route.ts`:
  - Add a `Map<string, { result: DiscoveryResult; expiresAt: number }>` at module level
  - Key: `company.toLowerCase().trim()`
  - On POST: check cache first, return cached if fresh, otherwise run discovery and cache result
  - Add `Cache-Control: private, max-age=86400` header
  - Add `cached: boolean` field to response so UI can show "cached" badge
  - Cap map size at 500 entries (evict oldest on overflow)

**Estimated scope:** ~30 lines added

---

### A3. DuckDuckGo retry logic

**Problem:** `ddgSearch()` is single-shot with 10s timeout. One timeout or 429 = source silently missing with no feedback.

**Fix:** Add 1 retry with 2s backoff inside `ddgSearch()`. Return a `{ results, failed: boolean }` shape so caller can distinguish "not found" from "search failed".

**Files:**
- `app/api/discover/route.ts` — modify `ddgSearch()`:
  - On non-200 or timeout, wait 2s and retry once
  - Track `searchFailed` flag per platform
  - Add `searchErrors: string[]` to `DiscoveryResult` response

**Estimated scope:** ~25 lines changed

---

### A4. Cron Perplexity timeout

**Problem:** `fetchPerplexityIntel()` in the cron has no timeout on its `fetch()` call — could hang indefinitely.

**Fix:** Add `signal: AbortSignal.timeout(60_000)` to the Perplexity fetch in the cron route.

**Files:**
- `app/api/cron/monitoring/route.ts` — add timeout to `fetchPerplexityIntel()`

**Estimated scope:** 1 line

---

## Phase B — Security & Consistency

### B1. Add auth to G2 and Capterra routes

**Problem:** `/api/sources/g2` and `/api/sources/capterra` don't call `requireAuth()`. Every other source route does.

**Fix:** Add `requireAuth()` check at the top of both POST handlers, matching the pattern in `/api/sources/perplexity/route.ts`.

**Files:**
- `app/api/sources/g2/route.ts` — add `requireAuth()` import + call
- `app/api/sources/capterra/route.ts` — add `requireAuth()` import + call

**Estimated scope:** 4 lines each

---

### B2. Validate NEXTAUTH_URL in cron

**Problem:** Cron's internal fetch to `/api/analyze` falls back to `http://localhost:3000` if `NEXTAUTH_URL` is not set. In production this silently calls the wrong URL.

**Fix:** Hard-fail with a clear error message if `NEXTAUTH_URL` is not configured.

**Files:**
- `app/api/cron/monitoring/route.ts` — add guard at top of GET handler

**Estimated scope:** 3 lines

---

## Phase C — Source Expansion

### C1. Add new discovery sources to `/api/discover`

Add DuckDuckGo site-searches for these platforms (same pattern as existing Trustpilot/G2/Capterra discovery):

| Platform | Search pattern | What to extract |
|---|---|---|
| **LinkedIn** | `site:linkedin.com/company "{company}"` | Company page URL slug |
| **Glassdoor** | `site:glassdoor.com/Reviews "{company}"` | Company slug for employee reviews |
| **Product Hunt** | `site:producthunt.com/products "{company}"` | Product slug |
| **BBB** | `site:bbb.org "{company}"` | Business profile URL |
| **YouTube** | `site:youtube.com "{company}"` | Channel URL |

**Files:**
- `app/api/discover/route.ts`:
  - Add 5 new `ddgSearch()` calls inside the existing `Promise.all`
  - Add new fields to `DiscoveryResult` interface: `linkedin`, `glassdoor`, `producthunt`, `bbb`, `youtube`
  - Each follows the existing `{ slug: string | null; found: boolean }` pattern

**Estimated scope:** ~60 lines added to discover route

---

### C2. Add Glassdoor collection route

Glassdoor employee reviews are high-value for behaviour analysis (internal company culture, employee satisfaction).

**Files:**
- `app/api/sources/glassdoor/route.ts` (new):
  - POST with `{ slug: string; pages?: number }`
  - Scrape review pages from Glassdoor (HTML parsing, similar pattern to Trustpilot scraper)
  - Return `{ reviews: GlassdoorReview[]; error?: string }`
  - Add `requireAuth()`
- `lib/scraper.ts` — add `GlassdoorReview` type

**Estimated scope:** ~120 lines new file

---

### C3. Add Glassdoor + LinkedIn + Product Hunt + YouTube to SocialListener

**Files:**
- `components/SocialListener.tsx`:
  - Add SOURCE_DEFS entries for `glassdoor`, `linkedin`, `producthunt`, `youtube`
  - Add state variables for each (slug inputs)
  - Add fetch handlers in `handleFetch()` for glassdoor
  - LinkedIn/ProductHunt/YouTube are discovery-only (show as informational links, no scraping)
- `components/CompanySearchBar.tsx`:
  - Add discovered LinkedIn/Glassdoor/ProductHunt/YouTube to the found/not-found badges

**Estimated scope:** ~80 lines across both files

---

### C4. Make RSS presets configurable per-industry

**Problem:** `CompanyFootprint` hardcodes 3 gambling/fintech RSS feeds. Other industries get irrelevant feeds.

**Fix:** Move RSS presets to a config map keyed by industry, let user select industry or auto-detect from company domain.

**Files:**
- `lib/rssPresets.ts` (new):
  - Export `INDUSTRY_RSS: Record<string, { label: string; url: string }[]>`
  - Industries: gambling, fintech, saas, ecommerce, healthcare, general
- `components/CompanyFootprint.tsx` — import presets, add industry selector dropdown
- `components/SocialListener.tsx` — same RSS_PRESETS refactor

**Estimated scope:** ~50 lines new file + ~20 lines per component

---

## Phase D — UX Polish

### D1. Add CompanySearchBar to CompanyFootprint tab

**Problem:** Only the Social tab has the discover search bar. Footprint users who go there first have to manually type everything.

**Fix:** Mount `CompanySearchBar` at the top of `CompanyFootprint`, same as in `SocialListener`.

**Files:**
- `components/CompanyFootprint.tsx`:
  - Import `CompanySearchBar`
  - Add a prefill callback that sets companyName, domain, iosAppId, androidPackage from result
  - Render `<CompanySearchBar onDiscovery={prefillFromDiscovery} />` at top

**Estimated scope:** ~25 lines

---

### D2. Add per-source progress to SocialListener

**Problem:** SocialListener shows one spinner for all sources. CompanyFootprint shows per-task progress with checkmarks/counts. Inconsistent UX.

**Fix:** (Delivered as part of A1 parallelisation.) Add `TaskState` tracking per source, render progress list below the Collect button while fetching.

**Files:** Same as A1

---

### D3. Dashboard filtering

**Problem:** Dashboard aggregates all analyses with no filtering. Users can't drill into a specific project, time range, or data type.

**Fix:** Add filter controls at the top of the dashboard.

**Files:**
- `app/dashboard/page.tsx`:
  - Add date range picker (last 7d / 30d / 90d / all)
  - Add data type filter dropdown (survey, reviews, social, interviews, free_text)
  - Add project context text filter
  - Pass filters as query params to `/api/analyses/stats`
- `app/api/analyses/stats/route.ts`:
  - Accept `from`, `to`, `dataType`, `project` query params
  - Add WHERE clauses to Prisma queries

**Estimated scope:** ~60 lines dashboard + ~30 lines API

---

### D4. Show discovery confidence feedback

**Problem:** "Not found" could mean "doesn't exist on this platform" or "DuckDuckGo blocked us / timed out". User can't tell.

**Fix:** Return per-source `status: "found" | "not_found" | "search_failed"` from the discover API. Show amber warning in CompanySearchBar for `search_failed` entries.

**Files:**
- `app/api/discover/route.ts` — track DDG failures per source, add status field
- `components/CompanySearchBar.tsx` — show amber badges for `search_failed`

**Estimated scope:** ~30 lines across both files

---

## Phase E — Monitoring Enrichment

### E1. Multi-source monitoring runs

**Problem:** The monitoring cron only calls Perplexity. A monitor for "Monzo" misses Reddit threads, Trustpilot reviews, and App Store reviews that happened since the last run.

**Fix:** Before calling Perplexity, run discovery for the competitor (using cached results from C2), then also fetch Reddit + Trustpilot data. Combine all intel into the analysis input.

**Files:**
- `app/api/cron/monitoring/route.ts`:
  - Import discovery logic (extract into `lib/discovery.ts` shared helper)
  - For each monitor run: discover → fetch Reddit (last week) + Trustpilot (1 page) → combine with Perplexity intel → send to `/api/analyze`
  - Store discovered source count in run results

**Estimated scope:** ~80 lines in cron route + ~30 lines extracting discovery into lib

---

## Execution Order (recommended)

| Priority | Phase | Effort | Impact |
|---|---|---|---|
| 1 | A1 — Parallelise SocialListener | Medium | High (60s→10s collection) |
| 2 | B1 — Auth on G2/Capterra | Trivial | High (security) |
| 3 | B2 — Validate NEXTAUTH_URL | Trivial | Medium (prod safety) |
| 4 | A4 — Cron timeout | Trivial | Medium (reliability) |
| 5 | A2 — Discovery cache | Small | High (perf + DDG rate limits) |
| 6 | A3 — DDG retry + feedback | Small | Medium (reliability) |
| 7 | D1 — SearchBar in Footprint | Small | Medium (UX consistency) |
| 8 | D4 — Discovery confidence | Small | Medium (UX clarity) |
| 9 | C1 — New discovery sources | Medium | High (platform coverage) |
| 10 | C3 — New SocialListener sources | Medium | High (data breadth) |
| 11 | C2 — Glassdoor route | Medium | Medium (new data type) |
| 12 | C4 — Configurable RSS | Small | Medium (multi-industry) |
| 13 | D3 — Dashboard filtering | Medium | Medium (analytics) |
| 14 | E1 — Multi-source monitoring | Large | High (monitoring quality) |
