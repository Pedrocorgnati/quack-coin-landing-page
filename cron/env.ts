// cron/env.ts
// Environment validation for the cron scheduler process.
// Only validates the subset of env vars needed by the cron process.
// Crashes on startup with a helpful error message if any required var is missing.

import { z } from "zod";

const cronEnvSchema = z.object({
  // The secret used to authenticate cron HTTP calls to the Next.js API
  CRON_SECRET: z.string().min(32, "[ENV ERROR] CRON_SECRET must be at least 32 characters"),

  // Base URL of the Next.js app to call
  NEXT_PUBLIC_APP_URL: z.string().url("[ENV ERROR] NEXT_PUBLIC_APP_URL must be a valid URL"),

  // Runtime environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type CronEnv = z.infer<typeof cronEnvSchema>;

export function parseCronEnv(): CronEnv {
  const result = cronEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\n❌ Cron process cannot start — invalid environment:\n${errors}\n`);
    process.exit(1);
  }
  return result.data;
}
