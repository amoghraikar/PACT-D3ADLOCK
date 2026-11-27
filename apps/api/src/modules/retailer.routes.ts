import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  calculateF7Billing,
  CYCLE_STATUSES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  OUTBOX_EVENTS,
  ROLES,
  type InventoryItemDTO,
  type InventoryMovementDTO,
  type OrderStatus,
  type PaginatedResponseDTO,
  type RetailerDashboardMetricsDTO,
  type RetailerOrderDetailDTO,
  type RetailerOrderSummaryDTO,
} from "@pact/shared";
import { prisma } from "../db/prisma.js";
import { requireRoles, requireUser } from "../lib/auth.js";
import { nowUtc } from "../lib/clock.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { recordAuditLog, recordOutboxEvent } from "../lib/outbox.js";

function resolveRetailerId(
  user: { role: string; retailer: { id: string } | null },
  explicitRetailerId?: string
): string {
  if (user.role === ROLES.PLATFORM_ADMIN && explicitRetailerId) {
    return explicitRetailerId;
  }
  if (!user.retailer) {
    throw new ForbiddenError("No active retailer profile associated with this account.");
  }
  return user.retailer.id;
}

const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const packingSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.string().uuid(),
        packed_qty: z.number().int().min(0),
        is_unavailable: z.boolean().default(false),
        notes: z.string().trim().max(255).optional(),
      })
    )
    .min(1),
});

const sendBillSchema = z.object({
  delivery_fee_paise: z.number().int().min(0).optional(),
  order_discount_paise: z.number().int().min(0).default(0),
  platform_fee_paise: z.number().int().min(0).default(0),
  delivery_allocation_mode: z.enum(["EQUAL", "PRO_RATA"]).default("EQUAL"),
  variant_discounts: z.record(z.string(), z.number().int().min(0)).optional(),
});

const inwardSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
  batch_number: z.string().trim().min(2).max(60),
  cost_price_paise: z.number().int().min(0),
  supplier_name: z.string().trim().max(120).optional(),
  expiry_date: z.string().datetime().optional(),
});

const adjustInventorySchema = z.object({
  quantity_delta: z.number().int().refine((n) => n !== 0, "Delta cannot be zero"),
  reason: z.string().trim().min(3).max(255),
  reorder_level_qty: z.number().int().min(0).optional(),
});

export async function retailerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRoles(ROLES.RETAILER));

  // ---------------------------------------------------------------------------
  // Dashboard & Orders
  // ---------------------------------------------------------------------------

  app.get<{ Querystring: { retailer_id?: string }; Reply: RetailerDashboardMetricsDTO }>(
    "/dashboard",
    async (req) => {
      const user = await requireUser(req);
      const retailerId = resolveRetailerId(user, req.query.retailer_id);

      const [orders, bills, invItems] = await Promise.all([
        prisma.bulkOrder.findMany({ where: { retailerId } }),
        prisma.invoice.findMany({
          where: { bulkOrder: { retailerId } },
          select: { totalAmountPaise: true, paidAmountPaise: true, status: true },
        }),
        prisma.inventoryItem.findMany({ where: { retailerId, isActive: true } }),
      ]);

      const pending = orders.filter((o) => o.status === ORDER_STATUSES.PENDING).length;
      const packing = orders.filter(
        (o) => o.status === ORDER_STATUSES.ACCEPTED || o.status === ORDER_STATUSES.PACKING
      ).length;
      const billed = orders.filter((o) => o.status === ORDER_STATUSES.BILLED).length;
      const dispatched = orders.filter((o) => o.status === ORDER_STATUSES.DISPATCHED).length;
      const completed = orders.filter((o) => o.status === ORDER_STATUSES.COMPLETED).length;
      const gmv = orders
        .filter((o) => o.status !== ORDER_STATUSES.REJECTED)
        .reduce((acc, o) => acc + o.totalPaise, 0);

      const collected = bills.reduce((acc, b) => acc + b.paidAmountPaise, 0);
      const totalBilled = bills.reduce((acc, b) => acc + b.totalAmountPaise, 0);
      const outstanding = Math.max(0, totalBilled - collected);
      const lowStock = invItems.filter((i) => i.currentStockQty <= i.reorderLevelQty).length;

      return {
        total_orders: orders.length,
        pending_orders: pending,
        packing_orders: packing,
        billed_orders: billed,
        dispatched_orders: dispatched,
        completed_orders: completed,
        gross_order_value_paise: gmv,
        monthly_sales_paise: totalBilled || gmv,
        outstanding_collections_paise: outstanding,
        low_stock_items_count: lowStock,
      };
    }
  );

  app.get<{
    Querystring: { status?: string; page?: string; limit?: string; retailer_id?: string };
    Reply: PaginatedResponseDTO<RetailerOrderSummaryDTO>;
  }>("/orders", async (req) => {
    const user = await requireUser(req);
    const retailerId = resolveRetailerId(user, req.query.retailer_id);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const where: Record<string, unknown> = { retailerId };
    if (req.query.status && req.query.status !== "ALL") {
      where.status = req.query.status;
    }

    const [total, orders] = await Promise.all([
      prisma.bulkOrder.count({ where }),
      prisma.bulkOrder.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          cycle: true,
          community: true,
        },
      }),
    ]);

    const cycleIds = orders.map((o) => o.cycleId);
    const participantCounts = await prisma.communityCartItem.groupBy({
      by: ["cycleId", "userId"],
      where: { cycleId: { in: cycleIds } },
    });
    const hhByCycle = new Map<string, number>();
    for (const row of participantCounts) {
      hhByCycle.set(row.cycleId, (hhByCycle.get(row.cycleId) ?? 0) + 1);
    }

    return {
      data: orders.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        cycle_id: o.cycleId,
        cycle_month: o.cycle.cycleMonth,
        community_id: o.communityId,
        community_name: o.community.name,
        retailer_id: o.retailerId,
        status: o.status as OrderStatus,
        total_requested_items: o.totalRequestedItems,
        total_packed_items: o.totalPackedItems,
        subtotal_paise: o.subtotalPaise,
        discount_paise: o.discountPaise,
        delivery_fee_paise: o.deliveryFeePaise,
        total_paise: o.totalPaise,
        placed_at: o.placedAt.toISOString(),
        locked_at: o.lockedAt?.toISOString() ?? null,
        dispatched_at: o.dispatchedAt?.toISOString() ?? null,
        delivered_at: o.deliveredAt?.toISOString() ?? null,
        participating_households_count: hhByCycle.get(o.cycleId) ?? 0,
      })),
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    };
  });

  app.get<{ Params: { orderId: string }; Querystring: { retailer_id?: string }; Reply: RetailerOrderDetailDTO }>(
    "/orders/:orderId",
    async (req) => {
      const user = await requireUser(req);
      const retailerId = resolveRetailerId(user, req.query.retailer_id);

      const order = await prisma.bulkOrder.findUnique({
        where: { id: req.params.orderId },
        include: {
          cycle: true,
          community: true,
          retailerBill: true,
          items: {
            include: {
              variant: {
                include: { product: { include: { category: true } } },
              },
            },
          },
        },
      });
      if (!order) throw new NotFoundError("Order not found.");
      if (user.role !== ROLES.PLATFORM_ADMIN && order.retailerId !== retailerId) {
        throw new ForbiddenError("You do not have access to this order.");
      }

      const distinctUsers = await prisma.communityCartItem.findMany({
        where: { cycleId: order.cycleId },
        distinct: ["userId"],
        select: { userId: true },
      });

      return {
        id: order.id,
        order_number: order.orderNumber,
        cycle_id: order.cycleId,
        cycle_month: order.cycle.cycleMonth,
        community_id: order.communityId,
        community_name: order.community.name,
        retailer_id: order.retailerId,
        status: order.status as OrderStatus,
        total_requested_items: order.totalRequestedItems,
        total_packed_items: order.totalPackedItems,
        subtotal_paise: order.subtotalPaise,
        discount_paise: order.discountPaise,
        delivery_fee_paise: order.deliveryFeePaise,
        total_paise: order.totalPaise,
        placed_at: order.placedAt.toISOString(),
        locked_at: order.lockedAt?.toISOString() ?? null,
        dispatched_at: order.dispatchedAt?.toISOString() ?? null,
        delivered_at: order.deliveredAt?.toISOString() ?? null,
        participating_households_count: distinctUsers.length,
        items: order.items.map((it) => ({
          id: it.id,
          variant_id: it.variantId,
          product_id: it.variant.productId,
          product_title: it.variant.product.title,
          brand: it.variant.product.brand,
          variant_title: it.variant.title,
          variant_sku: it.variant.sku,
          variant_unit: it.variant.unit,
          category_name: it.variant.product.category.name,
          requested_qty: it.requestedQty,
          packed_qty: it.packedQty,
          short_packed_qty: Math.max(0, it.requestedQty - it.packedQty),
          is_unavailable: it.isUnavailable,
          unit_price_paise: it.unitPricePaise,
          subtotal_paise: it.subtotalPaise,
        })),
        retailer_bill: order.retailerBill
          ? {
              id: order.retailerBill.id,
              bulk_order_id: order.retailerBill.bulkOrderId,
              retailer_id: order.retailerBill.retailerId,
              community_id: order.retailerBill.communityId,
              bill_number: order.retailerBill.billNumber,
              gross_amount_paise: order.retailerBill.grossAmountPaise,
              discount_amount_paise: order.retailerBill.discountAmountPaise,
              delivery_amount_paise: order.retailerBill.deliveryAmountPaise,
              net_amount_paise: order.retailerBill.netAmountPaise,
              status: order.retailerBill.status,
              issued_at: order.retailerBill.issuedAt.toISOString(),
              finalized_at: order.retailerBill.finalizedAt?.toISOString() ?? null,
            }
          : null,
      };
    }
  );

  app.post<{ Params: { orderId: string } }>("/orders/:orderId/accept", async (req) => {
    const user = await requireUser(req);
    const retailerId = resolveRetailerId(user);

    return prisma.$transaction(async (tx) => {
      const order = await tx.bulkOrder.findUnique({ where: { id: req.params.orderId } });
      if (!order) throw new NotFoundError("Order not found.");
      if (user.role !== ROLES.PLATFORM_ADMIN && order.retailerId !== retailerId) {
        throw new ForbiddenError("Access denied.");
      }
      if (order.status !== ORDER_STATUSES.PENDING) {
        throw new ConflictError(`Order in state ${order.status} cannot be accepted.`);
      }

      const updated = await tx.bulkOrder.update({
        where: { id: order.id },
        data: { status: ORDER_STATUSES.ACCEPTED },
      });

      await recordOutboxEvent(tx, OUTBOX_EVENTS.ORDER_ACCEPTED, {
        bulk_order_id: order.id,
        community_id: order.communityId,
        retailer_id: order.retailerId,
      });
      await recordAuditLog(tx, {
        userId: user.id,
        action: "ORDER_ACCEPTED",
        entityType: "BulkOrder",
        entityId: order.id,
      });

      return { id: updated.id, status: updated.status, message: "Order accepted for packing." };
    });
  });

  app.post<{ Params: { orderId: string }; Body: z.infer<typeof rejectSchema> }>(
    "/orders/:orderId/reject",
    async (req) => {
      const user = await requireUser(req);
      const retailerId = resolveRetailerId(user);
      const body = rejectSchema.parse(req.body);

      return prisma.$transaction(async (tx) => {
        const order = await tx.bulkOrder.findUnique({ where: { id: req.params.orderId } });
        if (!order) throw new NotFoundError("Order not found.");
        if (user.role !== ROLES.PLATFORM_ADMIN && order.retailerId !== retailerId) {
          throw new ForbiddenError("Access denied.");
        }
        if (order.status !== ORDER_STATUSES.PENDING) {
          throw new ConflictError(`Order in state ${order.status} cannot be rejected.`);
        }

        const updated = await tx.bulkOrder.update({
          where: { id: order.id },
          data: { status: ORDER_STATUSES.REJECTED },
        });
        await recordAuditLog(tx, {
          userId: user.id,
          action: "ORDER_REJECTED",
          entityType: "BulkOrder",
          entityId: order.id,
          payloadAfter: { reason: body.reason },
        });

        return { id: updated.id, status: updated.status, reason: body.reason };
      });
    }
  );

  app.post<{ Params: { orderId: string }; Body: z.infer<typeof packingSchema> }>(
    "/orders/:orderId/packing",
    async (req) => {
      const user = await requireUser(req);
      const retailerId = resolveRetailerId(user);
      const body = packingSchema.parse(req.body);

      return prisma.$transaction(async (tx) => {
        const order = await tx.bulkOrder.findUnique({
          where: { id: req.params.orderId },
          include: { items: true },
        });
        if (!order) throw new NotFoundError("Order not found.");
        if (user.role !== ROLES.PLATFORM_ADMIN && order.retailerId !== retailerId) {
          throw new ForbiddenError("Access denied.");
        }
        if (
          ![ORDER_STATUSES.ACCEPTED, ORDER_STATUSES.PACKING].includes(
            order.status as (typeof ORDER_STATUSES)["ACCEPTED"] | (typeof ORDER_STATUSES)["PACKING"]
          )
        ) {
          throw new ConflictError(`Cannot modify packing when order status is ${order.status}.`);
        }

        const itemMap = new Map(order.items.map((i) => [i.variantId, i]));

        for (const upd of body.items) {
          const line = itemMap.get(upd.variant_id);
          if (!line) throw new BadRequestError(`Variant ${upd.variant_id} is not in this order.`);

          const targetPacked = upd.is_unavailable ? 0 : upd.packed_qty;
          if (targetPacked > line.requestedQty) {
            throw new BadRequestError(
              `Packed quantity (${targetPacked}) cannot exceed requested quantity (${line.requestedQty}).`,
              "PACKED_EXCEEDS_REQUESTED"
            );
          }

          const delta = targetPacked - line.packedQty;
          if (delta !== 0) {
            const inv = await tx.inventoryItem.findUnique({
              where: {
                retailerId_variantId: { retailerId: order.retailerId, variantId: line.variantId },
              },
            });
            if (inv) {
              const nextStock = Math.max(0, inv.currentStockQty - delta);
              await tx.inventoryItem.update({
                where: { id: inv.id },
                data: { currentStockQty: nextStock },
              });
              await tx.inventoryMovement.create({
                data: {
                  retailerId: order.retailerId,
                  variantId: line.variantId,
                  movementType: "packed",
                  quantityDelta: -delta,
                  referenceId: order.orderNumber,
                  notes: upd.notes ?? "Packing quantity update",
                },
              });
            }
          }

          await tx.bulkOrderItem.update({
            where: { id: line.id },
            data: {
              packedQty: targetPacked,
              isUnavailable: upd.is_unavailable || targetPacked === 0,
              subtotalPaise: targetPacked * line.unitPricePaise,
            },
          });

          await tx.retailerPackingItem.create({
            data: {
              bulkOrderItemId: line.id,
              packedQty: targetPacked,
              notes: upd.notes ?? (upd.is_unavailable ? "Marked unavailable" : null),
            },
          });
        }

        const refreshedItems = await tx.bulkOrderItem.findMany({ where: { bulkOrderId: order.id } });
        const totalPacked = refreshedItems.reduce((a, i) => a + i.packedQty, 0);
        const subtotal = refreshedItems.reduce((a, i) => a + i.subtotalPaise, 0);

        const updatedOrder = await tx.bulkOrder.update({
          where: { id: order.id },
          data: {
            status: ORDER_STATUSES.PACKING,
            totalPackedItems: totalPacked,
            subtotalPaise: subtotal,
            totalPaise: subtotal - order.discountPaise + order.deliveryFeePaise,
          },
        });

        await recordOutboxEvent(tx, OUTBOX_EVENTS.ORDER_PACKED, {
          bulk_order_id: order.id,
          total_packed_items: totalPacked,
        });
        await recordAuditLog(tx, {
          userId: user.id,
          action: "ORDER_PACKING_UPDATED",
          entityType: "BulkOrder",
          entityId: order.id,
          payloadAfter: { total_packed_items: totalPacked, subtotal_paise: subtotal },
        });

        return {
          order_id: updatedOrder.id,
          status: updatedOrder.status,
          total_packed_items: updatedOrder.totalPackedItems,
          subtotal_paise: updatedOrder.subtotalPaise,
        };
      });
    }
  );

  app.get<{
    Params: { orderId: string };
    Querystring: {
      delivery_fee_paise?: string;
      order_discount_paise?: string;
      delivery_allocation_mode?: "EQUAL" | "PRO_RATA";
      retailer_id?: string;
    };
  }>("/orders/:orderId/bill-preview", async (req) => {
    const user = await requireUser(req);
    const retailerId = resolveRetailerId(user, req.query.retailer_id);

    const order = await prisma.bulkOrder.findUnique({
      where: { id: req.params.orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError("Order not found.");
    if (user.role !== ROLES.PLATFORM_ADMIN && order.retailerId !== retailerId) {
      throw new ForbiddenError("Access denied.");
    }

    const cartRows = await prisma.communityCartItem.findMany({
      where: { cycleId: order.cycleId },
    });

    const deliveryFee =
      req.query.delivery_fee_paise !== undefined
        ? Number(req.query.delivery_fee_paise)
        : order.deliveryFeePaise;
    const orderDiscount = Number(req.query.order_discount_paise ?? order.discountPaise);
    const mode = req.query.delivery_allocation_mode ?? "EQUAL";

    return calculateF7Billing({
      resident_requests: cartRows.map((c) => ({
        user_id: c.userId,
        variant_id: c.variantId,
        requested_qty: c.quantity,
      })),
      variant_packs: order.items.map((it) => ({
        variant_id: it.variantId,
        packed_qty: it.packedQty,
        unit_price_paise: it.unitPricePaise,
      })),
      delivery_fee_paise: deliveryFee,
      order_discount_paise: orderDiscount,
      delivery_allocation_mode: mode,
    });
  });

  app.post<{ Params: { orderId: string }; Body: z.infer<typeof sendBillSchema> }>(
    "/orders/:orderId/send-bill",
    async (req) => {
      const user = await requireUser(req);
      const retailerId = resolveRetailerId(user);
      const body = sendBillSchema.parse(req.body ?? {});

      return prisma.$transaction(async (tx) => {
        const order = await tx.bulkOrder.findUnique({
          where: { id: req.params.orderId },
          include: { items: true, retailerBill: true, cycle: true },
        });
        if (!order) throw new NotFoundError("Order not found.");
        if (user.role !== ROLES.PLATFORM_ADMIN && order.retailerId !== retailerId) {
          throw new ForbiddenError("Access denied.");
        }

        // Idempotent if already billed
        if (order.retailerBill) {
          return {
            message: "Bill already finalized.",
            bulk_order_id: order.id,
            bill_id: order.retailerBill.id,
            net_amount_paise: order.retailerBill.netAmountPaise,
          };
        }

        if (
          ![ORDER_STATUSES.ACCEPTED, ORDER_STATUSES.PACKING].includes(
            order.status as (typeof ORDER_STATUSES)["ACCEPTED"] | (typeof ORDER_STATUSES)["PACKING"]
          )
        ) {
          throw new ConflictError(`Order in status ${order.status} cannot be finalized.`);
        }

        const cartRows = await tx.communityCartItem.findMany({ where: { cycleId: order.cycleId } });
        const deliveryFee = body.delivery_fee_paise ?? order.deliveryFeePaise;

        const f7 = calculateF7Billing({
          resident_requests: cartRows.map((c) => ({
            user_id: c.userId,
            variant_id: c.variantId,
            requested_qty: c.quantity,
          })),
          variant_packs: order.items.map((it) => ({
            variant_id: it.variantId,
            packed_qty: it.packedQty,
            unit_price_paise: it.unitPricePaise,
            discount_paise: body.variant_discounts?.[it.variantId] ?? 0,
          })),
          delivery_fee_paise: deliveryFee,
          order_discount_paise: body.order_discount_paise,
          platform_fee_paise: body.platform_fee_paise,
          delivery_allocation_mode: body.delivery_allocation_mode,
        });

        const now = nowUtc();
        const bill = await tx.retailerBill.create({
          data: {
            bulkOrderId: order.id,
            retailerId: order.retailerId,
            communityId: order.communityId,
            billNumber: `BILL-${order.orderNumber}`,
            grossAmountPaise: f7.retailer_bill.gross_amount_paise,
            discountAmountPaise: f7.retailer_bill.discount_amount_paise,
            deliveryAmountPaise: f7.retailer_bill.delivery_amount_paise,
            netAmountPaise: f7.retailer_bill.net_amount_paise,
            status: "finalized",
            issuedAt: now,
            finalizedAt: now,
          },
        });

        // Persist immutable resident invoices + create delivery record + handovers
        const delivery = await tx.delivery.create({
          data: {
            bulkOrderId: order.id,
            communityId: order.communityId,
            status: "scheduled",
          },
        });

        for (let idx = 0; idx < f7.resident_invoices.length; idx++) {
          const rInv = f7.resident_invoices[idx]!;
          const invoiceNumber = `INV-${order.orderNumber}-${String(idx + 1).padStart(3, "0")}`;
          const initialStatus =
            rInv.total_amount_paise === 0 ? INVOICE_STATUSES.PAID : INVOICE_STATUSES.UNPAID;

          const createdInv = await tx.invoice.create({
            data: {
              bulkOrderId: order.id,
              userId: rInv.user_id,
              communityId: order.communityId,
              invoiceNumber,
              baseAmountPaise: rInv.base_amount_paise,
              discountAmountPaise: rInv.discount_amount_paise,
              deliveryFeePaise: rInv.delivery_fee_paise,
              totalAmountPaise: rInv.total_amount_paise,
              paidAmountPaise: 0,
              status: initialStatus,
              paidAt: initialStatus === INVOICE_STATUSES.PAID ? now : null,
              items: {
                create: rInv.items.map((it) => ({
                  variantId: it.variant_id,
                  requestedQty: it.requested_qty,
                  packedQty: it.packed_qty,
                  unitPricePaise: it.unit_price_paise,
                  lineTotalPaise: it.base_cost_paise,
                })),
              },
              discounts:
                rInv.discount_amount_paise > 0
                  ? {
                      create: {
                        discountType: "bulk_order",
                        amountPaise: rInv.discount_amount_paise,
                        description: "Collective bulk discount allocation",
                      },
                    }
                  : undefined,
            },
          });

          await tx.deliveryHandover.create({
            data: {
              deliveryId: delivery.id,
              invoiceId: createdInv.id,
              recipientUserId: rInv.user_id,
              status: "pending",
            },
          });
        }

        await tx.bulkOrder.update({
          where: { id: order.id },
          data: {
            status: ORDER_STATUSES.BILLED,
            subtotalPaise: f7.retailer_bill.gross_amount_paise,
            discountPaise: f7.retailer_bill.discount_amount_paise,
            deliveryFeePaise: f7.retailer_bill.delivery_amount_paise,
            totalPaise: f7.retailer_bill.net_amount_paise,
          },
        });

        await recordOutboxEvent(tx, OUTBOX_EVENTS.BILL_FINALISED, {
          bulk_order_id: order.id,
          bill_id: bill.id,
          community_id: order.communityId,
          invoices_count: f7.resident_invoices.length,
        });
        await recordAuditLog(tx, {
          userId: user.id,
          action: "BILL_FINALIZED",
          entityType: "RetailerBill",
          entityId: bill.id,
          payloadAfter: f7.audit_log as unknown as Record<string, unknown>,
        });

        return {
          message: "Finalized F7 invoices and retailer bill with zero discrepancy.",
          bulk_order_id: order.id,
          bill_id: bill.id,
          invoices_count: f7.resident_invoices.length,
          net_amount_paise: bill.netAmountPaise,
          audit_log: f7.audit_log,
        };
      });
    }
  );

  app.post<{ Params: { orderId: string } }>("/orders/:orderId/dispatch", async (req) => {
    const user = await requireUser(req);
    const retailerId = resolveRetailerId(user);

    return prisma.$transaction(async (tx) => {
      const order = await tx.bulkOrder.findUnique({ where: { id: req.params.orderId } });
      if (!order) throw new NotFoundError("Order not found.");
      if (user.role !== ROLES.PLATFORM_ADMIN && order.retailerId !== retailerId) {
        throw new ForbiddenError("Access denied.");
      }
      if (order.status !== ORDER_STATUSES.BILLED) {
        throw new ConflictError("Order must be BILLED before dispatch.");
      }

      const now = nowUtc();
      await tx.bulkOrder.update({
        where: { id: order.id },
        data: { status: ORDER_STATUSES.DISPATCHED, dispatchedAt: now },
      });

      await tx.delivery.updateMany({
        where: { bulkOrderId: order.id },
        data: { status: "in_transit", dispatchedAt: now },
      });

      await recordOutboxEvent(tx, OUTBOX_EVENTS.DELIVERY_READY, {
        bulk_order_id: order.id,
        community_id: order.communityId,
      });
      await recordAuditLog(tx, {
        userId: user.id,
        action: "ORDER_DISPATCHED",
        entityType: "BulkOrder",
        entityId: order.id,
      });

      return { id: order.id, status: ORDER_STATUSES.DISPATCHED, dispatched_at: now.toISOString() };
    });
  });

  // ---------------------------------------------------------------------------
  // Inventory Management
  // ---------------------------------------------------------------------------

  app.get<{
    Querystring: { low_stock?: string; search?: string; page?: string; limit?: string; retailer_id?: string };
    Reply: PaginatedResponseDTO<InventoryItemDTO>;
  }>("/inventory", async (req) => {
    const user = await requireUser(req);
    const retailerId = resolveRetailerId(user, req.query.retailer_id);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));
    const lowStockOnly = req.query.low_stock === "true";

    const where: Record<string, unknown> = { retailerId };
    if (req.query.search?.trim()) {
      const term = req.query.search.trim();
      where.variant = {
        OR: [
          { sku: { contains: term, mode: "insensitive" } },
          { title: { contains: term, mode: "insensitive" } },
          { product: { title: { contains: term, mode: "insensitive" } } },
        ],
      };
    }

    const allRows = await prisma.inventoryItem.findMany({
      where,
      include: { variant: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const filtered = lowStockOnly
      ? allRows.filter((i) => i.currentStockQty <= i.reorderLevelQty)
      : allRows;

    const total = filtered.length;
    const paged = filtered.slice((page - 1) * limit, page * limit);

    return {
      data: paged.map((i) => ({
        id: i.id,
        retailer_id: i.retailerId,
        variant_id: i.variantId,
        product_title: i.variant.product.title,
        brand: i.variant.product.brand,
        variant_title: i.variant.title,
        sku: i.variant.sku,
        pack_unit: i.variant.unit,
        current_stock_qty: i.currentStockQty,
        reserved_stock_qty: i.reservedStockQty,
        available_stock_qty: Math.max(0, i.currentStockQty - i.reservedStockQty),
        reorder_level_qty: i.reorderLevelQty,
        is_low_stock: i.currentStockQty <= i.reorderLevelQty,
        is_active: i.isActive,
        updated_at: i.updatedAt.toISOString(),
      })),
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    };
  });

  app.post<{ Body: z.infer<typeof inwardSchema>; Querystring: { retailer_id?: string } }>(
    "/inventory/inward",
    async (req) => {
      const user = await requireUser(req);
      const retailerId = resolveRetailerId(user, req.query.retailer_id);
      const body = inwardSchema.parse(req.body);

      return prisma.$transaction(async (tx) => {
        const variant = await tx.productVariant.findUnique({ where: { id: body.variant_id } });
        if (!variant) throw new NotFoundError("Variant not found.");

        const batch = await tx.stockBatch.create({
          data: {
            retailerId,
            variantId: body.variant_id,
            batchNumber: body.batch_number,
            quantity: body.quantity,
            costPricePaise: body.cost_price_paise,
            supplierName: body.supplier_name ?? null,
            expiryDate: body.expiry_date ? new Date(body.expiry_date) : null,
          },
        });

        const existingInv = await tx.inventoryItem.findUnique({
          where: { retailerId_variantId: { retailerId, variantId: body.variant_id } },
        });
        const newStock = (existingInv?.currentStockQty ?? 0) + body.quantity;

        const inv = await tx.inventoryItem.upsert({
          where: { retailerId_variantId: { retailerId, variantId: body.variant_id } },
          update: { currentStockQty: newStock, isActive: newStock > 0 },
          create: {
            retailerId,
            variantId: body.variant_id,
            currentStockQty: newStock,
            reorderLevelQty: 15,
            isActive: true,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            retailerId,
            variantId: body.variant_id,
            movementType: "inward",
            quantityDelta: body.quantity,
            referenceId: body.batch_number,
            notes: body.supplier_name ? `Inward from ${body.supplier_name}` : "Batch inward",
          },
        });

        await recordAuditLog(tx, {
          userId: user.id,
          action: "STOCK_INWARDED",
          entityType: "InventoryItem",
          entityId: inv.id,
          payloadAfter: { batch_id: batch.id, added_qty: body.quantity, new_stock: newStock },
        });

        return {
          batch_id: batch.id,
          variant_id: body.variant_id,
          current_stock_qty: inv.currentStockQty,
        };
      });
    }
  );

  app.patch<{
    Params: { id: string };
    Body: z.infer<typeof adjustInventorySchema>;
    Querystring: { retailer_id?: string };
  }>("/inventory/:id", async (req) => {
    const user = await requireUser(req);
    const retailerId = resolveRetailerId(user, req.query.retailer_id);
    const body = adjustInventorySchema.parse(req.body);

    return prisma.$transaction(async (tx) => {
      const inv = await tx.inventoryItem.findUnique({ where: { id: req.params.id } });
      if (!inv || inv.retailerId !== retailerId) {
        throw new NotFoundError("Inventory record not found.");
      }

      const nextStock = inv.currentStockQty + body.quantity_delta;
      if (nextStock < 0) {
        throw new BadRequestError(
          `Adjustment would result in negative stock (${nextStock}).`,
          "NEGATIVE_STOCK"
        );
      }

      const updated = await tx.inventoryItem.update({
        where: { id: inv.id },
        data: {
          currentStockQty: nextStock,
          reorderLevelQty: body.reorder_level_qty ?? inv.reorderLevelQty,
          isActive: nextStock > 0,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          retailerId,
          variantId: inv.variantId,
          movementType: "adjustment",
          quantityDelta: body.quantity_delta,
          referenceId: "MANUAL_ADJ",
          notes: body.reason,
        },
      });

      await recordAuditLog(tx, {
        userId: user.id,
        action: "INVENTORY_ADJUSTED",
        entityType: "InventoryItem",
        entityId: inv.id,
        payloadAfter: {
          previous_qty: inv.currentStockQty,
          delta: body.quantity_delta,
          new_qty: nextStock,
          reason: body.reason,
        },
      });

      return {
        id: updated.id,
        current_stock_qty: updated.currentStockQty,
        reorder_level_qty: updated.reorderLevelQty,
      };
    });
  });

  app.get<{
    Querystring: { page?: string; limit?: string; retailer_id?: string };
    Reply: PaginatedResponseDTO<InventoryMovementDTO>;
  }>("/inventory/movements", async (req) => {
    const user = await requireUser(req);
    const retailerId = resolveRetailerId(user, req.query.retailer_id);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));

    const [total, rows] = await Promise.all([
      prisma.inventoryMovement.count({ where: { retailerId } }),
      prisma.inventoryMovement.findMany({
        where: { retailerId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { variant: { include: { product: true } } },
      }),
    ]);

    return {
      data: rows.map((m) => ({
        id: m.id,
        variant_id: m.variantId,
        product_title: m.variant.product.title,
        variant_title: m.variant.title,
        sku: m.variant.sku,
        movement_type: m.movementType,
        quantity_delta: m.quantityDelta,
        reference_id: m.referenceId,
        notes: m.notes,
        created_at: m.createdAt.toISOString(),
      })),
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    };
  });
}
