# Auto-Discovery: Eliminate Manual Input Across Social Listening

## Problem

The Social Listening tab has **13 sources**, each requiring different manual inputs:
- Reddit needs a search query + optional subreddit name
- Trustpilot needs a domain
- App Store needs a numeric App ID
- Google Play needs a reverse-domain package ID
- G2 needs a product slug
- Capterra needs a product slug
- And so on...

Users complain they spend more time configuring sources than analysing results. The platform has powerful scrapers but front-loads too much manual work onto users.

**Goal**: User types a **company name** (e.g. "Bet365") → the system auto-discovers and pre-fills every relevant source.

---

## Current State: What Requires Manual Input

| Source | Manual Input Required | Can Auto-Discover? |
|--------|----------------------|-------------------|
| Reddit | Search query, subreddit | Query: trivial. Subreddit: **yes, via search** |
| Hacker News | Search query | Query: trivial (= company name) |
| Google News | Search query | Query: trivial (= company name) |
| StockTwits | Ticker symbol | **Yes** — DuckDuckGo `"{company}" site:stocktwits.com` |
| Trustpilot | Domain | **Yes** — DuckDuckGo `"{company}" site:trustpilot.com` |
| App Store | Numeric App ID | **Yes** — Apple Search API is public |
| Google Play | Package ID | **Yes** — DuckDuckGo `"{company}" site:play.google.com` |
| G2 | Product slug | **Yes** — DuckDuckGo `"{company}" site:g2.com/products` |
| Capterra | Product slug | **Yes** — DuckDuckGo `"{company}" site:capterra.com` |
| Twitter/X | Search query | Query: trivial (= company name) |
| Perplexity | Research query | Query: trivial (= company name + " review") |
| RSS Feeds | Feed URLs | Partial — can suggest industry feeds |
| StockTwits | Ticker symbol | **Yes** — web search |

---

## Architecture: "Company Intelligence Hub"

### Core Concept

New **Discovery API** endpoint: `POST /api/discover`

Input:
```json
{
  "company": "Bet365",
  "domain": "bet365.com"     // optional — auto-detected if omitted
}
```

Output:
```json
{
  "company": "Bet365",
  "domain": "bet365.com",
  "discovered": {
    "reddit": {
      "subreddits": ["gambling", "sportsbook", "Bet365"],
      "suggestedQuery": "Bet365 review complaints"
    },
    "trustpilot": {
      "domain": "bet365.com",
      "found": true
    },
    "appstore": {
      "appId": "1172616905",
      "appName": "bet365 - Sportsbook",
      "found": true
    },
    "googleplay": {
      "packageId": "com.bet365.client",
      "appName": "bet365 - Sportsbook",
      "found": true
    },
    "g2": {
      "slug": "bet365",
      "found": true
    },
    "capterra": {
      "slug": "bet365",
      "found": false
    },
    "stocktwits": {
      "symbol": null,
      "found": false
    },
    "hackernews": {
      "suggestedQuery": "Bet365"
    },
    "googlenews": {
      "suggestedQuery": "Bet365"
    }
  }
}
```

### How Each Source Is Discovered

#### 1. Reddit Subreddits — Reddit Search API (no auth needed)
```
GET https://www.reddit.com/subreddits/search.json?q={company}&limit=5
```
Returns matching subreddit names. Filter by subscriber count > 1000.
Also search `https://www.reddit.com/search.json?q={company}&type=sr` for community matches.

**Fallback**: DuckDuckGo `"{company}" site:reddit.com/r/` → extract `/r/{name}` from URLs.

#### 2. Trustpilot Domain — DuckDuckGo site-search
```
DuckDuckGo: "{company}" site:trustpilot.com/review
```
Extract domain from first result URL: `trustpilot.com/review/{domain}` → `domain`.

**Validation**: HEAD request to `https://www.trustpilot.com/review/{domain}` — 200 = found.

#### 3. App Store — Apple Search API (public, no key needed)
```
GET https://itunes.apple.com/search?term={company}&entity=software&country={country}&limit=5
```
Returns JSON with `results[].trackId` (= App ID), `trackName`, `bundleId`.
Pick the best match by name similarity.

#### 4. Google Play — DuckDuckGo site-search
```
DuckDuckGo: "{company}" site:play.google.com/store/apps/details
```
Extract `id=com.xxx.yyy` from first matching URL.

**Validation**: HEAD request to Play Store URL.

#### 5. G2 — DuckDuckGo site-search
```
DuckDuckGo: "{company}" site:g2.com/products
```
Extract slug from URL: `g2.com/products/{slug}/reviews` → `slug`.

#### 6. Capterra — DuckDuckGo site-search
```
DuckDuckGo: "{company}" site:capterra.com
```
Extract slug from URL patterns: `/p/{id}/{slug}` or `/software/{slug}`.

#### 7. StockTwits — DuckDuckGo site-search
```
DuckDuckGo: "{company}" site:stocktwits.com/symbol
```
Extract symbol from URL: `stocktwits.com/symbol/{SYMBOL}`.

**Fallback**: Skip if not a public company (most won't have a ticker).

#### 8. Search Queries (Reddit, HN, Google News, Twitter, Perplexity)
These don't need discovery — just auto-fill `{company}` as the query, with smart suffixes:
- Reddit: `"{company}" review OR complaints OR experience`
- HN: `{company}`
- Google News: `{company}`
- Twitter: `{company} review OR problem OR love`
- Perplexity: `{company} user reviews customer feedback complaints praise`

---

## Phase 1 — Discovery API

### New file: `app/api/discover/route.ts`

**Implementation approach**: Run all discovery searches in parallel using `Promise.allSettled`.

```
POST /api/discover
Body: { company: string, domain?: string }

1. If no domain provided → DuckDuckGo "{company} official site" → extract domain
2. In parallel:
   a. Reddit subreddit search (Reddit API)
   b. Apple Search API for iOS app
   c. DuckDuckGo "{company} site:trustpilot.com/review"
   d. DuckDuckGo "{company} site:play.google.com/store/apps"
   e. DuckDuckGo "{company} site:g2.com/products"
   f. DuckDuckGo "{company} site:capterra.com"
   g. DuckDuckGo "{company} site:stocktwits.com/symbol"
3. Parse results, extract IDs/slugs
4. Return structured discovery object
```

**Rate limiting**: Use existing DuckDuckGo search route (`/api/search`) internally. Max 7 searches ≈ 2-3 seconds.

**Caching**: Cache results by company name for 24 hours (in-memory or DB) to avoid redundant searches.

---

## Phase 2 — "Smart Prefill" UX in SocialListener

### New component: `CompanySearchBar`

Sits at the top of the Social Listening tab, above all source pills:

```
┌─────────────────────────────────────────────────────────┐
│  🔍 Company name                                        │
│  ┌───────────────────────────────────────────────┐      │
│  │ Bet365                                    [⟳] │      │
│  └───────────────────────────────────────────────┘      │
│                                                         │
│  Found: Reddit (3 subreddits) · Trustpilot · App Store  │
│         Google Play · G2                                 │
│  Not found: Capterra · StockTwits                       │
│                                                         │
│  [Auto-select found sources]   [Prefill all fields]     │
│                                                         │
│  ─── Sources ───────────────────────────────────────── │
│  [Reddit ✓] [HN] [Google News] [Trustpilot ✓] ...     │
└─────────────────────────────────────────────────────────┘
```

**Behaviour**:
1. User types company name → hits Enter or clicks search
2. Calls `POST /api/discover` with `{ company }`
3. Shows discovered results with checkmarks
4. "Auto-select found sources" button → enables all discovered source pills
5. "Prefill all fields" button → fills in:
   - `query` → `"{company}" review complaints`
   - `subreddit` → first discovered subreddit
   - `tpDomain` → discovered Trustpilot domain
   - `appId` → discovered App Store ID
   - `gpPackageId` → discovered Google Play package
   - `g2Slug` → discovered G2 slug
   - `capterraSlug` → discovered Capterra slug
   - `twitterQuery` → `{company}`
   - `perplexityQuery` → `{company} user reviews feedback`
6. User reviews, tweaks if needed, clicks Fetch

### State flow:
```
CompanySearchBar → calls /api/discover → returns DiscoveryResult
  → passes to SocialListener via callback prop
  → SocialListener.prefillFromDiscovery(result)
    → setActive(new Set of found sources)
    → setQuery, setSubreddit, setAppId, etc.
```

---

## Phase 3 — Auto-Select Sources Based on Discovery

When discovery returns results, auto-enable the source pills:

```typescript
function prefillFromDiscovery(result: DiscoveryResult) {
  const toActivate = new Set<SourceId>();

  // Always activate query-based sources
  toActivate.add("reddit");
  toActivate.add("hackernews");
  toActivate.add("gnews");

  // Activate discovered review sources
  if (result.trustpilot?.found) toActivate.add("trustpilot");
  if (result.appstore?.found) toActivate.add("appstore");
  if (result.googleplay?.found) toActivate.add("googleplay");
  if (result.g2?.found) toActivate.add("g2");
  if (result.capterra?.found) toActivate.add("capterra");
  if (result.stocktwits?.found) toActivate.add("stocktwits");

  setActive(toActivate);

  // Prefill all fields
  setQuery(`"${result.company}" review OR complaints OR experience`);
  if (result.reddit?.subreddits?.[0]) setSubreddit(result.reddit.subreddits[0]);
  if (result.trustpilot?.domain) setTpDomain(result.trustpilot.domain);
  if (result.appstore?.appId) setAppId(result.appstore.appId);
  if (result.googleplay?.packageId) setGpPackageId(result.googleplay.packageId);
  if (result.g2?.slug) setG2Slug(result.g2.slug);
  if (result.capterra?.slug) setCapterraSlug(result.capterra.slug);
  setTwitterQuery(result.company);
  setPerplexityQuery(`${result.company} user reviews customer feedback`);
}
```

---

## Phase 4 — Integrate with CompanyFootprint Tab

The Digital Footprint tab already takes a company name + domain. Reuse the discovery results:

1. After CompanyFootprint discovers app IDs, pass them to SocialListener
2. Or: run discovery once, cache in page-level state, share across tabs
3. Add to `app/page.tsx`: a `discoveryResult` state that's shared between tabs

```typescript
// In page.tsx
const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);

// Pass to both tabs
<SocialListener discovery={discoveryResult} onDiscover={setDiscoveryResult} />
<CompanyFootprint discovery={discoveryResult} onDiscover={setDiscoveryResult} />
```

---

## Phase 5 — Monitoring Auto-Setup

When creating a CompetitorMonitor, reuse discovery:

1. User types competitor name
2. Auto-run discovery in background
3. Pre-populate keywords from discovery results
4. Show discovered sources as "will be monitored" badges

---

## Phase 6 — "One-Click Research" Mode

Ultimate friction reduction: a single "Research {company}" button that:

1. Runs discovery
2. Auto-selects all found sources
3. Prefills all fields
4. Immediately starts fetching all sources
5. Combines results into unified source list
6. Ready for analysis

This could be a new entry point at the top of the main page:

```
┌────────────────────────────────────────────────────────┐
│  Quick start: Research a company                       │
│  ┌────────────────────────────────┐                    │
│  │ Type a company name…           │  [Research →]      │
│  └────────────────────────────────┘                    │
│  Discovers Reddit, Trustpilot, App Store, G2 + more    │
└────────────────────────────────────────────────────────┘
```

---

## Implementation Complexity & Priority

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| **Phase 1**: Discovery API | Medium (1 new route, 7 parallel searches) | High — unlocks all other phases | **P0** |
| **Phase 2**: CompanySearchBar UI | Medium (new component, state wiring) | High — immediate UX improvement | **P0** |
| **Phase 3**: Auto-select sources | Small (logic in SocialListener) | High — eliminates 5-10 clicks | **P0** |
| **Phase 4**: Cross-tab sharing | Small (lift state to page.tsx) | Medium — consistency | P1 |
| **Phase 5**: Monitoring integration | Small (reuse discovery) | Medium — better onboarding | P1 |
| **Phase 6**: One-click research | Medium (new flow) | Very high — game changer | P1 |

---

## API Dependencies & Limits

| Service | Auth Required? | Rate Limits | Reliability |
|---------|---------------|-------------|-------------|
| Reddit Search API | No | ~30 req/min | High |
| Apple Search API | No | Unknown (generous) | High |
| DuckDuckGo scraping | No | ~50 req/min | Medium (can get blocked) |
| Trustpilot HEAD check | No | Unlimited | High |
| Google Play HEAD check | No | Unlimited | High |

**Fallback strategy**: If DuckDuckGo is blocked, skip that source's discovery (graceful degradation). The user can still manually enter IDs.

---

## File Change Summary

| File | Action |
|------|--------|
| `app/api/discover/route.ts` | **New** — discovery endpoint |
| `lib/discovery.ts` | **New** — URL parsing helpers for each platform |
| `components/CompanySearchBar.tsx` | **New** — search bar with discovery results |
| `components/SocialListener.tsx` | Modify — add prefill logic, accept discovery prop |
| `components/CompanyFootprint.tsx` | Modify — share discovery results |
| `app/page.tsx` | Modify — add shared discovery state |
| `app/monitoring/page.tsx` | Modify — auto-suggest from discovery |

---

## Risk Mitigation

1. **DuckDuckGo blocking**: Rotate user-agents, add delays between searches. Fallback: show "couldn't auto-detect, enter manually" for that source.
2. **Wrong matches**: Discovery results are **suggestions**, always shown in editable fields. User confirms before fetching.
3. **Speed**: All 7 searches run in parallel. Target: < 3 seconds total.
4. **Apple Search API changes**: It's been stable for years, but wrap in try/catch.
5. **Privacy**: Company names searched are not logged beyond standard audit trail.
