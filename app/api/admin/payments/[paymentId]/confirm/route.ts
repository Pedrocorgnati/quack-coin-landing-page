// app/api/admin/payments/[paymentId]/confirm/route.ts
// POST /api/admin/payments/:paymentId/confirm — manually confirm a PENDING membership payment.
// Requires X-Admin-Password header matching ADMIN_CONFIRM_SECRET (admin override, no on-chain check).

import { NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { MembershipService } from "@/lib/services/membership.service";
import { logAdminAction } from "@/lib/audit/audit-log";
import { env } from "@/lib/env";
import type { MembershipTier } from "@/lib/generated/prisma/client";
import { PaymentStatus } from "@/lib/generated/prisma/client";

const bodySchema = z.object({
  txSignature: z.string().min(44, "txSignature must be a valid Solana transaction signature"),
});

function verifyAdminPassword(provided: string): boolean {
  try {
    const expected = Buffer.from(env.ADMIN_CONFIRM_SECRET, "utf8");
    const actual = Buffer.from(provided, "utf8");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Password re-confirmation via header
  const adminPassword = req.headers.get("X-Admin-Password") ?? "";
  if (!verifyAdminPassword(adminPassword)) {
    return NextResponse.json({ error: "Admin password confirmation failed" }, { status: 403 });
  }

  const { paymentId } = await params;

  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { txSignature } = parsed.data;

  // Find the payment
  const payment = await prisma.membershipPayment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status !== PaymentStatus.PENDING) {
    return NextResponse.json(
      { error: `Payment is already ${payment.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  // Duplicate txSignature guard (across both tables)
  const [dupPayment, dupSession] = await Promise.all([
    prisma.membershipPayment.findFirst({ where: { txSignature } }),
    prisma.solanaPaymentSession.findFirst({ where: { txSignature } }),
  ]);
  if (dupPayment || dupSession) {
    return NextResponse.json(
      { error: "Transaction signature already used" },
      { status: 409 },
    );
  }

  const now = new Date();

  // Atomic update: confirm payment + any matching PENDING session for this user
  await prisma.$transaction(async (tx) => {
    await tx.membershipPayment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        txSignature,
        validFrom: now,
      },
    });

    // Also confirm the pending Solana session for this user (best-effort)
    await tx.solanaPaymentSession.updateMany({
      where: {
        userId: payment.userId,
        status: PaymentStatus.PENDING,
        purpose: "membership",
        purposeId: payment.tier,
      },
      data: { status: PaymentStatus.CONFIRMED, txSignature, confirmedAt: now },
    });
  });

  // Upgrade membership
  await MembershipService.upgrade(payment.userId, payment.tier as MembershipTier, 1);

  // Audit log (QA-009)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;
  await logAdminAction(
    session.user.id,
    "payment.manual_confirm",
    paymentId,
    { txSignature, tier: payment.tier, userId: payment.userId, amountUsdc: payment.amountUsdc },
    "payment",
    ip,
  );

  return NextResponse.json({ ok: true, paymentId, confirmedAt: now.toISOString() });
}
