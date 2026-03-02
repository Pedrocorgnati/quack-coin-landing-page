// lib/env.ts — Environment variable validation
// All required vars are validated at module-load time.
// If any required var is missing, the process crashes with a descriptive error.
// Extended in module-17 (TASK-3) to add VAPID, HubSpot, etc.

import { z } from "zod";

const envSchema = z.object({
  // ── Database ────────────────────────────────────────────────
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid MySQL connection string"),

  // ── NextAuth ─────────────────────────────────────────────────
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // ── App ──────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // ── Upstash Redis ────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // ── Resend (email) ───────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  // ── Solana ───────────────────────────────────────────────────
  SOLANA_WEBHOOK_SECRET: z.string().min(8, "SOLANA_WEBHOOK_SECRET must be at least 8 characters"),
  SOLANA_RECIPIENT_ADDRESS: z.string().min(32, "SOLANA_RECIPIENT_ADDRESS must be a valid Solana public key"),
  SOLANA_RPC_URL: z.string().url("SOLANA_RPC_URL must be a valid URL").default("https://api.mainnet-beta.solana.com"),
  USDC_MINT_ADDRESS: z.string().min(32, "USDC_MINT_ADDRESS must be a valid Solana public key").default("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),

  // ── Cron ─────────────────────────────────────────────────────
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters"),

  // ── Admin ─────────────────────────────────────────────────────
  ADMIN_CONFIRM_SECRET: z.string().min(8, "ADMIN_CONFIRM_SECRET must be at least 8 characters"),

  // ── Web Push / VAPID ─────────────────────────────────────────
  // NEXT_PUBLIC_ prefix exposes the public key to the browser (for subscription)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, "NEXT_PUBLIC_VAPID_PUBLIC_KEY is required"),
  VAPID_PRIVATE_KEY: z.string().min(1, "VAPID_PRIVATE_KEY is required"),
  VAPID_SUBJECT: z.string().min(1, "VAPID_SUBJECT must be a mailto: or https: URI"),

  // ── Sentry (optional — error monitoring disabled if absent) ─────
  SENTRY_DSN: z.string().url("SENTRY_DSN must be a valid URL").optional(),

  // ── Affiliate Webhook (optional — webhook disabled if absent) ────
  AFFILIATE_WEBHOOK_SECRET: z.string().optional(),

  // ── HubSpot (optional — feature gracefully disabled if absent) ──
  HUBSPOT_API_KEY: z.string().optional(),
  HUBSPOT_LEADS_LIST_ID: z.string().optional(),

  // ── Optional ─────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${formatted}\n\nCheck your .env file.`);
  }
  return result.data;
}

// Validate at module load — crashes on startup if invalid
export const env = validateEnv();
