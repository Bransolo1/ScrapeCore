# Security Hardening Plan

Audit date: 2026-03-25

## Critical

### 1. Unauthenticated API routes (15 of 26 mutation routes have no auth)

**Files missing `requireAuth`:**
- `app/api/scrape/route.ts` — anyone can trigger server-side fetches (SSRF risk)
- `app/api/social/route.ts` — unauthenticated Reddit/HN/news fetching
- `app/api/search/route.ts` — unauthenticated search
- `app/api/pii/scan/route.ts` — unauthenticated PII scanning
- `app/api/compare-summary/route.ts` — unauthenticated Claude API call (cost)
- `app/api/monitoring/route.ts` — uses raw session check, not `requireAuth`
- `app/api/monitoring/[id]/route.ts` — same
- `app/api/monitoring/run/[id]/route.ts` — same
- `app/api/analyses/[id]/route.ts` — unauthenticated analysis access
- `app/api/analyses/[id]/share/route.ts` — unauthenticated share token generation
- `app/api/analyses/[id]/review/route.ts` — unauthenticated review mutation
- `app/api/analyses/[id]/corrections/route.ts` — unauthenticated correction mutation
- `app/api/sources/*.ts` (6 routes) — unauthenticated external API calls (cost/abuse)

**Fix:** Add `requireAuth()` guard at the top of every POST/PUT/DELETE handler.

### 2. SSRF via scrape endpoint

`app/api/scrape/route.ts` accepts arbitrary URLs and fetches them server-side. An attacker can:
- Scan internal networks (`http://169.254.169.254` for cloud metadata)
- Probe localhost services (`http://127.0.0.1:5432`)
- Hit internal IPs (`http://10.x.x.x`, `http://192.168.x.x`)

Currently only checks protocol is `http:` or `https:` — no IP/hostname blocklist.

**Fix:** Block private/reserved IP ranges and cloud metadata endpoints before fetching.

### 3. Cron endpoint auth bypass

`app/api/cron/monitoring/route.ts:177` — when `CRON_SECRET` is not set, the auth check is skipped entirely:
```ts
if (cronSecret && authHeader !== `Bearer ${cronSecret}`)
```
This means anyone can trigger the cron job in environments without `CRON_SECRET`.

**Fix:** Reject all requests when `CRON_SECRET` is not configured.

## High

### 4. Missing CSRF validation on most mutation routes

Only `app/api/auth/register/route.ts` and `app/api/analyze/route.ts` call `validateCSRF()`. All other POST/PUT/DELETE routes are vulnerable to cross-site request forgery.

**Fix:** Add `validateCSRF(req)` to all mutation route handlers.

### 5. No security headers

`next.config.mjs` and `middleware.ts` set zero security headers. Missing:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: off`
- `Strict-Transport-Security` (HSTS)
- `Permissions-Policy` (disable camera, microphone, geolocation)

**Fix:** Add security headers in middleware.

### 6. No rate limiting on scrape/social/source routes

Only `/api/analyze` has rate limiting. The scrape, social, and source routes can be hammered with no limit — causing:
- Excessive external API calls (Firecrawl, Perplexity = cost)
- IP bans from Reddit/App Store/Google Play
- Server resource exhaustion

**Fix:** Add rate limiting to all data-fetching routes.

### 7. Analysis access has no ownership check

`app/api/analyses/[id]/route.ts` returns any analysis by ID with no ownership verification. Any authenticated user can access any other user's analyses by guessing/enumerating IDs.

**Fix:** Filter by `userId` in all analysis CRUD operations.

## Medium

### 8. Error responses leak stack traces in production

Several routes return raw `err.message` which can expose internal paths, DB schema, or dependency info:
```ts
return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
```

**Fix:** Return generic error messages in production, log details server-side.

### 9. Share tokens are predictable (UUID v4)

`app/api/analyses/[id]/share/route.ts` likely uses `crypto.randomUUID()` which is fine cryptographically, but share tokens should be longer and use `crypto.randomBytes` for higher entropy.

### 10. Missing `.env.example`

No `.env.example` file documenting required environment variables. Developers may forget to set `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, or `CRON_SECRET`.

**Fix:** Add `.env.example` with all required vars documented.

## Implementation Priority

1. Add `requireAuth()` to all unprotected API routes
2. Add security headers in middleware
3. Add SSRF protection to scrape route
4. Add rate limiting to data-fetching routes
5. Fix cron auth bypass
6. Add CSRF to all mutation routes
7. Sanitize error responses in production
8. Add `.env.example`
