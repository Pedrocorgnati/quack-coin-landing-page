// app/api/cron/billing-retry/route.ts
// POST /api/cron/billing-retry — expires overdue PENDING payments + sends membership renewal reminders.
// Scheduled: 06:00 UTC daily. Requires Authorization: Bearer {CRON_SECRET}.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { UsdcService } from "@/lib/services/usdc.service";
import { MembershipService } from "@/lib/services/membership.service";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";

const RENEWAL_REMINDER_DAYS = 3;

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const runId = randomUUID();
  const start = Date.now();
  console.log(`[cron:billing-retry] run=${runId} started`);

  if (!verifyCronSecret(req.headers.get("authorization"))) {
    console.warn(`[cron:billing-retry] run=${runId} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Cancel overdue PENDING sessions
    const expired = await UsdcService.cancelExpiredPayments();

    // QA-023: send renewal reminder notifications (was only logged before)
    const notified = await MembershipService.notifyExpiringMemberships(RENEWAL_REMINDER_DAYS);

    const elapsed = Date.now() - start;
    console.log(
      `[cron:billing-retry] run=${runId} done elapsed=${elapsed}ms expired=${expired} notified=${notified}`,
    );

    // QA-022: write CronJobLog entry on success
    await prisma.cronJobLog.create({
      data: {
        jobName: "billing-retry",
        status: "success",
        durationMs: elapsed,
        message: `expired=${expired} notified=${notified} run=${runId}`,
      },
    }).catch(() => undefined);

    return NextResponse.json(
      { expired, notified },
      { headers: { "X-Cron-Run-Id": runId } },
    );
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[cron:billing-retry] run=${runId} fatal error elapsed=${elapsed}ms`, err);

    // QA-022: write CronJobLog entry on failure
    await prisma.cronJobLog.create({
      data: {
        jobName: "billing-retry",
        status: "error",
        durationMs: elapsed,
        message: err instanceof Error ? err.message : "Unknown error",
      },
    }).catch(() => undefined);

    throw err;
  }
}
