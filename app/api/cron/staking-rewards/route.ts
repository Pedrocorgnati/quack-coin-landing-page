// app/api/cron/staking-rewards/route.ts
// POST /api/cron/staking-rewards — daily reward distribution for all active staking positions.
// Scheduled: 00:05 UTC daily. Requires Authorization: Bearer {CRON_SECRET}.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { StakingService } from "@/lib/services/staking.service";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const runId = randomUUID();
  const start = Date.now();
  console.log(`[cron:staking-rewards] run=${runId} started`);

  if (!verifyCronSecret(req.headers.get("authorization"))) {
    console.warn(`[cron:staking-rewards] run=${runId} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await StakingService.distributeAllRewards();
    const elapsed = Date.now() - start;

    console.log(
      `[cron:staking-rewards] run=${runId} done elapsed=${elapsed}ms processed=${result.processed} totalQc=${result.totalQcDistributed} errors=${result.errors.length}`,
    );

    if (result.errors.length > 0) {
      console.error(`[cron:staking-rewards] run=${runId} errors:`, result.errors);
    }

    // QA-022: write CronJobLog entry on success
    await prisma.cronJobLog.create({
      data: {
        jobName: "staking-rewards",
        status: result.errors.length > 0 ? "error" : "success",
        durationMs: elapsed,
        message: `processed=${result.processed} totalQc=${result.totalQcDistributed} errors=${result.errors.length} run=${runId}`,
      },
    }).catch(() => undefined);

    return NextResponse.json(result, {
      headers: { "X-Cron-Run-Id": runId },
    });
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[cron:staking-rewards] run=${runId} fatal error elapsed=${elapsed}ms`, err);

    // QA-022: write CronJobLog entry on failure
    await prisma.cronJobLog.create({
      data: {
        jobName: "staking-rewards",
        status: "error",
        durationMs: elapsed,
        message: err instanceof Error ? err.message : "Unknown error",
      },
    }).catch(() => undefined);

    throw err;
  }
}
