// app/api/cron/raffle-drawing/route.ts
// POST /api/cron/raffle-drawing — hourly cron: process ACTIVE raffles whose drawAt has passed.
// Scheduled: every hour. Requires Authorization: Bearer {CRON_SECRET}.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { RaffleService } from "@/lib/services/raffle.service";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";
import { RaffleStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const runId = randomUUID();
  const start = Date.now();
  console.log(`[cron:raffle-drawing] run=${runId} started`);

  if (!verifyCronSecret(req.headers.get("authorization"))) {
    console.warn(`[cron:raffle-drawing] run=${runId} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find ACTIVE raffles whose draw time has passed
  const dueRaffles = await prisma.raffle.findMany({
    where: {
      status: RaffleStatus.ACTIVE,
      drawAt: { lte: now },
    },
    select: { id: true },
  });

  const results = { processed: 0, skipped: 0, errors: [] as string[] };

  for (const raffle of dueRaffles) {
    try {
      await RaffleService.startDrawing(raffle.id);
      await RaffleService.drawWinners(raffle.id);
      results.processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron:raffle-drawing] run=${runId} raffleId=${raffle.id} error=${msg}`);
      results.errors.push(`${raffle.id}: ${msg}`);
    }
  }

  const elapsed = Date.now() - start;
  console.log(
    `[cron:raffle-drawing] run=${runId} done elapsed=${elapsed}ms processed=${results.processed} errors=${results.errors.length}`,
  );

  return NextResponse.json({
    runId,
    elapsed,
    dueRaffles: dueRaffles.length,
    ...results,
  });
}
