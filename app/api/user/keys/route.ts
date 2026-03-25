/**
 * GET  /api/user/keys — list configured keys (hint only, never full key)
 * PUT  /api/user/keys — upsert a key for a provider
 * DELETE /api/user/keys — remove a key (revert to platform key)
 */

import { requireAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { validateCSRF } from "@/lib/csrf";

const PROVIDERS = {
  anthropic:  { prefix: "sk-ant-", minLen: 20, label: "Anthropic" },
  firecrawl:  { prefix: "fc-",     minLen: 10, label: "Firecrawl" },
  perplexity: { prefix: "pplx-",   minLen: 10, label: "Perplexity" },
} as const;

type Provider = keyof typeof PROVIDERS;

function isProvider(s: unknown): s is Provider {
  return typeof s === "string" && s in PROVIDERS;
}

// GET — list user's configured keys
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const rows = await prisma.userApiKey.findMany({
    where: { userId: auth.userId },
    select: { provider: true, hint: true, updatedAt: true },
  });

  return Response.json({ keys: rows });
}

// PUT — upsert a key
export async function PUT(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let body: { provider?: unknown; key?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isProvider(body.provider)) {
    return Response.json(
      { error: `Invalid provider. Must be one of: ${Object.keys(PROVIDERS).join(", ")}` },
      { status: 400 }
    );
  }

  const key = typeof body.key === "string" ? body.key.trim() : "";
  const spec = PROVIDERS[body.provider];

  if (!key) {
    return Response.json({ error: "Key is required" }, { status: 400 });
  }

  if (!key.startsWith(spec.prefix)) {
    return Response.json(
      { error: `${spec.label} key must start with "${spec.prefix}"` },
      { status: 400 }
    );
  }

  if (key.length < spec.minLen) {
    return Response.json(
      { error: `Key is too short — check you copied the full key` },
      { status: 400 }
    );
  }

  const { cipher, iv, tag } = encrypt(key);
  const hint = `…${key.slice(-4)}`;

  await prisma.userApiKey.upsert({
    where: { userId_provider: { userId: auth.userId, provider: body.provider } },
    create: {
      userId: auth.userId,
      provider: body.provider,
      cipher,
      iv,
      tag,
      hint,
    },
    update: { cipher, iv, tag, hint },
  });

  await logAudit({
    event: "apikey.updated",
    actor: auth.userId,
    entityType: "user_api_key",
    metadata: { provider: body.provider },
    userId: auth.userId,
  });

  return Response.json({ ok: true, hint });
}

// DELETE — remove a key
export async function DELETE(req: Request) {
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let body: { provider?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isProvider(body.provider)) {
    return Response.json(
      { error: `Invalid provider. Must be one of: ${Object.keys(PROVIDERS).join(", ")}` },
      { status: 400 }
    );
  }

  await prisma.userApiKey.deleteMany({
    where: { userId: auth.userId, provider: body.provider },
  });

  await logAudit({
    event: "apikey.deleted",
    actor: auth.userId,
    entityType: "user_api_key",
    metadata: { provider: body.provider },
    userId: auth.userId,
  });

  return Response.json({ ok: true });
}
