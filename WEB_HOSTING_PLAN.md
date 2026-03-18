# ScrapeCore — Web Hosting Migration Plan

**Goal:** Get ScrapeCore running on the web for free, accessible via a public URL.
**Approach:** Vercel (free tier) + Turso (free tier) — zero cost, zero infrastructure management.

---

## Why Vercel + Turso

| Concern | Solution | Cost |
|---|---|---|
| **Hosting** | Vercel Free Tier — built for Next.js, zero config deploys | Free (100GB bandwidth/mo, 100 hrs serverless/mo) |
| **Database** | Turso Free Tier — hosted libsql (SQLite-compatible) | Free (500 DBs, 9GB storage, 25M reads/mo) |
| **Auth** | NextAuth.js — already built, works on Vercel as-is | Free |
| **AI** | Anthropic API — user's own key, no hosting cost to us | User pays per use (~$0.05-0.20/analysis) |
| **Domain** | `yourapp.vercel.app` subdomain included | Free |
| **SSL** | Automatic via Vercel | Free |
| **CI/CD** | Vercel auto-deploys on git push | Free |

**Total monthly cost: $0**

---

## Step-by-Step Implementation Plan

### Phase 1: Database Migration (Turso) — ~30 min

The app already supports Turso via `@prisma/adapter-libsql` in `lib/db.ts`. This is the easiest migration ever.

**Step 1.1 — Create Turso account and database**
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up (free)
turso auth signup

# Create database
turso db create scrapecore

# Get connection URL and auth token
turso db show scrapecore --url
turso db tokens create scrapecore
```
This gives you a `libsql://scrapecore-<username>.turso.io` URL and an auth token.

**Step 1.2 — Update `lib/db.ts` to pass auth token**

Current code already handles `libsql://` URLs but needs the auth token added:

```typescript
// lib/db.ts — add authToken support
const adapter = new PrismaLibSql({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

**Step 1.3 — Push schema to Turso**
```bash
DATABASE_URL=libsql://scrapecore-<you>.turso.io \
TURSO_AUTH_TOKEN=<your-token> \
npx prisma db push
```

**Step 1.4 — Test locally against Turso**
```bash
# In .env.local:
DATABASE_URL=libsql://scrapecore-<you>.turso.io
TURSO_AUTH_TOKEN=<your-token>

npm run dev
# Verify everything works at localhost:3000
```

---

### Phase 2: Vercel Configuration — ~20 min

**Step 2.1 — Update `next.config.mjs`**

Vercel manages its own output mode. We need to conditionally set standalone only for Electron builds:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use standalone for Electron/Docker builds, not Vercel
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};
export default nextConfig;
```

**Step 2.2 — Create `vercel.json`** (optional, for fine-tuning)

```json
{
  "framework": "nextjs",
  "buildCommand": "npx prisma generate && next build",
  "functions": {
    "app/api/analyze/route.ts": {
      "maxDuration": 120
    },
    "app/api/sources/*/route.ts": {
      "maxDuration": 60
    }
  }
}
```

Key: Claude API calls can take 60-90 seconds for large inputs, so we bump the serverless function timeout. Vercel free tier allows up to 60s (Pro allows 300s). We may need to optimize for the 60s limit or consider upgrading to Pro ($20/mo) only if timeouts become an issue.

> **Note on SSE streaming:** Vercel supports streaming responses from serverless functions (Edge and Node.js runtimes). The existing SSE streaming in the analyze route should work, but we should verify and potentially switch to the Edge runtime for the analyze route if needed.

**Step 2.3 — Handle Prisma on Vercel**

Prisma needs to generate the client at build time. Add a `postinstall` script:

```json
// In package.json scripts:
"postinstall": "prisma generate"
```

---

### Phase 3: Deploy to Vercel — ~15 min

**Step 3.1 — Connect repo to Vercel**
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click "Import Project" → Select the ScrapeCore repo
3. Vercel auto-detects Next.js

**Step 3.2 — Set environment variables in Vercel Dashboard**

| Variable | Value |
|---|---|
| `DATABASE_URL` | `libsql://scrapecore-<you>.turso.io` |
| `TURSO_AUTH_TOKEN` | `<your-turso-token>` |
| `NEXTAUTH_SECRET` | `<generate with openssl rand -base64 32>` |
| `NEXTAUTH_URL` | `https://scrapecore.vercel.app` (or your custom domain) |
| `ANTHROPIC_API_KEY` | `<your-key>` (or leave empty if users provide their own) |

**Step 3.3 — Deploy**
```bash
git push origin main
# Vercel auto-builds and deploys
```

**Step 3.4 — Verify**
- Visit `https://scrapecore.vercel.app`
- Register first user (becomes admin)
- Run a test analysis
- Check that data persists in Turso

---

### Phase 4: Handle Edge Cases — ~30 min

**Step 4.1 — Competitor Monitor Cron Jobs**

The `CompetitorMonitor` model has scheduled scans (daily/weekly/monthly). On a server, this would run as a background process. On Vercel, use **Vercel Cron Jobs** (free tier: 1 cron job, daily minimum):

Create `app/api/cron/monitoring/route.ts`:
```typescript
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Run all due monitors
  // ... (move existing monitoring logic here)
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/monitoring",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Step 4.2 — Rate Limiting Adjustments**

Current rate limiting uses SQLite. This still works with Turso, but consider adding Vercel's built-in rate limiting headers or using the existing `RateLimit` model as-is (it'll work fine over Turso).

**Step 4.3 — API Key Strategy**

Decide between:
- **A) Server-side key** — Set `ANTHROPIC_API_KEY` in Vercel env vars. All users share your key. You pay for API usage.
- **B) User-provided keys** — Each user enters their own key in Settings. No cost to you. (Current Electron approach.)
- **C) Hybrid** — Provide a shared key with usage limits, allow users to add their own for unlimited use.

Recommendation: **Option B** for free hosting. Zero API cost to you.

**Step 4.4 — PII / Security for Multi-Tenant**

The app already has:
- PII detection and redaction (`lib/pii.ts`)
- Audit logging
- User/org scoping on analyses
- CSRF protection
- Rate limiting

This is solid for a web-hosted app. No changes needed.

---

### Phase 5: Polish for Web — ~45 min (optional but recommended)

**Step 5.1 — Landing/marketing page**

Add a simple landing page at `/` for non-authenticated users showing what ScrapeCore does, with a "Sign Up" / "Log In" CTA. Currently `/` goes straight to the analysis workspace.

**Step 5.2 — Custom domain (free)**

If you own a domain, point it to Vercel for free:
1. Vercel Dashboard → Project Settings → Domains → Add your domain
2. Add CNAME record: `scrapecore.yourdomain.com` → `cname.vercel-dns.com`
3. Update `NEXTAUTH_URL` to match

**Step 5.3 — SEO basics**

Add `metadata` exports to layout.tsx for title, description, and OG image.

**Step 5.4 — Remove Electron-only code from web build**

Not strictly necessary (Electron code is in `electron/` dir and only used by electron-builder), but you could add a `NEXT_PUBLIC_IS_WEB=true` env var to hide Electron-specific UI elements if any exist.

---

## Files That Need Changes

| File | Change | Complexity |
|---|---|---|
| `lib/db.ts` | Add `authToken` for Turso | 1 line |
| `next.config.mjs` | Conditional standalone output | 1 line |
| `package.json` | Add `postinstall` script for Prisma | 1 line |
| `vercel.json` | New file — build config, function timeouts, cron | New file |
| `app/api/cron/monitoring/route.ts` | New file — cron endpoint for competitor monitors | New file |
| `.env.local.example` | Add `TURSO_AUTH_TOKEN` | 1 line |

**Total code changes: ~6 files, ~50 lines of actual code.**

---

## What You Keep

- Desktop app (Electron) still works as before — `output: "standalone"` kicks in when not on Vercel
- Docker self-hosted option still works
- All existing features work identically on the web version
- Local dev still works with SQLite (`file:./dev.db`)

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Vercel 60s function timeout on large analyses | Medium | SSE streaming already helps. Can split analysis into smaller chunks or use Edge runtime. Pro tier ($20/mo) gives 300s if needed. |
| Turso free tier limits exceeded | Low (25M reads/mo is generous) | Monitor usage. Upgrade to $29/mo Scaler if needed. |
| Cold starts on serverless | Low-Medium | First request after idle may take 2-3s extra. Not critical for this use case. |
| Anthropic API costs for shared key | N/A if users bring own keys | Use Option B (user-provided keys) |

---

## Implementation Order

```
1. Create Turso DB + get credentials        [5 min]
2. Update lib/db.ts (add authToken)          [2 min]
3. Update next.config.mjs (conditional)      [2 min]
4. Add postinstall to package.json           [1 min]
5. Create vercel.json                        [5 min]
6. Test locally against Turso                [10 min]
7. Push to GitHub                            [2 min]
8. Connect repo to Vercel + set env vars     [10 min]
9. Deploy and verify                         [10 min]
10. Create cron endpoint for monitoring      [15 min]
11. (Optional) Landing page, SEO, domain     [30 min]
```

**Total estimated effort: ~1 hour for core deployment, ~2 hours with polish.**
