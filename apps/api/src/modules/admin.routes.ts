import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  NOTIFICATION_CHANNELS,
  ORDER_STATUSES,
  OUTBOX_EVENTS,
  ROLES,
  type AdminDashboardMetricsDTO,
  type AdminDeliveryStatusDTO,
  type AdminResidentInvoiceDTO,
  type CycleSummaryDTO,
  type ReminderDeliveryReportDTO,
} from "@pact/shared";
import { prisma } from "../db/prisma.js";
import { requireRoles, requireUser } from "../lib/auth.js";
import { nowUtc } from "../lib/clock.js";
import { ForbiddenError, NotFoundError, TooManyRequestsError } from "../lib/errors.js";
import { recordAuditLog, recordOutboxEvent } from "../lib/outbox.js";
import { formatCycleStatus, getOrCreateCurrentCycle } from "./cycles.service.js";

function resolveAdminCommunityId(
  user: { role: string; communities: { community_id: string }[] },
  explicitId?: string
): string {
  if (user.role === ROLES.PLATFORM_ADMIN && explicitId) return explicitId;
  if (explicitId) {
    if (!user.communities.some((c) => c.community_id === explicitId)) {
      throw new ForbiddenError("You can only administer your assigned community.");
    }
    return explicitId;
  }
  const primary = user.communities[0];
  if (!primary) throw new ForbiddenError("No assigned community found.");
  return primary.community_id;
}

const remindSchema = z.object({
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1).default(["in_app"]),
  custom_message: z.string().trim().max(400).optional(),
});

const confirmHandoverSchema = z.object({
  notes: z.string().trim().max(300).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRoles(ROLES.COMMUNITY_ADMIN));

  app.get<{ Querystring: { community_id?: string } }>("/community", async (req) => {
    const user = await requireUser(req);
    const commId = resolveAdminCommunityId(user, req.query.community_id);

    const community = await prisma.community.findUnique({
      where: { id: commId },
      include: {
        buildings: { include: { _count: { select: { apartments: true } } } },
        _count: { select: { memberships: { where: { isActive: true } }, apartments: true } },
      },
    });
    if (!community) throw new NotFoundError("Community not found.");

    return {
      id: community.id,
      name: community.name,
      code: community.code,
      address: community.address,
      city: community.city,
      postal_code: community.postalCode,
      total_apartments: community._count.apartments,
      registered_households: community._count.memberships,
      buildings: community.buildings.map((b) => ({
        id: b.id,
        name: b.name,
        total_floors: b.totalFloors,
        apartments_count: b._count.apartments,
      })),
    };
  });

  app.get<{ Querystring: { community_id?: string }; Reply: AdminDashboardMetricsDTO }>(
    "/dashboard",
    async (req) => {
      const user = await requireUser(req);
      const commId = resolveAdminCommunityId(user, req.query.community_id);

      const community = await prisma.community.findUnique({ where: { id: commId } });
      if (!community) throw new NotFoundError("Community not found.");

      const cycle = await getOrCreateCurrentCycle(commId);
      const [totalHouseholds, distinctCartUsers, latestOrder] = await Promise.all([
        prisma.communityMembership.count({ where: { communityId: commId, isActive: true } }),
        prisma.communityCartItem.findMany({
          where: { cycleId: cycle.id },
          distinct: ["userId"],
          select: { userId: true },
        }),
        prisma.bulkOrder.findFirst({
          where: { communityId: commId },
          orderBy: { placedAt: "desc" },
          include: {
            invoices: true,
            delivery: { include: { handovers: true } },
          },
        }),
      ]);

      const invoices = latestOrder?.invoices ?? [];
      const totalBilling = invoices.reduce((a, i) => a + i.totalAmountPaise, 0);
      const collected = invoices.reduce((a, i) => a + i.paidAmountPaise, 0);
      const outstanding = Math.max(0, totalBilling - collected);
      const collectionPct = totalBilling > 0 ? Math.round((collected * 100) / totalBilling) : 0;

      const handovers = latestOrder?.delivery?.handovers ?? [];
      const completedDel = handovers.filter((h) => h.status === "handed_over").length;
      const pendingDel = handovers.length - completedDel;

      return {
        community_id: community.id,
        community_name: community.name,
        cycle_month: cycle.cycleMonth,
        total_households: totalHouseholds,
        participating_households: distinctCartUsers.length,
        total_billing_paise: totalBilling,
        amount_collected_paise: collected,
        outstanding_paise: outstanding,
        collection_percentage: collectionPct,
        deliveries_pending: pendingDel,
        deliveries_completed: completedDel,
      };
    }
  );

  app.get<{ Querystring: { community_id?: string }; Reply: CycleSummaryDTO }>(
    "/cycle",
    async (req) => {
      const user = await requireUser(req);
      const commId = resolveAdminCommunityId(user, req.query.community_id);
      const cycle = await getOrCreateCurrentCycle(commId);
      const distinctUsers = await prisma.communityCartItem.findMany({
        where: { cycleId: cycle.id },
        distinct: ["userId"],
        select: { userId: true },
      });
      return formatCycleStatus(cycle, distinctUsers.length);
    }
  );

  app.get<{ Querystring: { status?: string; community_id?: string }; Reply: AdminResidentInvoiceDTO[] }>(
    "/invoices",
    async (req) => {
      const user = await requireUser(req);
      const commId = resolveAdminCommunityId(user, req.query.community_id);

      const invoices = await prisma.invoice.findMany({
        where: { communityId: commId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            include: {
              memberships: { where: { communityId: commId }, include: { apartment: true } },
            },
          },
        },
      });

      const statusFilter = req.query.status?.toLowerCase();
      const filtered = invoices.filter((inv) => {
        if (!statusFilter) return true;
        if (statusFilter === "paid") return inv.status === "paid";
        if (statusFilter === "unpaid") return inv.status !== "paid" && inv.status !== "void";
        return inv.status === statusFilter;
      });

      const userIds = filtered.map((i) => i.userId);
      const reminderLogs = await prisma.auditLog.findMany({
        where: { action: "PAYMENT_REMINDER_SENT", entityId: { in: userIds } },
        orderBy: { createdAt: "desc" },
      });
      const lastReminded = new Map<string, Date>();
      for (const l of reminderLogs) {
        if (!lastReminded.has(l.entityId)) lastReminded.set(l.entityId, l.createdAt);
      }

      return filtered.map((inv) => ({
        invoice_id: inv.id,
        invoice_number: inv.invoiceNumber,
        user_id: inv.userId,
        resident_name: inv.user.fullName,
        phone: inv.user.phone,
        unit_number: inv.user.memberships[0]?.apartment?.unitNumber ?? null,
        total_amount_paise: inv.totalAmountPaise,
        paid_amount_paise: inv.paidAmountPaise,
        outstanding_paise: Math.max(0, inv.totalAmountPaise - inv.paidAmountPaise),
        status: inv.status,
        paid_at: inv.paidAt?.toISOString() ?? null,
        last_reminded_at: lastReminded.get(inv.userId)?.toISOString() ?? null,
      }));
    }
  );

  app.post<{ Params: { invoiceId: string }; Body: z.infer<typeof remindSchema> }>(
    "/invoices/:invoiceId/remind",
    async (req) => {
      const user = await requireUser(req);
      const body = remindSchema.parse(req.body ?? {});

      const inv = await prisma.invoice.findUnique({
        where: { id: req.params.invoiceId },
        include: { user: true },
      });
      if (!inv) throw new NotFoundError("Invoice not found.");
      resolveAdminCommunityId(user, inv.communityId);

      // Enforce configurable rate limit (default 60 minutes per intended recipient)
      const rateCfg = await prisma.platformConfig.findUnique({
        where: { key: "reminder_rate_limit_minutes" },
      });
      const rateMinutes = Number.parseInt(rateCfg?.value ?? "60", 10) || 60;
      const cutoffTime = new Date(nowUtc().getTime() - rateMinutes * 60_000);

      const recentReminder = await prisma.auditLog.findFirst({
        where: {
          action: "PAYMENT_REMINDER_SENT",
          entityId: inv.userId,
          createdAt: { gt: cutoffTime },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recentReminder) {
        throw new TooManyRequestsError(
          `Reminder already sent within the last ${rateMinutes} minutes for this resident.`
        );
      }

      const outstanding = Math.max(0, inv.totalAmountPaise - inv.paidAmountPaise);
      const title = "Payment Reminder: Collective Monthly Order";
      const message =
        body.custom_message ??
        `Dear ${inv.user.fullName}, your invoice ${inv.invoiceNumber} has an outstanding balance of ₹${(outstanding / 100).toFixed(2)}.`;

      const reports: ReminderDeliveryReportDTO[] = [];

      await prisma.$transaction(async (tx) => {
        for (const channel of body.channels) {
          if (channel === "in_app") {
            await tx.notification.create({
              data: {
                userId: inv.userId,
                title,
                message,
                kind: "payment_reminder",
              },
            });
            reports.push({ channel: "in_app", status: "sent" });
          } else {
            // Explicit adapter behavior: never claim sent unless external SMS/WhatsApp provider is configured
            reports.push({
              channel,
              status: "unconfigured",
              reason: `External ${channel.toUpperCase()} provider is not configured in this environment.`,
            });
          }
        }

        await recordAuditLog(tx, {
          userId: user.id,
          action: "PAYMENT_REMINDER_SENT",
          entityType: "User",
          entityId: inv.userId,
          payloadAfter: { invoice_id: inv.id, reports },
        });
      });

      const confirmed = reports.filter((r) => r.status === "sent").map((r) => r.channel);
      return {
        invoice_id: inv.id,
        recipient_name: inv.user.fullName,
        channels_confirmed: confirmed,
        details: reports,
      };
    }
  );

  app.get<{ Querystring: { community_id?: string }; Reply: AdminDeliveryStatusDTO | null }>(
    "/deliveries",
    async (req) => {
      const user = await requireUser(req);
      const commId = resolveAdminCommunityId(user, req.query.community_id);

      const latestOrder = await prisma.bulkOrder.findFirst({
        where: { communityId: commId },
        orderBy: { placedAt: "desc" },
        include: {
          delivery: {
            include: {
              handovers: {
                include: {
                  invoice: true,
                  recipient: {
                    include: {
                      memberships: { where: { communityId: commId }, include: { apartment: true } },
                    },
                  },
                  handedOverBy: true,
                },
                orderBy: { status: "desc" },
              },
            },
          },
        },
      });

      if (!latestOrder?.delivery) {
        return null;
      }

      const d = latestOrder.delivery;
      const completed = d.handovers.filter((h) => h.status === "handed_over").length;

      return {
        delivery_id: d.id,
        bulk_order_id: latestOrder.id,
        order_number: latestOrder.orderNumber,
        status: d.status,
        dispatched_at: d.dispatchedAt?.toISOString() ?? null,
        arrived_at_gate: d.arrivedAtGate?.toISOString() ?? null,
        completed_at: d.completedAt?.toISOString() ?? null,
        total_handovers: d.handovers.length,
        pending_handovers: d.handovers.length - completed,
        completed_handovers: completed,
        handovers: d.handovers.map((h) => ({
          handover_id: h.id,
          delivery_id: h.deliveryId,
          invoice_id: h.invoiceId,
          invoice_number: h.invoice.invoiceNumber,
          recipient_user_id: h.recipientUserId,
          recipient_name: h.recipient.fullName,
          phone: h.recipient.phone,
          unit_number: h.recipient.memberships[0]?.apartment?.unitNumber ?? null,
          invoice_status: h.invoice.status,
          status: h.status as "pending" | "handed_over",
          handover_timestamp: h.handoverTimestamp?.toISOString() ?? null,
          handed_over_by_name: h.handedOverBy?.fullName ?? null,
          notes: h.notes,
        })),
      };
    }
  );

  app.post<{ Params: { handoverId: string }; Body: z.infer<typeof confirmHandoverSchema> }>(
    "/deliveries/handovers/:handoverId/confirm",
    async (req) => {
      const user = await requireUser(req);
      const body = confirmHandoverSchema.parse(req.body ?? {});

      return prisma.$transaction(async (tx) => {
        const h = await tx.deliveryHandover.findUnique({
          where: { id: req.params.handoverId },
          include: { delivery: true },
        });
        if (!h) throw new NotFoundError("Handover record not found.");
        resolveAdminCommunityId(user, h.delivery.communityId);

        const now = nowUtc();
        const updated = await tx.deliveryHandover.update({
          where: { id: h.id },
          data: {
            status: "handed_over",
            handedOverByUserId: user.id,
            handoverTimestamp: now,
            notes: body.notes ?? h.notes,
          },
        });

        // If all handovers for delivery complete, mark Delivery & BulkOrder COMPLETED
        const pendingLeft = await tx.deliveryHandover.count({
          where: { deliveryId: h.deliveryId, status: { not: "handed_over" } },
        });
        if (pendingLeft === 0) {
          await tx.delivery.update({
            where: { id: h.deliveryId },
            data: { status: "delivered", completedAt: now },
          });
          await tx.bulkOrder.update({
            where: { id: h.delivery.bulkOrderId },
            data: { status: ORDER_STATUSES.COMPLETED, deliveredAt: now },
          });
          await recordOutboxEvent(tx, OUTBOX_EVENTS.DELIVERY_COMPLETED, {
            delivery_id: h.deliveryId,
            bulk_order_id: h.delivery.bulkOrderId,
          });
        }

        await recordAuditLog(tx, {
          userId: user.id,
          action: "HANDOVER_CONFIRMED",
          entityType: "DeliveryHandover",
          entityId: h.id,
          payloadAfter: { recipient_user_id: h.recipientUserId, notes: body.notes },
        });

        return {
          handover_id: updated.id,
          status: updated.status,
          handover_timestamp: updated.handoverTimestamp?.toISOString() ?? null,
        };
      });
    }
  );
}
