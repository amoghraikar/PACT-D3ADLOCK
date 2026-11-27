import type { Prisma } from "@prisma/client";
import type { OutboxEventType } from "@pact/shared";

/**
 * Persists a domain event in the PostgreSQL transactional outbox
 * within the caller's active transaction (`tx`).
 */
export async function recordOutboxEvent(
  tx: Prisma.TransactionClient,
  eventType: OutboxEventType,
  payload: Record<string, unknown>
): Promise<void> {
  await tx.outboxEvent.create({
    data: {
      eventType,
      payload: JSON.stringify(payload),
      isProcessed: false,
    },
  });
}

export async function recordAuditLog(
  tx: Prisma.TransactionClient,
  params: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    payloadAfter?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      payloadAfter: params.payloadAfter ? JSON.stringify(params.payloadAfter) : null,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
