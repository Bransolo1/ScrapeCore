# Remove Google OAuth — Implementation Steps

**Goal:** Strip Google OAuth entirely. Auth is email/password only (PoC scope).

## Files to Change

### 1. `lib/auth.ts` — Remove Google provider
- Remove `GoogleProvider` import
- Remove `GoogleProvider({...})` from providers array
- Remove the `signIn` callback that auto-creates Google users
- Remove the Google-specific branch in the `jwt` callback
- Keep: `CredentialsProvider`, JWT strategy, session/jwt callbacks for credentials

### 2. `app/login/page.tsx` — Remove Google sign-in button
- Remove `GoogleIcon` component
- Remove `googleLoading` state
- Remove `handleGoogleSignIn` function
- Remove the "Continue with Google" button
- Remove the "or" divider between Google and email form
- Keep: email/password form, register/login toggle, first-user detection

### 3. `app/api/auth/register/route.ts` — No changes needed
- Already handles email/password only

### 4. `.env.example` — Remove Google env vars
- Remove `GOOGLE_CLIENT_ID`
- Remove `GOOGLE_CLIENT_SECRET`

### 5. `prisma/schema.prisma` — No changes needed
- `passwordHash` is already optional (supports both flows)
- Keeping schema flexible doesn't hurt

## Verification
- Login page shows email/password form only (no Google button)
- New users can register with email + password
- First user becomes admin
- Subsequent users become analyst
- Sign in works with credentials
- Build passes with no type errors
