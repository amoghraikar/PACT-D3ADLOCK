import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CYCLE_STATUSES,
  ROLES,
  type CartResponseDTO,
  type CycleSummaryDTO,
} from "@pact/shared";
import { prisma } from "../db/prisma.js";
import { requireRoles, requireUser } from "../lib/auth.js";
import { nowUtc } from "../lib/clock.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import {
  consolidateCycleIntoOrder,
  formatCycleStatus,
  getOrCreateCurrentCycle,
} from "./cycles.service.js";

const cartItemBodySchema = z.object({
  quantity: z.number().int().min(0).max(500),
  notes: z.string().trim().max(255).optional(),
});

const batchCartBodySchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.string().uuid(),
        quantity: z.number().int().min(0).max(500),
        notes: z.string().trim().max(255).optional(),
      })
    )
    .min(1),
});

export function resolveResidentCommunityId(
  user: { role: string; communities: { community_id: string }[] },
  explicitCommunityId?: string
): string {
  if (user.role === ROLES.PLATFORM_ADMIN && explicitCommunityId) {
    return explicitCommunityId;
  }
  if (explicitCommunityId) {
    const member = user.communities.find((c) => c.community_id === explicitCommunityId);
    if (!member) throw new ForbiddenError("You are not a member of this community.");
    return explicitCommunityId;
  }
  const primary = user.communities[0];
  if (!primary) {
    throw new ForbiddenError(
      "You are not linked to an apartment community yet. Complete onboarding first.",
      "COMMUNITY_REQUIRED"
    );
  }
  return primary.community_id;
}

export async function buildCartResponse(
  userId: string,
  communityId: string
): Promise<CartResponseDTO> {
  const cycle = await getOrCreateCurrentCycle(communityId);

  const allCycleItems = await prisma.communityCartItem.findMany({
    where: { cycleId: cycle.id },
    include: {
      variant: {
        include: {
          product: {
            include: { images: { orderBy: { displayOrder: "asc" } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const participantSet = new Set<string>();
  const aggByVariant = new Map<
    string,
    {
      variant_id: string;
      product_title: string;
      variant_title: string;
      variant_unit: string;
      total_quantity: number;
      unit_price_paise: number;
      estimated_subtotal_paise: number;
    }
  >();

  for (const row of allCycleItems) {
    participantSet.add(row.userId);
    const existing = aggByVariant.get(row.variantId);
    if (existing) {
      existing.total_quantity += row.quantity;
      existing.estimated_subtotal_paise = existing.total_quantity * existing.unit_price_paise;
    } else {
      aggByVariant.set(row.variantId, {
        variant_id: row.variantId,
        product_title: row.variant.product.title,
        variant_title: row.variant.title,
        variant_unit: row.variant.unit,
        total_quantity: row.quantity,
        unit_price_paise: row.variant.defaultPricePaise,
        estimated_subtotal_paise: row.quantity * row.variant.defaultPricePaise,
      });
    }
  }

  const myItems = allCycleItems.filter((i) => i.userId === userId);
  let personalTotalPaise = 0;

  const formattedMyItems = myItems.map((i) => {
    const sub = i.quantity * i.variant.defaultPricePaise;
    personalTotalPaise += sub;
    const primaryImage =
      i.variant.product.images.find((img) => img.isPrimary)?.imageUrl ??
      i.variant.product.images[0]?.imageUrl ??
      null;
    const aggQty = aggByVariant.get(i.variantId)?.total_quantity ?? i.quantity;

    return {
      id: i.id,
      variant_id: i.variantId,
      product_id: i.variant.productId,
      product_title: i.variant.product.title,
      product_brand: i.variant.product.brand,
      variant_title: i.variant.title,
      variant_sku: i.variant.sku,
      variant_unit: i.variant.unit,
      unit_price_paise: i.variant.defaultPricePaise,
      mrp_paise: i.variant.mrpPaise,
      quantity: i.quantity,
      subtotal_paise: sub,
      primary_image_url: primaryImage,
      community_aggregate_qty: aggQty,
      notes: i.notes,
    };
  });

  const poolItems = Array.from(aggByVariant.values()).sort((a, b) =>
    a.product_title.localeCompare(b.product_title)
  );
  const totalUnitsCount = poolItems.reduce((acc, p) => acc + p.total_quantity, 0);
  const estimatedTotalPaise = poolItems.reduce((acc, p) => acc + p.estimated_subtotal_paise, 0);

  return {
    cycle: formatCycleStatus(cycle, participantSet.size),
    items: formattedMyItems,
    personal_total_paise: personalTotalPaise,
    community_summary: {
      total_distinct_items: poolItems.length,
      total_units_count: totalUnitsCount,
      participating_households_count: participantSet.size,
      estimated_total_paise: estimatedTotalPaise,
      pool_items: poolItems,
    },
  };
}

export async function cyclesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { community_id?: string }; Reply: CycleSummaryDTO }>(
    "/current",
    async (req) => {
      const user = await requireUser(req);
      const commId = resolveResidentCommunityId(user, req.query.community_id);
      const cycle = await getOrCreateCurrentCycle(commId);
      const distinctUsers = await prisma.communityCartItem.findMany({
        where: { cycleId: cycle.id },
        distinct: ["userId"],
        select: { userId: true },
      });
      return formatCycleStatus(cycle, distinctUsers.length);
    }
  );

  app.get<{ Params: { id: string }; Reply: CycleSummaryDTO }>("/:id", async (req) => {
    await requireUser(req);
    const cycle = await prisma.shoppingCycle.findUnique({
      where: { id: req.params.id },
      include: { community: true },
    });
    if (!cycle) throw new NotFoundError("Shopping cycle not found.");
    const distinctUsers = await prisma.communityCartItem.findMany({
      where: { cycleId: cycle.id },
      distinct: ["userId"],
      select: { userId: true },
    });
    return formatCycleStatus(cycle, distinctUsers.length);
  });

  app.post<{ Params: { id: string } }>(
    "/:id/consolidate",
    { preHandler: requireRoles(ROLES.COMMUNITY_ADMIN, ROLES.RETAILER) },
    async (req) => {
      const user = await requireUser(req);
      const order = await consolidateCycleIntoOrder(req.params.id, user.id);
      return {
        message: "Bulk order consolidated successfully.",
        bulk_order_id: order.id,
        order_number: order.orderNumber,
      };
    }
  );
}

export async function cartRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRoles(ROLES.CUSTOMER, ROLES.COMMUNITY_ADMIN));

  app.get<{ Querystring: { community_id?: string }; Reply: CartResponseDTO }>("", async (req) => {
    const user = await requireUser(req);
    const commId = resolveResidentCommunityId(user, req.query.community_id);
    return buildCartResponse(user.id, commId);
  });

  app.put<{
    Params: { variantId: string };
    Querystring: { community_id?: string };
    Body: z.infer<typeof cartItemBodySchema>;
    Reply: CartResponseDTO;
  }>("/items/:variantId", async (req) => {
    const user = await requireUser(req);
    const body = cartItemBodySchema.parse(req.body);
    const commId = resolveResidentCommunityId(user, req.query.community_id);
    const cycle = await getOrCreateCurrentCycle(commId);

    if (cycle.status !== CYCLE_STATUSES.OPEN || nowUtc() >= cycle.cutoffAt) {
      throw new ConflictError("Monthly cutoff has passed; cart is locked.", "ORDER_CYCLE_LOCKED");
    }

    const variant = await prisma.productVariant.findUnique({ where: { id: req.params.variantId } });
    if (!variant || !variant.isActive) {
      throw new NotFoundError("Product variant unavailable.");
    }

    if (body.quantity === 0) {
      await prisma.communityCartItem.deleteMany({
        where: { cycleId: cycle.id, userId: user.id, variantId: req.params.variantId },
      });
    } else {
      await prisma.communityCartItem.upsert({
        where: {
          cycleId_userId_variantId: {
            cycleId: cycle.id,
            userId: user.id,
            variantId: req.params.variantId,
          },
        },
        update: { quantity: body.quantity, notes: body.notes ?? null },
        create: {
          cycleId: cycle.id,
          communityId: commId,
          userId: user.id,
          variantId: req.params.variantId,
          quantity: body.quantity,
          notes: body.notes ?? null,
        },
      });
    }

    return buildCartResponse(user.id, commId);
  });

  app.delete<{
    Params: { variantId: string };
    Querystring: { community_id?: string };
    Reply: CartResponseDTO;
  }>("/items/:variantId", async (req) => {
    const user = await requireUser(req);
    const commId = resolveResidentCommunityId(user, req.query.community_id);
    const cycle = await getOrCreateCurrentCycle(commId);

    if (cycle.status !== CYCLE_STATUSES.OPEN || nowUtc() >= cycle.cutoffAt) {
      throw new ConflictError("Monthly cutoff has passed; cart is locked.", "ORDER_CYCLE_LOCKED");
    }

    await prisma.communityCartItem.deleteMany({
      where: { cycleId: cycle.id, userId: user.id, variantId: req.params.variantId },
    });

    return buildCartResponse(user.id, commId);
  });

  app.post<{
    Querystring: { community_id?: string };
    Body: z.infer<typeof batchCartBodySchema>;
    Reply: CartResponseDTO;
  }>("/items:batch", async (req) => {
    const user = await requireUser(req);
    const body = batchCartBodySchema.parse(req.body);
    const commId = resolveResidentCommunityId(user, req.query.community_id);
    const cycle = await getOrCreateCurrentCycle(commId);

    if (cycle.status !== CYCLE_STATUSES.OPEN || nowUtc() >= cycle.cutoffAt) {
      throw new ConflictError("Monthly cutoff has passed; cart is locked.", "ORDER_CYCLE_LOCKED");
    }

    await prisma.$transaction(async (tx) => {
      for (const item of body.items) {
        if (item.quantity === 0) {
          await tx.communityCartItem.deleteMany({
            where: { cycleId: cycle.id, userId: user.id, variantId: item.variant_id },
          });
        } else {
          await tx.communityCartItem.upsert({
            where: {
              cycleId_userId_variantId: {
                cycleId: cycle.id,
                userId: user.id,
                variantId: item.variant_id,
              },
            },
            update: { quantity: item.quantity, notes: item.notes ?? null },
            create: {
              cycleId: cycle.id,
              communityId: commId,
              userId: user.id,
              variantId: item.variant_id,
              quantity: item.quantity,
              notes: item.notes ?? null,
            },
          });
        }
      }
    });

    return buildCartResponse(user.id, commId);
  });
}
