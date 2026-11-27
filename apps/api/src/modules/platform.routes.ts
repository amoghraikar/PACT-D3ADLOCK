import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ROLES,
  type AuditLogDTO,
  type PlatformCommunityDTO,
  type PlatformConfigDTO,
  type PlatformOverviewDTO,
  type PlatformRetailerDTO,
} from "@pact/shared";
import { prisma } from "../db/prisma.js";
import { requireRoles, requireUser } from "../lib/auth.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { recordAuditLog } from "../lib/outbox.js";

const createCommunitySchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(2).max(30),
  address: z.string().trim().min(5),
  city: z.string().trim().default("Bengaluru"),
  postal_code: z.string().trim().min(4).max(20),
});

const createRetailerSchema = z.object({
  owner_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/),
  store_name: z.string().trim().min(2).max(120),
  business_address: z.string().trim().min(5),
  gstin: z.string().trim().max(30).optional(),
});

const mapRetailerSchema = z.object({
  retailer_id: z.string().uuid(),
  community_id: z.string().uuid(),
  delivery_fee_paise: z.number().int().min(0).default(15000),
  is_primary: z.boolean().default(true),
});

const updateConfigSchema = z.object({
  cutoff_day: z.number().int().min(1).max(28),
  cutoff_hour: z.number().int().min(0).max(23),
  cutoff_minute: z.number().int().min(0).max(59),
  reminder_rate_limit_minutes: z.number().int().min(1).max(1440),
});

export async function platformRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRoles(ROLES.PLATFORM_ADMIN));

  app.get<{ Reply: PlatformOverviewDTO }>("/overview", async () => {
    const [commCount, activeCommCount, retCount, userCount, ordersCount, aggOrders, aggInvoices] =
      await Promise.all([
        prisma.community.count(),
        prisma.community.count({ where: { isActive: true } }),
        prisma.retailer.count({ where: { status: "active" } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.bulkOrder.count(),
        prisma.bulkOrder.aggregate({
          where: { status: { not: "REJECTED" } },
          _sum: { totalPaise: true },
        }),
        prisma.invoice.aggregate({
          _sum: { paidAmountPaise: true, totalAmountPaise: true },
        }),
      ]);

    const totalInv = aggInvoices._sum.totalAmountPaise ?? 0;
    const paidInv = aggInvoices._sum.paidAmountPaise ?? 0;

    return {
      communities_count: commCount,
      active_communities_count: activeCommCount,
      retailers_count: retCount,
      users_count: userCount,
      orders_count: ordersCount,
      gmv_paise: aggOrders._sum.totalPaise ?? 0,
      collected_paise: paidInv,
      outstanding_paise: Math.max(0, totalInv - paidInv),
      database_status: "connected",
    };
  });

  app.get<{ Reply: PlatformCommunityDTO[] }>("/communities", async () => {
    const rows = await prisma.community.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: { where: { isActive: true } } } },
        retailerAssociations: {
          where: { isActive: true },
          include: { retailer: true },
          take: 1,
        },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      address: c.address,
      city: c.city,
      postal_code: c.postalCode,
      is_active: c.isActive,
      members_count: c._count.memberships,
      mapped_retailer_name: c.retailerAssociations[0]?.retailer.storeName ?? null,
      created_at: c.createdAt.toISOString(),
    }));
  });

  app.post<{ Body: z.infer<typeof createCommunitySchema>; Reply: PlatformCommunityDTO }>(
    "/communities",
    async (req, reply) => {
      const actor = await requireUser(req);
      const body = createCommunitySchema.parse(req.body);
      const code = body.code.toUpperCase();

      const exists = await prisma.community.findUnique({ where: { code } });
      if (exists) throw new ConflictError(`Community code "${code}" already exists.`);

      const created = await prisma.$transaction(async (tx) => {
        const c = await tx.community.create({
          data: {
            name: body.name,
            code,
            address: body.address,
            city: body.city,
            postalCode: body.postal_code,
            isActive: true,
          },
        });
        await recordAuditLog(tx, {
          userId: actor.id,
          action: "COMMUNITY_CREATED",
          entityType: "Community",
          entityId: c.id,
          payloadAfter: { name: c.name, code: c.code },
        });
        return c;
      });

      reply.code(201);
      return {
        id: created.id,
        name: created.name,
        code: created.code,
        address: created.address,
        city: created.city,
        postal_code: created.postalCode,
        is_active: created.isActive,
        members_count: 0,
        mapped_retailer_name: null,
        created_at: created.createdAt.toISOString(),
      };
    }
  );

  app.get<{ Reply: PlatformRetailerDTO[] }>("/retailers", async () => {
    const rows = await prisma.retailer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        _count: { select: { communityAssociations: { where: { isActive: true } } } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      owner_name: r.user.fullName,
      store_name: r.storeName,
      business_address: r.businessAddress,
      gstin: r.gstin,
      phone: r.phone,
      status: r.status,
      mapped_communities_count: r._count.communityAssociations,
      created_at: r.createdAt.toISOString(),
    }));
  });

  app.post<{ Body: z.infer<typeof createRetailerSchema>; Reply: PlatformRetailerDTO }>(
    "/retailers",
    async (req, reply) => {
      const actor = await requireUser(req);
      const body = createRetailerSchema.parse(req.body);
      const phone = body.phone.startsWith("+") ? body.phone : `+91${body.phone}`;

      const retailerRole = await prisma.role.findUnique({ where: { name: ROLES.RETAILER } });
      if (!retailerRole) throw new Error("Retailer role missing.");

      const created = await prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({ where: { phone } });
        if (user) {
          user = await tx.user.update({
            where: { id: user.id },
            data: { roleId: retailerRole.id, fullName: body.owner_name },
          });
        } else {
          user = await tx.user.create({
            data: {
              phone,
              fullName: body.owner_name,
              roleId: retailerRole.id,
              isActive: true,
            },
          });
        }

        const r = await tx.retailer.create({
          data: {
            userId: user.id,
            storeName: body.store_name,
            businessAddress: body.business_address,
            gstin: body.gstin ?? null,
            phone,
            status: "active",
          },
          include: { user: true },
        });

        await recordAuditLog(tx, {
          userId: actor.id,
          action: "RETAILER_CREATED",
          entityType: "Retailer",
          entityId: r.id,
          payloadAfter: { store_name: r.storeName, phone },
        });
        return r;
      });

      reply.code(201);
      return {
        id: created.id,
        user_id: created.userId,
        owner_name: created.user.fullName,
        store_name: created.storeName,
        business_address: created.businessAddress,
        gstin: created.gstin,
        phone: created.phone,
        status: created.status,
        mapped_communities_count: 0,
        created_at: created.createdAt.toISOString(),
      };
    }
  );

  app.post<{ Body: z.infer<typeof mapRetailerSchema> }>("/retailer-mappings", async (req) => {
    const actor = await requireUser(req);
    const body = mapRetailerSchema.parse(req.body);

    const [ret, comm] = await Promise.all([
      prisma.retailer.findUnique({ where: { id: body.retailer_id } }),
      prisma.community.findUnique({ where: { id: body.community_id } }),
    ]);
    if (!ret || !comm) throw new NotFoundError("Retailer or community not found.");

    const mapping = await prisma.$transaction(async (tx) => {
      if (body.is_primary) {
        await tx.retailerCommunity.updateMany({
          where: { communityId: body.community_id },
          data: { isPrimary: false },
        });
      }
      const m = await tx.retailerCommunity.upsert({
        where: {
          retailerId_communityId: { retailerId: body.retailer_id, communityId: body.community_id },
        },
        update: {
          isPrimary: body.is_primary,
          deliveryFeePaise: body.delivery_fee_paise,
          isActive: true,
        },
        create: {
          retailerId: body.retailer_id,
          communityId: body.community_id,
          isPrimary: body.is_primary,
          deliveryFeePaise: body.delivery_fee_paise,
          isActive: true,
        },
      });
      await recordAuditLog(tx, {
        userId: actor.id,
        action: "RETAILER_MAPPED",
        entityType: "RetailerCommunity",
        entityId: m.id,
        payloadAfter: body,
      });
      return m;
    });

    return {
      mapping_id: mapping.id,
      retailer_id: ret.id,
      retailer_name: ret.storeName,
      community_id: comm.id,
      community_name: comm.name,
      delivery_fee_paise: mapping.deliveryFeePaise,
    };
  });

  app.get("/orders", async () => {
    const orders = await prisma.bulkOrder.findMany({
      orderBy: { placedAt: "desc" },
      take: 50,
      include: { community: true, retailer: true, cycle: true },
    });
    return orders.map((o) => ({
      id: o.id,
      order_number: o.orderNumber,
      cycle_month: o.cycle.cycleMonth,
      community_name: o.community.name,
      retailer_name: o.retailer.storeName,
      status: o.status,
      total_requested_items: o.totalRequestedItems,
      total_packed_items: o.totalPackedItems,
      total_paise: o.totalPaise,
      placed_at: o.placedAt.toISOString(),
    }));
  });

  app.get<{ Reply: PlatformConfigDTO }>("/config", async () => {
    const rows = await prisma.platformConfig.findMany();
    const map = new Map(rows.map((r) => [r.key, Number.parseInt(r.value, 10)]));
    return {
      cutoff_day: map.get("cutoff_day") ?? 22,
      cutoff_hour: map.get("cutoff_hour") ?? 17,
      cutoff_minute: map.get("cutoff_minute") ?? 27,
      reminder_rate_limit_minutes: map.get("reminder_rate_limit_minutes") ?? 60,
    };
  });

  app.put<{ Body: z.infer<typeof updateConfigSchema>; Reply: PlatformConfigDTO }>(
    "/config",
    async (req) => {
      const actor = await requireUser(req);
      const body = updateConfigSchema.parse(req.body);
      const entries: [string, number][] = [
        ["cutoff_day", body.cutoff_day],
        ["cutoff_hour", body.cutoff_hour],
        ["cutoff_minute", body.cutoff_minute],
        ["reminder_rate_limit_minutes", body.reminder_rate_limit_minutes],
      ];

      await prisma.$transaction(async (tx) => {
        for (const [key, val] of entries) {
          await tx.platformConfig.upsert({
            where: { key },
            update: { value: String(val) },
            create: { key, value: String(val) },
          });
        }
        await recordAuditLog(tx, {
          userId: actor.id,
          action: "PLATFORM_CONFIG_UPDATED",
          entityType: "PlatformConfig",
          entityId: "GLOBAL",
          payloadAfter: body,
        });
      });

      return body;
    }
  );

  app.get<{ Querystring: { action?: string; entity_type?: string; limit?: string }; Reply: AuditLogDTO[] }>(
    "/audit-logs",
    async (req) => {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
      const where: Record<string, unknown> = {};
      if (req.query.action) where.action = req.query.action;
      if (req.query.entity_type) where.entityType = req.query.entity_type;

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { user: true },
      });

      return logs.map((l) => ({
        id: l.id,
        user_id: l.userId,
        actor_name: l.user?.fullName ?? null,
        action: l.action,
        entity_type: l.entityType,
        entity_id: l.entityId,
        payload_after: l.payloadAfter,
        created_at: l.createdAt.toISOString(),
      }));
    }
  );
}
