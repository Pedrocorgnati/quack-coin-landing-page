// app/api/cron/usdc-reconciliation/route.ts
// POST /api/cron/usdc-reconciliation — auto-confirms USDC payments found on-chain that missed their webhook.
// Scheduled: 12:00 UTC daily. Requires Authorization: Bearer {CRON_SECRET}.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { UsdcService } from "@/lib/services/usdc.service";
import { SolanaClient } from "@/lib/solana/client";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";
import { PaymentStatus } from "@/lib/generated/prisma/client";

const STALE_HOURS = 24;

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const runId = randomUUID();
  const start = Date.now();
  console.log(`[cron:usdc-reconciliation] run=${runId} started`);

  if (!verifyCronSecret(req.headers.get("authorization"))) {
    console.warn(`[cron:usdc-reconciliation] run=${runId} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

    // Find PENDING sessions older than 24h (webhook may have been missed)
    const pendingSessions = await prisma.solanaPaymentSession.findMany({
      where: {
        status: PaymentStatus.PENDING,
        createdAt: { lt: staleThreshold },
      },
      orderBy: { createdAt: "asc" },
      take: 100, // safety limit per run
    });

    let reconciled = 0;
    let stillPending = 0;

    for (const session of pendingSessions) {
      try {
        // Look up any transaction referencing this payment's reference key
        const txSignature = await SolanaClient.findTransactionByReference(session.reference);

        if (!txSignature) {
          stillPending++;
          continue;
        }

        // Verify the transaction actually transferred the expected amount
        const verified = await SolanaClient.verifyUsdcTransfer(
          txSignature,
          parseFloat(session.amountUsdc),
        );

        if (!verified) {
          console.warn(
            `[cron:usdc-reconciliation] run=${runId} session=${session.id} sig=${txSignature} verification failed`,
          );
          stillPending++;
          continue;
        }

        // Auto-confirm the payment
        await UsdcService.confirmPayment(session.id, txSignature);

        console.log(
          `[cron:usdc-reconciliation] run=${runId} reconciled session=${session.id} sig=${txSignature}`,
        );
        reconciled++;
      } catch (err) {
        console.error(
          `[cron:usdc-reconciliation] run=${runId} session=${session.id} error:`,
          err instanceof Error ? err.message : String(err),
        );
        stillPending++;
      }
    }

    const elapsed = Date.now() - start;
    console.log(
      `[cron:usdc-reconciliation] run=${runId} done elapsed=${elapsed}ms reconciled=${reconciled} stillPending=${stillPending}`,
    );

    return NextResponse.json(
      { reconciled, stillPending },
      { headers: { "X-Cron-Run-Id": runId } },
    );
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(
      `[cron:usdc-reconciliation] run=${runId} fatal error elapsed=${elapsed}ms`,
      err,
    );
    throw err;
  }
}
