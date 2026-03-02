// cron/scheduler.ts
// Standalone cron scheduler process — runs separately from the Next.js server.
// Uses node-cron to schedule 5 jobs that call Next.js API cron endpoints.
//
// Start with: npm run cron:start
// Or via PM2: pm2 start ecosystem.config.js --only quackcoin-cron
//
// All times are UTC.

import cron from "node-cron";
import { parseCronEnv } from "./env";
import { callCronEndpoint } from "./http-caller";

// Validate environment before scheduling anything
parseCronEnv();

console.log("[scheduler] QuackCoin Cron Scheduler starting...");
console.log(`[scheduler] App URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
console.log(`[scheduler] NODE_ENV: ${process.env.NODE_ENV}`);

// ── Job definitions ────────────────────────────────────────────────────────
//
// Format: second minute hour dayOfMonth month dayOfWeek
// node-cron uses 6-field cron by default (first field = seconds, optional)

const JOBS = [
  {
    name: "staking-rewards",
    // 00:05 UTC daily
    schedule: "0 5 0 * * *",
    path: "/api/cron/staking-rewards",
  },
  {
    name: "billing-retry",
    // 06:00 UTC daily
    schedule: "0 0 6 * * *",
    path: "/api/cron/billing-retry",
  },
  {
    name: "usdc-reconciliation",
    // 12:00 UTC daily
    schedule: "0 0 12 * * *",
    path: "/api/cron/usdc-reconciliation",
  },
  {
    name: "click-expiry",
    // 03:00 UTC daily
    schedule: "0 0 3 * * *",
    path: "/api/cron/click-expiry",
  },
  {
    name: "raffle-drawing",
    // Every hour at :05
    schedule: "0 5 * * * *",
    path: "/api/cron/raffle-drawing",
  },
] as const;

// ── Schedule all jobs ──────────────────────────────────────────────────────

for (const job of JOBS) {
  cron.schedule(
    job.schedule,
    async () => {
      console.log(`[scheduler] Firing ${job.name} (${new Date().toISOString()})`);
      await callCronEndpoint(job.path);
    },
    {
      timezone: "UTC",
    },
  );

  console.log(`[scheduler] Registered: ${job.name} → ${job.schedule} UTC`);
}

console.log(`[scheduler] All ${JOBS.length} jobs registered. Waiting for scheduled times...`);

// Keep the process alive
process.on("SIGTERM", () => {
  console.log("[scheduler] SIGTERM received — shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[scheduler] SIGINT received — shutting down");
  process.exit(0);
});
