import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CYCLE_STATUSES, ROLES, type VoiceInterpretResponseDTO } from "@pact/shared";
import { prisma } from "../db/prisma.js";
import { requireRoles, requireUser } from "../lib/auth.js";
import { nowUtc } from "../lib/clock.js";
import { ConflictError } from "../lib/errors.js";
import { buildCartResponse, resolveResidentCommunityId } from "./cart.routes.js";
import { getOrCreateCurrentCycle } from "./cycles.service.js";
import { interpretVoiceOrder } from "./voice.engine.js";

const interpretSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  language: z.string().default("en-IN"),
});

const confirmSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1),
  community_id: z.string().uuid().optional(),
});

export async function voiceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRoles(ROLES.CUSTOMER, ROLES.COMMUNITY_ADMIN));

  app.post<{ Body: z.infer<typeof interpretSchema>; Reply: VoiceInterpretResponseDTO }>(
    "/interpret",
    async (req) => {
      await requireUser(req);
      const body = interpretSchema.parse(req.body);
      return interpretVoiceOrder(body.text, body.language);
    }
  );

  app.post<{ Body: z.infer<typeof confirmSchema> }>("/confirm", async (req) => {
    const user = await requireUser(req);
    const body = confirmSchema.parse(req.body);
    const commId = resolveResidentCommunityId(user, body.community_id);
    const cycle = await getOrCreateCurrentCycle(commId);

    if (cycle.status !== CYCLE_STATUSES.OPEN || nowUtc() >= cycle.cutoffAt) {
      throw new ConflictError("Monthly cutoff has passed; cart is locked.", "ORDER_CYCLE_LOCKED");
    }

    await prisma.$transaction(async (tx) => {
      for (const item of body.items) {
        const existing = await tx.communityCartItem.findUnique({
          where: {
            cycleId_userId_variantId: {
              cycleId: cycle.id,
              userId: user.id,
              variantId: item.variant_id,
            },
          },
        });
        await tx.communityCartItem.upsert({
          where: {
            cycleId_userId_variantId: {
              cycleId: cycle.id,
              userId: user.id,
              variantId: item.variant_id,
            },
          },
          update: { quantity: (existing?.quantity ?? 0) + item.quantity },
          create: {
            cycleId: cycle.id,
            communityId: commId,
            userId: user.id,
            variantId: item.variant_id,
            quantity: item.quantity,
            notes: "Added via voice confirmation",
          },
        });
      }
    });

    const updatedCart = await buildCartResponse(user.id, commId);
    return {
      added_count: body.items.length,
      cart_total_paise: updatedCart.personal_total_paise,
      cart: updatedCart,
    };
  });

  app.get("/vocab", async () => {
    return {
      languages: ["en-IN", "hi-IN", "hinglish"],
      units: ["kg", "g", "L", "ml", "pack"],
      sample_phrases: {
        "en-IN": ["2 kg Sona Masoori Rice and 1 litre Amul Milk"],
        hinglish: ["do kilo chawal, aadha kilo cheeni aur ek litre amul doodh"],
        "hi-IN": ["२ किलो चावल और १ लीटर दूध"],
      },
    };
  });
}
