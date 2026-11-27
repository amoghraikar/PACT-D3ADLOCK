import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const rootEnv = resolve(process.cwd(), "../../.env");
const localEnv = resolve(process.cwd(), ".env");
if (existsSync(localEnv)) loadDotenv({ path: localEnv });
else if (existsSync(rootEnv)) loadDotenv({ path: rootEnv });

const envSchema = z.object({
  ENVIRONMENT: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z
    .string()
    .default("postgresql://pactuser:pactpassword@localhost:5432/pact_dev"),
  TEST_DATABASE_URL: z
    .string()
    .default("postgresql://pactuser:pactpassword@localhost:5432/pact_test"),

  APP_SECRET: z.string().min(16).default("pact-dev-secret-key-change-in-production-min32chars"),
  SESSION_COOKIE_NAME: z.string().default("pact_session"),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(7),
  SESSION_COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  SESSION_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  OTP_MODE: z.enum(["dev", "production"]).default("dev"),
  DEV_OTP: z.string().default("123456"),

  FRONTEND_URL: z.string().default("http://localhost:3000"),
  EXTRA_ORIGINS: z.string().default(""),

  BUSINESS_TZ: z.string().default("Asia/Kolkata"),
  CYCLE_CUTOFF_DAY: z.coerce.number().int().min(1).max(28).default(22),
  CYCLE_CUTOFF_HOUR: z.coerce.number().int().min(0).max(23).default(17),
  CYCLE_CUTOFF_MINUTE: z.coerce.number().int().min(0).max(59).default(27),

  PAYMENT_GATEWAY: z.enum(["mock", "razorpay"]).default("mock"),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_pactmock"),
  RAZORPAY_KEY_SECRET: z.string().default("rzp_test_secret_pactmock"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("pact_webhook_secret_dev"),

  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(3000),
});

export const env = envSchema.parse(process.env);
export type AppEnv = typeof env;
