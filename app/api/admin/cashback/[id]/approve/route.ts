// app/api/admin/cashback/[id]/approve/route.ts
// POST — admin approve (force-claim) a pending cashback transaction.
// Sets claimedAt, calls QcService.earn(), sends QC_EARNED notification.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";
import { BadgeService } from "@/lib/services/badge.service";
import { NotificationService } from "@/lib/services/notification.service";
import { NotificationType } from "@/lib/generated/prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tx = await prisma.cashbackTransaction.findUnique({
    where: { id },
    select: { id: true, userId: true, amountQc: true, claimedAt: true, expiresAt: true },
  });

  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tx.claimedAt) return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  if (tx.expiresAt && tx.expiresAt < new Date()) {
    return NextResponse.json({ error: "Cashback expired" }, { status: 400 });
  }

  // Mark claimed
  await prisma.cashbackTransaction.update({
    where: { id },
    data: { claimedAt: new Date() },
  });

  // Earn QC (QcService manages its own transaction + idempotency)
  await QcService.earn(
    tx.userId,
    tx.amountQc,
    "cashback_approved",
    `cashback:${tx.id}`,
  );

  // Update affiliate link totalEarned
  const cashbackWithLink = await prisma.cashbackTransaction.findUnique({
    where: { id },
    select: { affiliateClick: { select: { affiliateLinkId: true } } },
  });
  if (cashbackWithLink?.affiliateClick?.affiliateLinkId) {
    await prisma.affiliateLink.update({
      where: { id: cashbackWithLink.affiliateClick.affiliateLinkId },
      data: { totalEarned: { increment: tx.amountQc } },
    });
  }

  await NotificationService.send(tx.userId, NotificationType.QC_EARNED, {
    type: NotificationType.QC_EARNED,
    data: { amount: tx.amountQc, reason: "Cashback approved", newBalance: 0 },
  }).catch(() => {});

  // Badge check — first cashback (fire-and-forget)
  void BadgeService.check({ type: "cashback_claimed", userId: tx.userId }).catch(() => {});

  return NextResponse.json({ approved: true });
}
