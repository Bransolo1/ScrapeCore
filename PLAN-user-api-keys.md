# User-Owned API Keys — End-to-End Implementation Plan

## Problem
API keys are currently environment variables shared across all users. Users on the web/Docker deployment have **no way** to enter their own keys at runtime — the Settings modal just shows a "set in .env and restart" warning. Users need to control their own API spend.

## Architecture Decision
**User keys stored in the database, encrypted at rest.** Resolution order per request:
1. User's own key (from DB, decrypted at runtime)
2. Platform/env key (fallback — owner's key)
3. `null` → 503 error

This means the platform owner can optionally provide shared keys, but users can always override with their own.

---

## Phase 1 — Database Schema

### File: `prisma/schema.prisma`
Add a `UserApiKey` model:

```prisma
model UserApiKey {
  id        String   @id @default(cuid())
  userId    String
  provider  String   // "anthropic" | "firecrawl" | "perplexity"
  cipher    String   // AES-256-GCM encrypted key
  iv        String   // initialisation vector (hex)
  tag       String   // GCM auth tag (hex)
  hint      String   // last 4 chars, e.g. "…a1b2" for UI display
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, provider])
}
```

Add to User model:
```prisma
apiKeys UserApiKey[]
```

Run: `npx prisma db push`

---

## Phase 2 — Encryption Layer

### New file: `lib/crypto.ts`

```
encrypt(plaintext: string) → { cipher, iv, tag }
decrypt({ cipher, iv, tag }) → string
```

- Algorithm: AES-256-GCM (Node.js `crypto` module)
- Key: `process.env.ENCRYPTION_KEY` (32-byte hex string)
  - Generate once: `openssl rand -hex 32`
  - Add to `.env.local.example` with instructions
- Never log or return the full decrypted key to the client

---

## Phase 3 — API Routes for Key Management

### New file: `app/api/user/keys/route.ts`

**GET** — List user's configured keys (hint only, never full key)
```json
{
  "keys": [
    { "provider": "anthropic",  "hint": "…k4Xz", "updatedAt": "..." },
    { "provider": "firecrawl",  "hint": "…r2Yq", "updatedAt": "..." }
  ]
}
```

**PUT** — Upsert a key for a provider
```json
// Request
{ "provider": "anthropic", "key": "sk-ant-abc123..." }

// Response
{ "ok": true, "hint": "…c123" }
```

Validation before save:
| Provider   | Prefix        | Min length |
|------------|---------------|------------|
| anthropic  | `sk-ant-`     | 20         |
| firecrawl  | `fc-`         | 10         |
| perplexity | `pplx-`       | 10         |

Optional: live validation ping (e.g., `GET /v1/models` for Anthropic) to confirm key works before saving.

**DELETE** — Remove a key, revert to platform key
```json
{ "provider": "firecrawl" }
```

All routes require `requireAuth()`.

---

## Phase 4 — Key Resolution Layer

### New file: `lib/resolveApiKey.ts`

```ts
async function resolveApiKey(
  provider: "anthropic" | "firecrawl" | "perplexity",
  userId: string
): Promise<{ key: string; source: "user" | "platform" } | null>
```

Resolution order:
1. Query `UserApiKey` where `userId + provider` → decrypt → return `{ key, source: "user" }`
2. Fall back to `process.env[ENV_VAR_MAP[provider]]` → return `{ key, source: "platform" }`
3. Return `null`

Cache decrypted keys in-memory for the request lifetime only (no cross-request cache of secrets).

### Refactor existing routes:

| Route file                          | Current                              | New                                          |
|-------------------------------------|--------------------------------------|----------------------------------------------|
| `app/api/analyze/route.ts`          | `getApiKey()` (env only)             | `resolveApiKey("anthropic", userId)`          |
| `app/api/sources/firecrawl/route.ts`| `process.env.FIRECRAWL_API_KEY`      | `resolveApiKey("firecrawl", userId)`          |
| `app/api/sources/perplexity/route.ts`| `process.env.PERPLEXITY_API_KEY`    | `resolveApiKey("perplexity", userId)`         |
| `app/api/cron/monitoring/route.ts`  | `process.env.PERPLEXITY_API_KEY`     | `resolveApiKey("perplexity", monitor.userId)` |

Each route now needs `userId` — firecrawl and perplexity routes must add `requireAuth()`.

---

## Phase 5 — Settings Modal UI Overhaul

### File: `components/SettingsModal.tsx`

Replace the current single-key input with a tabbed/sectioned interface:

```
┌─────────────────────────────────────────────────┐
│  Settings                                    ✕  │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔑 API Keys                                    │
│  Manage your own API keys. You only pay for     │
│  what you use.                                  │
│                                                 │
│  ┌─ Anthropic (Claude) ──────────────────────┐  │
│  │  ✅ Connected          hint: …k4Xz        │  │
│  │  [Update key]  [Remove — use platform key] │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Firecrawl ───────────────────────────────┐  │
│  │  ○ Not configured                         │  │
│  │  JS rendering for SPAs, G2, Capterra      │  │
│  │  [ sk-ant-...               ] [Save]      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Perplexity ──────────────────────────────┐  │
│  │  ○ Not configured                         │  │
│  │  Live web research & social listening      │  │
│  │  [ pplx-...                 ] [Save]      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ℹ Your keys are encrypted at rest (AES-256).  │
│    Keys are never logged or shared.             │
│                                                 │
│  ── Other Settings ──                           │
│  [Plain language mode toggle]                   │
│  [Theme toggle]                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Per-provider card states:
1. **Not configured, no platform key** → Input field + Save button
2. **Not configured, platform key available** → Badge "Using platform key" + optional override input
3. **User key configured** → Green "Connected" + hint + Update/Remove buttons
4. **Validation error** → Red border + error message (e.g., "Key must start with sk-ant-")
5. **Saving** → Spinner on Save button

### Component breakdown:
- `ApiKeyCard` — reusable card for each provider (provider name, description, prefix, state)
- Fetches `GET /api/user/keys` on mount to populate current state
- Save calls `PUT /api/user/keys`, Remove calls `DELETE /api/user/keys`

---

## Phase 6 — Platform Key Availability Indicator

### New route: `GET /api/platform-keys`

Returns which platform keys are available (no secrets):
```json
{
  "anthropic": true,
  "firecrawl": false,
  "perplexity": true
}
```

This lets the UI show "Using platform key" vs "Not configured — add your own" without exposing actual keys.

---

## Phase 7 — Usage Attribution (Optional Enhancement)

Track which key source was used per analysis for billing transparency:

### Schema addition to `Analysis` model:
```prisma
keySource String? // "user" | "platform"
```

Set in `/api/analyze` after `resolveApiKey()` returns `source`.

### Dashboard enhancement:
Show a badge on each analysis: "Your key" vs "Platform key" so users know what they're paying for.

---

## Phase 8 — Firecrawl & Perplexity Auth Gates

Currently `/api/sources/firecrawl` and `/api/sources/perplexity` don't require auth. They must now call `requireAuth()` since they need `userId` to resolve per-user keys.

Update:
- `app/api/sources/firecrawl/route.ts` — add `requireAuth()` at top
- `app/api/sources/perplexity/route.ts` — add `requireAuth()` at top

---

## File Change Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `UserApiKey` model + relation |
| `.env.local.example` | Add `ENCRYPTION_KEY` |
| `lib/crypto.ts` | **New** — AES-256-GCM encrypt/decrypt |
| `lib/resolveApiKey.ts` | **New** — user key → env key → null |
| `app/api/user/keys/route.ts` | **New** — GET/PUT/DELETE user keys |
| `app/api/platform-keys/route.ts` | **New** — which env keys are set |
| `app/api/analyze/route.ts` | Refactor to use `resolveApiKey()` |
| `app/api/sources/firecrawl/route.ts` | Add auth + `resolveApiKey()` |
| `app/api/sources/perplexity/route.ts` | Add auth + `resolveApiKey()` |
| `app/api/cron/monitoring/route.ts` | Use `resolveApiKey()` per monitor owner |
| `components/SettingsModal.tsx` | Full rebuild with per-provider cards |
| `lib/getApiKey.ts` | Keep for backward compat, but mark deprecated |

---

## Security Considerations

1. **Encryption at rest**: AES-256-GCM with per-row IV. Auth tag prevents tampering.
2. **ENCRYPTION_KEY rotation**: If key changes, re-encrypt all rows (migration script).
3. **Never return full key to client**: Only the hint (last 4 chars).
4. **Rate limit key operations**: Prevent brute-force key enumeration.
5. **Audit log**: Log `apikey.created`, `apikey.updated`, `apikey.deleted` events.
6. **No key in URL params or logs**: Keys only travel in POST/PUT request bodies over HTTPS.
7. **Memory hygiene**: Decrypted keys held only for the duration of a single request.

---

## Implementation Order

1. Schema + migration (`prisma/schema.prisma`)
2. Crypto layer (`lib/crypto.ts`)
3. Key resolution (`lib/resolveApiKey.ts`)
4. Key management API (`app/api/user/keys/route.ts`)
5. Platform keys API (`app/api/platform-keys/route.ts`)
6. Refactor analysis route (`app/api/analyze/route.ts`)
7. Refactor firecrawl route + add auth
8. Refactor perplexity route + add auth
9. Refactor monitoring cron route
10. Settings modal UI rebuild (`components/SettingsModal.tsx`)
11. Test end-to-end: save key → run analysis → verify correct key used
12. Add `keySource` to Analysis model + dashboard badge (optional)
