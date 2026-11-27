import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  NOTIFICATION_CHANNELS,
  type NotificationItemDTO,
  type NotificationPreferenceDTO,
} from "@pact/shared";
import { prisma } from "../db/prisma.js";
import { requireUser } from "../lib/auth.js";
import { nowUtc } from "../lib/clock.js";
import { NotFoundError } from "../lib/errors.js";

const updatePrefsSchema = z.object({
  preferences: z.array(
    z.object({
      channel: z.enum(NOTIFICATION_CHANNELS),
      enabled: z.boolean(),
    })
  ),
});

export async function notificationsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { unread_only?: string; limit?: string }; Reply: NotificationItemDTO[] }>(
    "",
    async (req) => {
      const user = await requireUser(req);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));
      const rows = await prisma.notification.findMany({
        where: {
          userId: user.id,
          ...(req.query.unread_only === "true" ? { isRead: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return rows.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        kind: n.kind,
        is_read: n.isRead,
        read_at: n.readAt?.toISOString() ?? null,
        created_at: n.createdAt.toISOString(),
      }));
    }
  );

  app.get("/unread-count", async (req) => {
    const user = await requireUser(req);
    const count = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });
    return { unread_count: count };
  });

  app.post<{ Params: { id: string }; Reply: NotificationItemDTO }>("/:id/read", async (req) => {
    const user = await requireUser(req);
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif || notif.userId !== user.id) {
      throw new NotFoundError("Notification not found.");
    }
    const updated = await prisma.notification.update({
      where: { id: notif.id },
      data: { isRead: true, readAt: notif.readAt ?? nowUtc() },
    });
    return {
      id: updated.id,
      title: updated.title,
      message: updated.message,
      kind: updated.kind,
      is_read: updated.isRead,
      read_at: updated.readAt?.toISOString() ?? null,
      created_at: updated.createdAt.toISOString(),
    };
  });

  app.post("/read-all", async (req) => {
    const user = await requireUser(req);
    const res = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: nowUtc() },
    });
    return { marked_read: res.count };
  });

  app.get<{ Reply: NotificationPreferenceDTO[] }>("/preferences", async (req) => {
    const user = await requireUser(req);
    const existing = await prisma.notificationPreference.findMany({ where: { userId: user.id } });
    const map = new Map(existing.map((e) => [e.channel, e.enabled]));
    return NOTIFICATION_CHANNELS.map((channel) => ({
      channel,
      enabled: map.get(channel) ?? channel === "in_app",
    }));
  });

  app.put<{ Body: z.infer<typeof updatePrefsSchema>; Reply: NotificationPreferenceDTO[] }>(
    "/preferences",
    async (req) => {
      const user = await requireUser(req);
      const body = updatePrefsSchema.parse(req.body);
      for (const p of body.preferences) {
        await prisma.notificationPreference.upsert({
          where: { userId_channel: { userId: user.id, channel: p.channel } },
          update: { enabled: p.enabled },
          create: { userId: user.id, channel: p.channel, enabled: p.enabled },
        });
      }
      return body.preferences;
    }
  );
}
