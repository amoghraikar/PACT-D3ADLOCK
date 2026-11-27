import { OUTBOX_EVENTS } from "@pact/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { nowUtc } from "../lib/clock.js";
import { lockExpiredCycles } from "../modules/cycles.service.js";

/**
 * Processes a batch of pending PostgreSQL outbox events using SKIP LOCKED
 * semantics so multiple workers never double-process an event.
 */
export async function processPendingOutboxBatch(batchSize = 25): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const events = await tx.$queryRaw<
      { id: string; event_type: string; payload: string }[]
    >`
      SELECT id, event_type, payload
      FROM outbox_events
      WHERE is_processed = false
      ORDER BY created_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    for (const ev of events) {
      const payload = JSON.parse(ev.payload) as Record<string, unknown>;

      if (ev.event_type === OUTBOX_EVENTS.BILL_FINALISED && typeof payload.bulk_order_id === "string") {
        const invoices = await tx.invoice.findMany({
          where: { bulkOrderId: payload.bulk_order_id },
          select: { userId: true, invoiceNumber: true, totalAmountPaise: true },
        });
        for (const inv of invoices) {
          await tx.notification.create({
            data: {
              userId: inv.userId,
              title: "Monthly Bill Ready",
              message: `Your collective invoice ${inv.invoiceNumber} (₹${(inv.totalAmountPaise / 100).toFixed(2)}) is finalized.`,
              kind: "bill_ready",
            },
          });
        }
      } else if (
        ev.event_type === OUTBOX_EVENTS.PAYMENT_RECEIVED &&
        typeof payload.user_id === "string"
      ) {
        const amt = Number(payload.amount_paise ?? 0);
        await tx.notification.create({
          data: {
            userId: payload.user_id,
            title: "Payment Confirmed",
            message: `Payment of ₹${(amt / 100).toFixed(2)} received (${String(payload.transaction_id ?? "")}).`,
            kind: "payment_received",
          },
        });
      } else if (
        ev.event_type === OUTBOX_EVENTS.DELIVERY_READY &&
        typeof payload.community_id === "string"
      ) {
        const members = await tx.communityMembership.findMany({
          where: { communityId: payload.community_id, isActive: true },
          select: { userId: true },
        });
        for (const m of members) {
          await tx.notification.create({
            data: {
              userId: m.userId,
              title: "Collective Order Dispatched",
              message: "The retailer has dispatched this month's bulk order to your building.",
              kind: "delivery_update",
            },
          });
        }
      }

      await tx.outboxEvent.update({
        where: { id: ev.id },
        data: { isProcessed: true, processedAt: nowUtc() },
      });
    }

    return events.length;
  });
}

async function runWorkerLoop() {
  console.log(`[PACT Worker] Started PostgreSQL outbox + cycle worker (poll=${env.OUTBOX_POLL_INTERVAL_MS}ms)`);
  let stopping = false;

  const stop = async () => {
    stopping = true;
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    try {
      await lockExpiredCycles();
      await processPendingOutboxBatch();
    } catch (err) {
      console.error("[PACT Worker] Error during tick:", err);
    }
    await new Promise((r) => setTimeout(r, env.OUTBOX_POLL_INTERVAL_MS));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorkerLoop().catch((err) => {
    console.error("[PACT Worker] Fatal:", err);
    process.exit(1);
  });
}
