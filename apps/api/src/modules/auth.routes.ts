import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ROLES,
  type AuthTokenResponseDTO,
  type OtpRequestResponseDTO,
  type UserSummaryDTO,
} from "@pact/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import {
  extractBearerOrCookieToken,
  generateSessionToken,
  hashOtp,
  hashToken,
  requireUser,
} from "../lib/auth.js";
import { nowUtc } from "../lib/clock.js";
import {
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../lib/errors.js";

const requestOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number (e.g. +919999900001)"),
});

const verifyOtpSchema = z.object({
  phone: z.string().trim().min(10).max(16),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
});

const joinCommunitySchema = z.object({
  community_code: z.string().trim().min(2).max(30),
  unit_number: z.string().trim().min(1).max(30),
  full_name: z.string().trim().min(2).max(100).optional(),
});

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\s+/g, "");
  if (!cleaned.startsWith("+") && cleaned.length === 10) return `+91${cleaned}`;
  return cleaned;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: z.infer<typeof requestOtpSchema>; Reply: OtpRequestResponseDTO }>(
    "/request-otp",
    async (req) => {
      const body = requestOtpSchema.parse(req.body);
      const phone = normalizePhone(body.phone);
      const now = nowUtc();

      // Cooldown check (60s) & hourly limit (5)
      const oneMinAgo = new Date(now.getTime() - 60_000);
      const recentCooldown = await prisma.otpVerification.findFirst({
        where: { phone, createdAt: { gt: oneMinAgo } },
      });
      if (recentCooldown) {
        throw new TooManyRequestsError("Please wait 60 seconds before requesting another OTP.");
      }

      const oneHourAgo = new Date(now.getTime() - 3_600_000);
      const hourlyCount = await prisma.otpVerification.count({
        where: { phone, createdAt: { gt: oneHourAgo } },
      });
      if (hourlyCount >= 5) {
        throw new TooManyRequestsError("Hourly OTP limit reached. Try again later.");
      }

      const otpCode =
        env.OTP_MODE === "dev"
          ? env.DEV_OTP
          : String(Math.floor(100000 + Math.random() * 900000));

      await prisma.otpVerification.create({
        data: {
          phone,
          otpHash: hashOtp(phone, otpCode),
          attempts: 0,
          isUsed: false,
          expiresAt: new Date(now.getTime() + 600_000),
        },
      });

      const response: OtpRequestResponseDTO = {
        message: "Verification OTP sent.",
        expires_in_seconds: 600,
      };
      if (env.OTP_MODE === "dev") {
        response.dev_otp = otpCode;
      }
      return response;
    }
  );

  app.post<{ Body: z.infer<typeof verifyOtpSchema>; Reply: AuthTokenResponseDTO }>(
    "/verify-otp",
    async (req, reply) => {
      const body = verifyOtpSchema.parse(req.body);
      const phone = normalizePhone(body.phone);
      const now = nowUtc();

      const record = await prisma.otpVerification.findFirst({
        where: { phone, isUsed: false },
        orderBy: { createdAt: "desc" },
      });

      if (!record) throw new UnauthorizedError("No pending OTP found for this phone.", "OTP_MISSING");
      if (record.expiresAt <= now) {
        await prisma.otpVerification.update({ where: { id: record.id }, data: { isUsed: true } });
        throw new UnauthorizedError("OTP has expired.", "OTP_EXPIRED");
      }
      if (record.attempts >= 3) {
        throw new UnauthorizedError("Maximum OTP attempts reached. Request a new code.", "OTP_LOCKED");
      }

      const submittedHash = Buffer.from(hashOtp(phone, body.otp));
      const storedHash = Buffer.from(record.otpHash);
      const matches =
        submittedHash.length === storedHash.length && timingSafeEqual(submittedHash, storedHash);

      if (!matches) {
        const nextAttempts = record.attempts + 1;
        await prisma.otpVerification.update({
          where: { id: record.id },
          data: { attempts: nextAttempts, isUsed: nextAttempts >= 3 },
        });
        const remaining = 3 - nextAttempts;
        throw new UnauthorizedError(
          remaining > 0
            ? `Invalid OTP (${remaining} attempt(s) remaining).`
            : "Maximum attempts reached.",
          "INVALID_OTP"
        );
      }

      await prisma.otpVerification.update({ where: { id: record.id }, data: { isUsed: true } });

      // Find or create strictly as customer
      let user = await prisma.user.findUnique({
        where: { phone },
        include: {
          role: true,
          memberships: { where: { isActive: true }, include: { community: true, apartment: true } },
          retailerProfile: true,
        },
      });

      if (!user) {
        const customerRole = await prisma.role.findUnique({ where: { name: ROLES.CUSTOMER } });
        if (!customerRole) throw new Error("Customer role missing in database.");
        user = await prisma.user.create({
          data: {
            phone,
            fullName: `Resident ${phone.slice(-4)}`,
            roleId: customerRole.id,
            language: "en",
            isActive: true,
          },
          include: {
            role: true,
            memberships: { where: { isActive: true }, include: { community: true, apartment: true } },
            retailerProfile: true,
          },
        });
      }

      const { rawToken, tokenHash } = generateSessionToken();
      await prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"]?.slice(0, 250) ?? null,
          expiresAt: new Date(now.getTime() + env.SESSION_MAX_AGE_DAYS * 86_400_000),
        },
      });

      const isProd = env.ENVIRONMENT === "production";
      reply.setCookie(env.SESSION_COOKIE_NAME, rawToken, {
        httpOnly: true,
        secure: env.SESSION_COOKIE_SECURE || isProd,
        sameSite: isProd ? "none" : env.SESSION_COOKIE_SAMESITE,
        maxAge: env.SESSION_MAX_AGE_DAYS * 86_400,
        path: "/",
      });

      const summary: UserSummaryDTO = {
        id: user.id,
        phone: user.phone,
        full_name: user.fullName,
        email: user.email,
        language: user.language,
        role: user.role.name as UserSummaryDTO["role"],
        communities: user.memberships.map((m) => ({
          community_id: m.communityId,
          community_name: m.community.name,
          community_code: m.community.code,
          apartment_id: m.apartmentId,
          unit_number: m.apartment?.unitNumber ?? null,
          role: m.role,
        })),
        retailer: user.retailerProfile
          ? {
              id: user.retailerProfile.id,
              store_name: user.retailerProfile.storeName,
              business_address: user.retailerProfile.businessAddress,
              phone: user.retailerProfile.phone,
              gstin: user.retailerProfile.gstin,
              status: user.retailerProfile.status,
            }
          : null,
      };

      return {
        access_token: rawToken,
        token_type: "bearer",
        user: summary,
      };
    }
  );

  app.get("/me", async (req) => {
    const user = await requireUser(req);
    const { rawUserId: _, ...dto } = user;
    return dto;
  });

  app.post<{ Body: z.infer<typeof joinCommunitySchema> }>("/join-community", async (req) => {
    const user = await requireUser(req);
    const body = joinCommunitySchema.parse(req.body);
    const code = body.community_code.toUpperCase();

    const community = await prisma.community.findFirst({
      where: { code, isActive: true },
    });
    if (!community) {
      throw new NotFoundError(`Community invite code "${code}" not found.`);
    }

    await prisma.$transaction(async (tx) => {
      if (body.full_name) {
        await tx.user.update({
          where: { id: user.id },
          data: { fullName: body.full_name },
        });
      }

      let apartment = await tx.apartment.findUnique({
        where: {
          communityId_unitNumber: { communityId: community.id, unitNumber: body.unit_number },
        },
      });
      if (!apartment) {
        apartment = await tx.apartment.create({
          data: {
            communityId: community.id,
            unitNumber: body.unit_number,
          },
        });
      }

      await tx.communityMembership.upsert({
        where: {
          communityId_userId: { communityId: community.id, userId: user.id },
        },
        update: {
          apartmentId: apartment.id,
          isActive: true,
        },
        create: {
          communityId: community.id,
          userId: user.id,
          apartmentId: apartment.id,
          role: "resident",
          isActive: true,
        },
      });
    });

    // Reload clean profile
    req.currentUser = undefined;
    const updated = await requireUser(req);
    const { rawUserId: _, ...dto } = updated;
    return dto;
  });

  app.post("/logout", async (req, reply) => {
    const token = extractBearerOrCookieToken(req);
    if (token) {
      await prisma.userSession.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: nowUtc() },
      });
    }
    reply.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
    return { message: "Logged out successfully." };
  });
}
