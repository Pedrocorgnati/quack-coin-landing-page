// app/api/webhooks/solana/route.ts
// POST /api/webhooks/solana — receive Solana payment webhook.
// Validates HMAC-SHA256 signature, verifies on-chain, upgrades membership.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { SolanaClient } from "@/lib/solana/client";
import { QcService } from "@/lib/services/qc.service";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { resend, FROM_ADDRESS } from "@/lib/email/mailer";
import { MembershipConfirmedEmail } from "@/lib/email/membershipConfirmed.template";
import type { MembershipTier } from "@/lib/generated/prisma/client";
import * as React from "react";

const payloadSchema = z.object({
  signature: z.string().min(1),
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  from: z.string().min(1),
});

const MEMBERSHIP_UPGRADE_BONUS: Record<MembershipTier, number> = {
  FREE: 0,
  SILVER: 100,
  GOLD: 250,
  PLATINUM: 500,
};

// TIER_MONTHS removed — months are now read from session.months (persisted at payment creation)

export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text();

  // 1. Validate HMAC signature
  const signature = req.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const expectedSig = createHmac("sha256", env.SOLANA_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse payload
  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { signature: txSignature, paymentId, amount } = parsed.data;

  // 3. Lookup payment session
  const session = await prisma.solanaPaymentSession.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!session || session.status !== "PENDING") {
    // Idempotent — already processed or unknown
    return NextResponse.json({ ok: true });
  }

  // 4. On-chain verification
  const verified = await SolanaClient.verifyUsdcTransfer(
    txSignature,
    parseFloat(session.amountUsdc),
    env.SOLANA_RECIPIENT_ADDRESS,
  );

  if (!verified) {
    await prisma.solanaPaymentSession.update({
      where: { id: paymentId },
      data: { status: "FAILED" },
    });
    await redis.set(`payment:${paymentId}`, { status: "FAILED" }, { ex: 300 });
    return NextResponse.json(
      { error: "On-chain verification failed" },
      { status: 400 },
    );
  }

  // 5. Duplicate delivery check — if txSignature already used
  const existingConfirmed = await prisma.solanaPaymentSession.findFirst({
    where: { txSignature, status: "CONFIRMED" },
  });
  if (existingConfirmed) {
    return NextResponse.json({ ok: true }); // idempotent
  }

  // 6. Upgrade membership in a transaction
  const tier = (session.purposeId ?? "SILVER") as MembershipTier;
  const months = session.months ?? 1; // QA-011: read persisted months, not hardcoded 1
  const now = new Date();
  const expiresAt = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  const qcBonus = MEMBERSHIP_UPGRADE_BONUS[tier] ?? 0;

  await prisma.$transaction(async (tx) => {
    // Update payment session
    await tx.solanaPaymentSession.update({
      where: { id: paymentId },
      data: {
        status: "CONFIRMED",
        txSignature,
        confirmedAt: now,
      },
    });

    // Update the specific MembershipPayment linked to this session (QA-007: scoped, not broad updateMany)
    if (session.membershipPaymentId) {
      await tx.membershipPayment.update({
        where: { id: session.membershipPaymentId },
        data: {
          status: "CONFIRMED",
          txSignature,
          validFrom: now,
          validUntil: expiresAt,
        },
      });
    } else {
      // Fallback: narrow by userId + tier + PENDING (safer than all PENDING for user)
      await tx.membershipPayment.updateMany({
        where: {
          userId: session.userId,
          tier: tier,
          status: "PENDING",
        },
        data: {
          status: "CONFIRMED",
          txSignature,
          validFrom: now,
          validUntil: expiresAt,
        },
      });
    }

    // Upgrade user tier and expiry
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { membershipExpiresAt: true },
    });

    // Extend if renewing before expiry
    const currentExpiry = user?.membershipExpiresAt ?? now;
    const newExpiry =
      currentExpiry > now
        ? new Date(currentExpiry.getTime() + months * 30 * 24 * 60 * 60 * 1000)
        : expiresAt;

    await tx.user.update({
      where: { id: session.userId },
      data: {
        membershipTier: tier,
        membershipExpiresAt: newExpiry,
      },
    });
  });

  // 7. Write WebhookLog entry (QA-008)
  try {
    await prisma.webhookLog.create({
      data: {
        source: "solana",
        event: "payment.confirmed",
        payload: { paymentId, txSignature, tier, months, userId: session.userId } as object,
        status: "processed",
      },
    });
  } catch {
    // Non-critical — don't fail the webhook if log write fails
  }

  // 8. Update Redis cache
  await redis.set(
    `payment:${paymentId}`,
    { status: "CONFIRMED", tier },
    { ex: 300 },
  );

  // 9. Grant QC bonus
  if (qcBonus > 0) {
    try {
      await QcService.earn(
        session.userId,
        qcBonus,
        `[Membership Bonus] ${tier} upgrade`,
        `membership_bonus:${paymentId}`,
        { referenceId: paymentId, referenceType: "membership_bonus" },
      );
    } catch {
      // Non-critical: don't fail the webhook if QC bonus fails
    }
  }

  // 10. Send confirmation email
  try {
    const qcMultiplierKey = `membership.${tier.toLowerCase()}.qc_multiplier`;
    const multiplierStr = await SiteConfigService.get(qcMultiplierKey);
    const multiplier = parseFloat(multiplierStr ?? "1.5");

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: session.user.email,
      subject: `QuackCoin ${tier} membership confirmed!`,
      react: React.createElement(MembershipConfirmedEmail, {
        displayName: session.user.name ?? session.user.email.split("@")[0] ?? session.user.email,
        tier,
        expiresAt,
        txSignature,
        qcBonus,
      }),
    });
  } catch {
    // Non-critical: email failure doesn't fail the webhook
  }

  return NextResponse.json({ ok: true });
}
