// app/api/payments/create/route.ts
// POST /api/payments/create — create a USDC membership payment session.
// Returns a Solana Pay URL and payment ID for QR generation.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { withRateLimit } from "@/lib/rate-limit";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { buildSolanaPayUrl, generateReference } from "@/lib/solana/pay";
import { MembershipTier } from "@/lib/generated/prisma/client";
import { headers } from "next/headers";

const schema = z.object({
  tier: z.nativeEnum(MembershipTier).refine((t) => t !== MembershipTier.FREE, {
    message: "Cannot purchase FREE tier",
  }),
  months: z.number().int().min(1).max(12).default(1),
});

const PAYMENT_EXPIRY_SECONDS = 30 * 60; // 30 minutes

const TIER_PRICE_KEYS: Record<Exclude<MembershipTier, "FREE">, string> = {
  SILVER: "membership.price.silver",
  GOLD: "membership.price.gold",
  PLATINUM: "membership.price.platinum",
};

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limit: 5 payment initiations per user per 60 seconds
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rlResult = await withRateLimit(`payment_create:${userId}:${ip}`, 5, "60 s");
  if (!rlResult.success) {
    const retryAfter = Math.ceil((rlResult.reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many payment requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter > 0 ? retryAfter : 60),
          "X-RateLimit-Limit": String(rlResult.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { tier, months } = parsed.data;

  // Get tier price from SiteConfig
  const priceKey = TIER_PRICE_KEYS[tier as Exclude<MembershipTier, "FREE">];
  const priceStr = await SiteConfigService.get(priceKey);
  const basePrice = parseFloat(priceStr ?? "9.99");
  const totalAmount = parseFloat((basePrice * months).toFixed(6));

  // Generate reference pubkey for tracking this specific payment
  const reference = generateReference();
  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_SECONDS * 1000);

  // Build Solana Pay URL
  const solanaPayUrl = buildSolanaPayUrl({
    amount: totalAmount,
    label: "QuackCoin",
    message: `${tier} Membership x${months}`,
    memo: reference,
    reference,
  });

  // Create MembershipPayment placeholder first, then link to session
  const payment = await prisma.membershipPayment.create({
    data: {
      userId,
      tier,
      amountUsdc: totalAmount.toFixed(6),
    },
  });

  // Create SolanaPaymentSession in DB (canonical record) — stores months + membershipPaymentId
  const session_ = await prisma.solanaPaymentSession.create({
    data: {
      userId,
      reference,
      amountUsdc: totalAmount.toFixed(6),
      purpose: "membership",
      purposeId: tier,
      months,
      membershipPaymentId: payment.id,
      expiresAt,
    },
  });

  // Cache in Redis with TTL
  await redis.set(
    `payment:${session_.id}`,
    {
      status: "PENDING",
      paymentId: session_.id,
      membershipPaymentId: payment.id,
      userId,
      tier,
      months,
      amountUsdc: totalAmount,
      reference,
      solanaPayUrl,
      expiresAt: expiresAt.toISOString(),
    },
    { ex: PAYMENT_EXPIRY_SECONDS },
  );

  return NextResponse.json({
    paymentId: session_.id,
    solanaPayUrl,
    expiresAt: expiresAt.toISOString(),
    amountUsdc: totalAmount,
    tier,
    months,
  });
}
