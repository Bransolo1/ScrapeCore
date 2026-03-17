/**
 * Audit Logging
 *
 * Append-only event log. Every write is fire-and-forget — a logging failure
 * must never crash the main flow.
 */

import { prisma } from "@/lib/db";

export type AuditEvent =
  | "analysis.created"
  | "analysis.viewed"
  | "analysis.exported"
  | "analysis.deleted"
  | "review.updated"
  | "source.fetched"
  | "pii.detected"
  | "pii.redacted";

export interface AuditParams {
  event: AuditEvent;
  actor?: string;          // display name from localStorage, falls back to "system"
  analysisId?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        event: params.event,
        actor: params.actor ?? "system",
        analysisId: params.analysisId ?? null,
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? null,
        metadata: JSON.stringify(params.metadata ?? {}),
      },
    });
  } catch {
    // Never throw — audit failure is silent
  }
}
