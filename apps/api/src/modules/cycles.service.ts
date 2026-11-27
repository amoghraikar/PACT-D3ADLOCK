import { CYCLE_STATUSES, ORDER_STATUSES, OUTBOX_EVENTS, type CycleStatus } from "@pact/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { currentCycleWindow, nowUtc } from "../lib/clock.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { recordAuditLog, recordOutboxEvent } from "../lib/outbox.js";

export async function getCutoffOverrides(): Promise<{ day: number; hour: number; minute: number }> {
  const configs = await prisma.platformConfig.findMany({
    where: { key: { in: ["cutoff_day", "cutoff_hour", "cutoff_minute"] } },
  });
  const map = new Map(configs.map((c) => [c.key, Number.parseInt(c.value, 10)]));
  return {
    day: map.get("cutoff_day") || env.CYCLE_CUTOFF_DAY,
    hour: map.get("cutoff_hour") ?? env.CYCLE_CUTOFF_HOUR,
    minute: map.get("cutoff_minute") ?? env.CYCLE_CUTOFF_MINUTE,
  };
}

/**
 * Evaluates all OPEN cycles whose cutoffAt <= now and transitions them to LOCKED,
 * consolidating community carts into retailer bulk orders idempotently.
 */
export async function lockExpiredCycles(): Promise<number> {
  const now = nowUtc();
  const expired = await prisma.shoppingCycle.findMany({
    where: { status: CYCLE_STATUSES.OPEN, cutoffAt: { lte: now } },
  });

  let locked = 0;
  for (const cycle of expired) {
    await prisma.shoppingCycle.update({
      where: { id: cycle.id },
      data: { status: CYCLE_STATUSES.LOCKED, closedAt: now },
    });
    locked += 1;
    // Best-effort consolidate if items & mapped retailer exist
    try {
      await consolidateCycleIntoOrder(cycle.id);
    } catch {
      // Cart might be empty or retailer unmapped; cycle stays cleanly LOCKED
    }
  }
  return locked;
}

export async function getOrCreateCurrentCycle(communityId: string) {
  await lockExpiredCycles();

  const cutoffCfg = await getCutoffOverrides();
  const { cycleMonth, cutoffAt } = currentCycleWindow(cutoffCfg);

  let cycle = await prisma.shoppingCycle.findUnique({
    where: { communityId_cycleMonth: { communityId, cycleMonth } },
    include: { community: true },
  });

  if (!cycle) {
    cycle = await prisma.shoppingCycle.create({
      data: {
        communityId,
        cycleMonth,
        cutoffAt,
        status: CYCLE_STATUSES.OPEN,
      },
      include: { community: true },
    });
  }
  return cycle;
}

export async function consolidateCycleIntoOrder(cycleId: string, actorUserId?: string) {
  return prisma.$transaction(async (tx) => {
    const cycle = await tx.shoppingCycle.findUnique({
      where: { id: cycleId },
      include: { community: true },
    });
    if (!cycle) throw new NotFoundError("Shopping cycle not found.");

    const existing = await tx.bulkOrder.findUnique({
      where: { cycleId_communityId: { cycleId: cycle.id, communityId: cycle.communityId } },
      include: { items: true },
    });
    if (existing) {
      return existing;
    }

    const cartItems = await tx.communityCartItem.findMany({
      where: { cycleId: cycle.id },
      include: { variant: true },
    });
    if (cartItems.length === 0) {
      throw new ConflictError("Cannot consolidate an empty community cart.", "EMPTY_CART");
    }

    const mapping = await tx.retailerCommunity.findFirst({
      where: { communityId: cycle.communityId, isActive: true },
      orderBy: { isPrimary: "desc" },
    });
    if (!mapping) {
      throw new NotFoundError("No active retailer is mapped to this community.");
    }

    // Group quantities by variant
    const grouped = new Map<string, { requestedQty: number; unitPricePaise: number }>();
    for (const item of cartItems) {
      const prev = grouped.get(item.variantId);
      if (prev) {
        prev.requestedQty += item.quantity;
      } else {
        grouped.set(item.variantId, {
          requestedQty: item.quantity,
          unitPricePaise: item.variant.defaultPricePaise,
        });
      }
    }

    let totalRequested = 0;
    let subtotalPaise = 0;
    const itemCreates = [];
    for (const [variantId, g] of grouped.entries()) {
      const lineSub = g.requestedQty * g.unitPricePaise;
      totalRequested += g.requestedQty;
      subtotalPaise += lineSub;
      itemCreates.push({
        variantId,
        requestedQty: g.requestedQty,
        packedQty: 0,
        unitPricePaise: g.unitPricePaise,
        subtotalPaise: lineSub,
      });
    }

    const deliveryFee = mapping.deliveryFeePaise;
    const totalPaise = subtotalPaise + deliveryFee;
    const orderNumber = `PACT-${cycle.community.code.slice(0, 6)}-${cycle.cycleMonth.replace("-", "")}`;

    const order = await tx.bulkOrder.create({
      data: {
        cycleId: cycle.id,
        communityId: cycle.communityId,
        retailerId: mapping.retailerId,
        orderNumber,
        status: ORDER_STATUSES.PENDING,
        totalRequestedItems: totalRequested,
        totalPackedItems: 0,
        subtotalPaise,
        discountPaise: 0,
        deliveryFeePaise: deliveryFee,
        totalPaise,
        lockedAt: nowUtc(),
        items: { create: itemCreates },
      },
      include: { items: true },
    });

    await tx.shoppingCycle.update({
      where: { id: cycle.id },
      data: {
        status: CYCLE_STATUSES.PROCESSING,
        closedAt: cycle.closedAt ?? nowUtc(),
      },
    });

    await recordOutboxEvent(tx, OUTBOX_EVENTS.ORDER_CREATED, {
      bulk_order_id: order.id,
      order_number: order.orderNumber,
      community_id: cycle.communityId,
      retailer_id: mapping.retailerId,
    });

    await recordAuditLog(tx, {
      userId: actorUserId,
      action: "ORDER_CONSOLIDATED",
      entityType: "BulkOrder",
      entityId: order.id,
      payloadAfter: {
        cycle_id: cycle.id,
        total_requested_items: totalRequested,
        subtotal_paise: subtotalPaise,
      },
    });

    return order;
  });
}

export function formatCycleStatus(cycle: {
  id: string;
  communityId: string;
  cycleMonth: string;
  cutoffAt: Date;
  status: string;
  community: { name: string };
}, participantsCount: number) {
  const now = nowUtc();
  const secondsLeft = Math.max(0, Math.floor((cycle.cutoffAt.getTime() - now.getTime()) / 1000));
  const isPassed = now >= cycle.cutoffAt || cycle.status !== CYCLE_STATUSES.OPEN;
  return {
    id: cycle.id,
    community_id: cycle.communityId,
    community_name: cycle.community.name,
    cycle_month: cycle.cycleMonth,
    cutoff_at: cycle.cutoffAt.toISOString(),
    status: cycle.status as CycleStatus,
    time_remaining_seconds: secondsLeft,
    is_cutoff_passed: isPassed,
    participating_households_count: participantsCount,
  };
}
