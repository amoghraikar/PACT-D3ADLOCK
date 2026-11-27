import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { verifyDatabaseReady } from "./db/prisma.js";
import { nowUtc } from "./lib/clock.js";
import { AppError } from "./lib/errors.js";
import { adminRoutes } from "./modules/admin.routes.js";
import { authRoutes } from "./modules/auth.routes.js";
import { billingRoutes, paymentsRoutes } from "./modules/billing-payments.routes.js";
import { cartRoutes, cyclesRoutes } from "./modules/cart.routes.js";
import { catalogueRoutes } from "./modules/catalogue.routes.js";
import { notificationsRoutes } from "./modules/notifications.routes.js";
import { platformRoutes } from "./modules/platform.routes.js";
import { retailerRoutes } from "./modules/retailer.routes.js";
import { voiceRoutes } from "./modules/voice.routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger:
      env.ENVIRONMENT === "test"
        ? false
        : {
            level: env.LOG_LEVEL,
          },
    trustProxy: true,
    genReqId: (req) => String(req.headers["x-request-id"] ?? randomUUID()),
  });

  app.register(cookie);
  app.register(helmet, { contentSecurityPolicy: false });

  const allowedOrigins = new Set([
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...env.EXTRA_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ]);

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        allowedOrigins.has(origin) ||
        /^https:\/\/[\w-]+\.onrender\.com$/i.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin)
      ) {
        return cb(null, true);
      }
      return cb(new Error("Origin not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Razorpay-Signature"],
  });

  app.addHook("onSend", async (req, reply) => {
    reply.header("X-Request-Id", req.id);
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: {
          code: err.code,
          message: err.message,
          details: err.details ?? null,
        },
      });
    }

    if (err instanceof ZodError) {
      return reply.status(422).send({
        error: {
          code: "VALIDATION_ERROR",
          message: err.issues[0]?.message ?? "Invalid request payload",
          details: err.issues,
        },
      });
    }

    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const msg =
      env.ENVIRONMENT === "production" && status >= 500
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Unexpected error";

    return reply.status(status).send({
      error: {
        code: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message: msg,
        details: null,
      },
    });
  });

  // Liveness & Readiness
  app.get("/", async () => ({
    app: "PACT API",
    environment: env.ENVIRONMENT,
    status: "online",
    time_utc: nowUtc().toISOString(),
  }));

  app.get("/health", async () => ({
    status: "healthy",
    service: "pact-api",
    environment: env.ENVIRONMENT,
    timestamp: nowUtc().toISOString(),
  }));

  app.get("/ready", async (_req, reply) => {
    try {
      await verifyDatabaseReady();
      return {
        status: "ready",
        database: "connected",
        environment: env.ENVIRONMENT,
        timestamp: nowUtc().toISOString(),
      };
    } catch {
      return reply.status(503).send({
        status: "not_ready",
        database: "disconnected",
      });
    }
  });

  app.get("/api/v1/health", async () => ({
    status: "healthy",
    version: "v1",
    service: "pact-api",
    environment: env.ENVIRONMENT,
    timestamp: nowUtc().toISOString(),
  }));

  app.get("/api/v1/ready", async (_req, reply) => {
    try {
      await verifyDatabaseReady();
      return {
        status: "ready",
        version: "v1",
        database: "connected",
        environment: env.ENVIRONMENT,
        timestamp: nowUtc().toISOString(),
      };
    } catch {
      return reply.status(503).send({
        status: "not_ready",
        version: "v1",
        database: "disconnected",
      });
    }
  });

  // Domain API v1 Routes
  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(catalogueRoutes, { prefix: "/api/v1/catalogue" });
  app.register(cyclesRoutes, { prefix: "/api/v1/cycles" });
  app.register(cartRoutes, { prefix: "/api/v1/cart" });
  app.register(voiceRoutes, { prefix: "/api/v1/voice" });
  app.register(retailerRoutes, { prefix: "/api/v1/retailer" });
  app.register(billingRoutes, { prefix: "/api/v1/billing" });
  app.register(paymentsRoutes, { prefix: "/api/v1/payments" });
  app.register(adminRoutes, { prefix: "/api/v1/admin" });
  app.register(platformRoutes, { prefix: "/api/v1/platform" });
  app.register(notificationsRoutes, { prefix: "/api/v1/notifications" });

  return app;
}
