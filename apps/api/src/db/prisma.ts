import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

export const prisma = new PrismaClient({
  log: env.ENVIRONMENT === "development" ? ["warn", "error"] : ["error"],
});

export async function verifyDatabaseReady(): Promise<boolean> {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
