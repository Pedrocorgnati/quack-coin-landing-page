// lib/services/usdc.service.ts
// UsdcService — manages USDC payment sessions and membership payment lifecycle.
// Coordinates between SolanaPaymentSession, MembershipPayment, Redis, and MembershipService.

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { MembershipService } from "@/lib/services/membership.service";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { SolanaClient } from "@/lib/solana/client";
import { buildSolanaPayUrl, generateReference } from "@/lib/solana/pay";
import { env } from "@/lib/env";
import { MembershipTier, PaymentStatus } from "@/lib/generated/prisma/client";
import type { SolanaPaymentSession, MembershipPayment } from "@/lib/generated/prisma/client";
import {
  PaymentNotFoundError,
  PaymentAlreadyProcessedError,
  OnChainVerificationError,
} from "@/lib/errors/membership.errors";
import type { PaginationInput } from "@/lib/validations";
import type { PaginatedResult } from "@/lib/types";
import { BadgeService } from "@/lib/services/badge.service";

const SESSION_TTL = 1800; // 30 minutes
const REDIS_PREFIX = "payment:";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface CreatePaymentResult {
  paymentId: string;
  solanaPayUrl: string;
  expiresAt: Date;
  amountUsdc: number;
  tier: MembershipTier;
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────

export const UsdcService = {
  /**
   * Create a new payment session for a membership upgrade.
   * Returns a Solana Pay URL + session metadata for QR code display.
   */
  async createPayment(
    userId: string,
    tier: MembershipTier,
    months = 1,
  ): Promise<CreatePaymentResult> {
    // Read price from SiteConfig
    const priceKey = `membership.price.${tier.toLowerCase()}`;
    // QA-018: use a safe non-zero fallback; misconfigured prices should never resolve to $0
    const priceStr = await SiteConfigService.getOrDefault(priceKey, "9.99");
    const pricePerMonth = parseFloat(priceStr);
    const totalAmount = parseFloat((pricePerMonth * months).toFixed(6));

    const reference = generateReference();
    const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

    const solanaPayUrl = buildSolanaPayUrl({
      recipient: env.SOLANA_RECIPIENT_ADDRESS,
      amount: totalAmount,
      splToken: env.USDC_MINT_ADDRESS,
      label: "QuackCoin Membership",
      message: `${tier} membership x${months}`,
      memo: userId,
      reference,
    });

    // Create session and pending payment atomically
    const session = await prisma.$transaction(async (tx) => {
      const sess = await tx.solanaPaymentSession.create({
        data: {
          userId,
          reference,
          amountUsdc: String(totalAmount),
          purpose: "membership",
          purposeId: tier,
          expiresAt,
        },
      });

      await tx.membershipPayment.create({
        data: {
          userId,
          tier,
          amountUsdc: String(totalAmount),
          status: PaymentStatus.PENDING,
        },
      });

      return sess;
    });

    // Cache in Redis
    await redis
      .set(
        `${REDIS_PREFIX}${session.id}`,
        {
          status: "PENDING",
          tier,
          solanaPayUrl,
          amountUsdc: totalAmount,
          expiresAt: expiresAt.toISOString(),
        },
        { ex: SESSION_TTL },
      )
      .catch(() => undefined); // non-fatal

    return {
      paymentId: session.id,
      solanaPayUrl,
      expiresAt,
      amountUsdc: totalAmount,
      tier,
    };
  },

  /**
   * Confirm a payment after receiving a verified Solana webhook.
   * Throws if the payment is not found, already processed, or fails on-chain verification.
   */
  async confirmPayment(paymentId: string, txSignature: string): Promise<void> {
    const session = await prisma.solanaPaymentSession.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!session) throw new PaymentNotFoundError(paymentId);
    if (session.status !== PaymentStatus.PENDING) throw new PaymentAlreadyProcessedError(paymentId);

    // Duplicate txSignature guard
    const existingConfirmed = await prisma.solanaPaymentSession.findFirst({
      where: { txSignature, status: PaymentStatus.CONFIRMED },
    });
    if (existingConfirmed) throw new PaymentAlreadyProcessedError(paymentId);

    // On-chain verification
    const verified = await SolanaClient.verifyUsdcTransfer(
      txSignature,
      parseFloat(session.amountUsdc),
      env.SOLANA_RECIPIENT_ADDRESS,
    );
    if (!verified) throw new OnChainVerificationError(txSignature);

    const tier = (session.purposeId ?? MembershipTier.SILVER) as MembershipTier;
    const now = new Date();

    // Atomic DB update
    await prisma.$transaction(async (tx) => {
      await tx.solanaPaymentSession.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.CONFIRMED, txSignature, confirmedAt: now },
      });

      await tx.membershipPayment.updateMany({
        where: { userId: session.userId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CONFIRMED, txSignature, validFrom: now },
      });
    });

    // Upgrade membership (handles renewal stacking and no-downgrade)
    await MembershipService.upgrade(session.userId, tier, 1);

    // Update Redis cache
    await redis
      .set(`${REDIS_PREFIX}${paymentId}`, { status: "CONFIRMED", tier }, { ex: 300 })
      .catch(() => undefined);

    // Fire-and-forget badge check for first USDC payment
    void BadgeService.check({ type: "usdc_payment", userId: session.userId }).catch(() => {});
  },

  /**
   * Get paginated billing history for a user.
   */
  async getPaymentHistory(
    userId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<MembershipPayment>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.membershipPayment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.membershipPayment.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  /**
   * Returns all PENDING payment sessions for admin reconciliation.
   */
  async getPendingPayments(): Promise<SolanaPaymentSession[]> {
    return prisma.solanaPaymentSession.findMany({
      where: { status: PaymentStatus.PENDING },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Cancel expired PENDING sessions (called by billing-retry cron in module-17).
   * Returns the number of sessions marked EXPIRED.
   */
  async cancelExpiredPayments(): Promise<number> {
    const now = new Date();

    const { count } = await prisma.solanaPaymentSession.updateMany({
      where: {
        status: PaymentStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: { status: PaymentStatus.EXPIRED },
    });

    // Clean Redis keys for expired sessions (best-effort)
    if (count > 0) {
      const expiredSessions = await prisma.solanaPaymentSession.findMany({
        where: { status: PaymentStatus.EXPIRED, expiresAt: { lt: now } },
        select: { id: true },
        take: 500,
      });

      await Promise.all(
        expiredSessions.map((s) =>
          redis.del(`${REDIS_PREFIX}${s.id}`).catch(() => undefined),
        ),
      );
    }

    return count;
  },
};
