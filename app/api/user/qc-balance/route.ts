// app/api/user/qc-balance/route.ts
// GET /api/user/qc-balance — returns user's current QC balance and last earn transaction.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { QcService } from "@/lib/services/qc.service";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [balance, lastEarned] = await Promise.all([
    QcService.getBalance(session.user.id),
    prisma.quackCoinTransaction.findFirst({
      where: { userId: session.user.id, amount: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      select: { amount: true, reason: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    balance,
    lastEarned: lastEarned
      ? {
          amount: lastEarned.amount,
          reason: lastEarned.reason,
          createdAt: lastEarned.createdAt.toISOString(),
        }
      : null,
  });
}
