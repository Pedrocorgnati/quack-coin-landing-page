// cron/http-caller.ts
// Shared HTTP utility for the scheduler process.
// Calls internal cron endpoints with Bearer token authentication.
// Writes CronJobLog records (status=RUNNING before, SUCCESS/FAILURE after).
// Never throws — catches all errors so the scheduler process stays alive.

import { PrismaClient } from "../lib/generated/prisma/client";

// Lazy prisma instance (only created if DATABASE_URL is available)
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({ log: [] });
  }
  return prismaInstance;
}

const JOB_NAME_MAP: Record<string, string> = {
  "/api/cron/staking-rewards":     "staking-rewards",
  "/api/cron/billing-retry":       "billing-retry",
  "/api/cron/usdc-reconciliation": "usdc-reconciliation",
  "/api/cron/click-expiry":        "click-expiry",
  "/api/cron/raffle-drawing":      "raffle-drawing",
};

/**
 * Call a Next.js cron endpoint and log the execution to CronJobLog.
 * @param path - API path, e.g. "/api/cron/staking-rewards"
 */
export async function callCronEndpoint(path: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!appUrl || !cronSecret) {
    console.error(`[cron-caller] Missing NEXT_PUBLIC_APP_URL or CRON_SECRET — skipping ${path}`);
    return;
  }

  const url = `${appUrl}${path}`;
  const jobName = JOB_NAME_MAP[path] ?? path;
  const startedAt = Date.now();
  const prisma = getPrisma();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
        "User-Agent": "QuackCoin-Cron/1.0",
      },
    });

    const body = await res.text();
    const durationMs = Date.now() - startedAt;
    const status = res.ok ? "success" : "error";

    if (res.ok) {
      console.log(`[cron-caller] ${jobName} → ${res.status} (${durationMs}ms) ${body.slice(0, 200)}`);
    } else {
      console.error(`[cron-caller] ${jobName} → ${res.status} FAILED (${durationMs}ms) ${body.slice(0, 500)}`);
    }

    // Write log record
    if (prisma) {
      try {
        await prisma.cronJobLog.create({
          data: {
            jobName,
            status,
            message: res.ok ? body.slice(0, 2000) : `HTTP ${res.status}: ${body.slice(0, 1000)}`,
            durationMs,
          },
        });
      } catch (logErr) {
        console.warn(`[cron-caller] Failed to write CronJobLog for ${jobName}:`, logErr);
      }
    }

    // Check for consecutive failures and notify admins (ST006)
    if (!res.ok && prisma) {
      void checkConsecutiveFailures(prisma, jobName);
    }
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    console.error(`[cron-caller] ${jobName} → NETWORK ERROR (${durationMs}ms)`, err);

    if (prisma) {
      try {
        await prisma.cronJobLog.create({
          data: {
            jobName,
            status: "error",
            message: err instanceof Error ? err.message : String(err),
            durationMs,
          },
        });
      } catch {
        // Ignore secondary logging errors
      }
    }
    // Do NOT re-throw — scheduler must remain running even if one job fails
  }
}

/**
 * If the last 3 executions of a job all failed, notify admins.
 */
async function checkConsecutiveFailures(
  prisma: PrismaClient,
  jobName: string,
): Promise<void> {
  try {
    const recent = await prisma.cronJobLog.findMany({
      where: { jobName },
      orderBy: { runAt: "desc" },
      take: 3,
      select: { status: true },
    });

    if (recent.length < 3) return;
    const allFailed = recent.every((r) => r.status === "error");
    if (!allFailed) return;

    console.error(`[cron-caller] ALERT: ${jobName} failed 3 consecutive times — sending system alert`);

    // Notify via internal API (avoids importing notification service directly)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const cronSecret = process.env.CRON_SECRET;
    if (!appUrl || !cronSecret) return;

    await fetch(`${appUrl}/api/internal/system-alert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "CRON_FAILURE",
        jobName,
        message: `Cron job ${jobName} failed 3× in a row. Check logs.`,
      }),
    }).catch(() => {
      // Silently ignore if alert endpoint fails
    });
  } catch {
    // Never crash the scheduler
  }
}
