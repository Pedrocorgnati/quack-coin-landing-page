// app/api/admin/cron-status/route.ts
// GET /api/admin/cron-status — returns last execution status for all 5 cron jobs.
// Includes: lastRun, status, message, durationMs, nextScheduledRun.
// Cache TTL: 60s.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const CACHE_KEY = "admin:cron:status";
const CACHE_TTL = 60; // seconds

// All 5 registered cron jobs with their UTC schedules
const CRON_JOBS = [
  { name: "staking-rewards",     schedule: "0 5 0 * * *",  label: "Staking Rewards" },
  { name: "billing-retry",       schedule: "0 0 6 * * *",  label: "Billing Retry" },
  { name: "usdc-reconciliation", schedule: "0 0 12 * * *", label: "USDC Reconciliation" },
  { name: "click-expiry",        schedule: "0 0 3 * * *",  label: "Click Expiry" },
  { name: "raffle-drawing",      schedule: "0 5 * * * *",  label: "Raffle Drawing" },
] as const;

/**
 * Roughly calculate the next UTC time a 6-field cron expression will fire.
 * Only handles simple cases (minute/hour fixed patterns).
 */
function nextRunFrom(schedule: string): string {
  const parts = schedule.split(" ");
  // [second, minute, hour, dayOfMonth, month, dayOfWeek]
  const minute = parts[1] ?? "0";
  const hour   = parts[2] ?? "0";
  const now = new Date();
  const next = new Date();
  next.setSeconds(0);
  next.setMilliseconds(0);

  if (hour === "*") {
    // Hourly: next :05
    const min = parseInt(minute, 10);
    next.setMinutes(min);
    if (next <= now) next.setHours(next.getHours() + 1);
  } else {
    // Daily at fixed hour
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    next.setUTCHours(h, m, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.toISOString();
}

interface CronJobStatus {
  name: string;
  label: string;
  schedule: string;
  lastRun: string | null;
  status: "success" | "error" | "skipped" | "never_run";
  message: string | null;
  durationMs: number | null;
  nextScheduledRun: string;
}

export async function GET() {
  await requireAdmin();

  // Check Redis cache
  try {
    const cached = await redis.get<CronJobStatus[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ jobs: cached });
    }
  } catch {
    // Cache unavailable — fall through
  }

  // Fetch last execution per job via GROUP BY equivalent (latest row per jobName)
  const allLogs = await prisma.cronJobLog.findMany({
    where: {
      jobName: { in: CRON_JOBS.map((j) => j.name) },
    },
    orderBy: { runAt: "desc" },
    distinct: ["jobName"],
    select: { jobName: true, status: true, message: true, durationMs: true, runAt: true },
  });

  const logMap = new Map(allLogs.map((l) => [l.jobName, l]));

  const jobs: CronJobStatus[] = CRON_JOBS.map((job) => {
    const log = logMap.get(job.name);
    return {
      name: job.name,
      label: job.label,
      schedule: job.schedule,
      lastRun: log?.runAt?.toISOString() ?? null,
      status: (log?.status as CronJobStatus["status"]) ?? "never_run",
      message: log?.message ?? null,
      durationMs: log?.durationMs ?? null,
      nextScheduledRun: nextRunFrom(job.schedule),
    };
  });

  // Cache result
  try {
    await redis.set(CACHE_KEY, jobs, { ex: CACHE_TTL });
  } catch {
    // Ignore cache write errors
  }

  return NextResponse.json({ jobs });
}
