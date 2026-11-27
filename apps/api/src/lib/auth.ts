import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ROLES, type RoleName, type UserSummaryDTO } from "@pact/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { nowUtc } from "./clock.js";
import { ForbiddenError, UnauthorizedError } from "./errors.js";

export function hashOtp(phone: string, otp: string): string {
  return createHmac("sha256", env.APP_SECRET).update(`${phone}:${otp}`).digest("hex");
}

export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const random = randomBytes(32).toString("hex");
  const sig = createHmac("sha256", env.APP_SECRET).update(random).digest("hex").slice(0, 16);
  const rawToken = `${random}.${sig}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function verifySignedTokenFormat(rawToken: string): boolean {
  const parts = rawToken.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const expectedSig = createHmac("sha256", env.APP_SECRET).update(parts[0]).digest("hex").slice(0, 16);
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expectedSig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function extractBearerOrCookieToken(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const cookieToken = req.cookies?.[env.SESSION_COOKIE_NAME];
  return cookieToken ? String(cookieToken) : null;
}

export async function loadAuthenticatedUser(req: FastifyRequest): Promise<UserSummaryDTO & { rawUserId: string }> {
  const token = extractBearerOrCookieToken(req);
  if (!token) throw new UnauthorizedError("Missing authentication token");

  if (!verifySignedTokenFormat(token)) {
    throw new UnauthorizedError("Invalid authentication token", "INVALID_TOKEN");
  }

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          role: true,
          memberships: {
            where: { isActive: true },
            include: {
              community: true,
              apartment: true,
            },
          },
          retailerProfile: true,
        },
      },
    },
  });

  if (!session) throw new UnauthorizedError("Session not found", "INVALID_SESSION");
  if (session.revokedAt) throw new UnauthorizedError("Session has been revoked", "SESSION_REVOKED");
  if (session.expiresAt <= nowUtc()) throw new UnauthorizedError("Session expired", "SESSION_EXPIRED");
  if (!session.user.isActive) throw new UnauthorizedError("User account inactive", "USER_INACTIVE");

  const u = session.user;
  return {
    rawUserId: u.id,
    id: u.id,
    phone: u.phone,
    full_name: u.fullName,
    email: u.email,
    language: u.language,
    role: u.role.name as RoleName,
    communities: u.memberships.map((m) => ({
      community_id: m.communityId,
      community_name: m.community.name,
      community_code: m.community.code,
      apartment_id: m.apartmentId,
      unit_number: m.apartment?.unitNumber ?? null,
      role: m.role,
    })),
    retailer: u.retailerProfile
      ? {
          id: u.retailerProfile.id,
          store_name: u.retailerProfile.storeName,
          business_address: u.retailerProfile.businessAddress,
          phone: u.retailerProfile.phone,
          gstin: u.retailerProfile.gstin,
          status: u.retailerProfile.status,
        }
      : null,
  };
}

export async function requireUser(req: FastifyRequest) {
  if (!req.currentUser) {
    req.currentUser = await loadAuthenticatedUser(req);
  }
  return req.currentUser;
}

export function requireRoles(...allowed: RoleName[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const user = await requireUser(req);
    if (user.role === ROLES.PLATFORM_ADMIN) return;
    if (!allowed.includes(user.role)) {
      throw new ForbiddenError(`Requires one of roles: ${allowed.join(", ")}`);
    }
  };
}

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: UserSummaryDTO & { rawUserId: string };
  }
}
