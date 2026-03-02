// lib/services/qc.service.ts
// QcService — single authority over all QuackCoin balance mutations.
// Uses an immutable ledger (QuackCoinTransaction) — balance is always
// computed via SUM, never stored directly on the User model.

import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/generated/prisma/client";
import type { QuackCoinTransaction } from "@/lib/generated/prisma/client";
import { InsufficientQcError, DuplicateTransactionError } from "@/lib/errors/qc.errors";
import type { PaginationInput } from "@/lib/validations";
import type { PaginatedResult } from "@/lib/types";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { QC_CONFIG_KEYS, QC_EXPIRY_DEFAULTS } from "@/lib/constants";
import { BadgeService } from "@/lib/services/badge.service";

export const QcService = {
  /**
   * Earn QC for a user. Idempotent — same idempotencyKey returns existing record.
   */
  async earn(
    userId: string,
    amount: number,
    reason: string,
    idempotencyKey: string,
    opts?: { referenceId?: string; referenceType?: string },
  ): Promise<QuackCoinTransaction> {
    return prisma.$transaction(async (tx) => {
      // Check idempotency
      const existing = await tx.quackCoinTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;

      const record = await tx.quackCoinTransaction.create({
        data: {
          userId,
          amount,
          type: TransactionType.EARN,
          reason,
          idempotencyKey,
          referenceId: opts?.referenceId,
          referenceType: opts?.referenceType,
        },
      });

      // Fire-and-forget badge check for QC balance thresholds
      void QcService.getBalance(userId).then((balance) =>
        BadgeService.check({ type: "qc_balance", userId, balance }),
      ).catch(() => {});

      return record;
    });
  },

  /**
   * Deduct QC from a user. Throws InsufficientQcError if balance is too low.
   * Idempotent — same idempotencyKey returns existing record.
   */
  async deduct(
    userId: string,
    amount: number,
    reason: string,
    idempotencyKey: string,
    opts?: { referenceId?: string; referenceType?: string },
  ): Promise<QuackCoinTransaction> {
    return prisma.$transaction(async (tx) => {
      // Check idempotency
      const existing = await tx.quackCoinTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;

      // Verify balance
      const balance = await QcService._computeBalance(userId, tx);
      if (balance < amount) {
        throw new InsufficientQcError(amount, balance);
      }

      return tx.quackCoinTransaction.create({
        data: {
          userId,
          amount: -amount, // negative for spend
          type: TransactionType.SPEND,
          reason,
          idempotencyKey,
          referenceId: opts?.referenceId,
          referenceType: opts?.referenceType,
        },
      });
    });
  },

  /**
   * Get the current QC balance for a user.
   * If QC_EXPIRY_ENABLED is "true", EARN transactions older than QC_EXPIRY_DAYS
   * are excluded from the balance calculation.
   */
  async getBalance(userId: string): Promise<number> {
    const [expiryEnabledStr, expiryDaysStr] = await Promise.all([
      SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.expiry_enabled,
        String(QC_EXPIRY_DEFAULTS.enabled),
      ),
      SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.expiry_days,
        String(QC_EXPIRY_DEFAULTS.days),
      ),
    ]);

    const expiryEnabled = expiryEnabledStr === "true";
    const expiryDays = Math.max(1, parseInt(expiryDaysStr, 10) || QC_EXPIRY_DEFAULTS.days);

    return QcService._computeBalance(userId, prisma, expiryEnabled ? expiryDays : undefined);
  },

  /**
   * Get paginated transaction history for a user.
   */
  async getTransactions(
    userId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<QuackCoinTransaction>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.quackCoinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quackCoinTransaction.count({ where: { userId } }),
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
   * Returns the total QC amount that will expire within the next `warningDays` days,
   * only if expiry is enabled. Returns null when expiry is disabled.
   */
  async getExpiringQc(
    userId: string,
    warningDays = 7,
  ): Promise<{ amount: number; expiresAt: Date } | null> {
    const [expiryEnabledStr, expiryDaysStr] = await Promise.all([
      SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.expiry_enabled,
        String(QC_EXPIRY_DEFAULTS.enabled),
      ),
      SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.expiry_days,
        String(QC_EXPIRY_DEFAULTS.days),
      ),
    ]);

    if (expiryEnabledStr !== "true") return null;

    const expiryDays = Math.max(1, parseInt(expiryDaysStr, 10) || QC_EXPIRY_DEFAULTS.days);
    const now = new Date();

    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() - (expiryDays - warningDays));

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - expiryDays);

    // EARN transactions older than (expiryDays - warningDays) but younger than expiryDays
    const result = await prisma.quackCoinTransaction.aggregate({
      where: {
        userId,
        type: TransactionType.EARN,
        createdAt: { gte: cutoff, lte: expiresAt },
      },
      _sum: { amount: true },
    });

    const amount = result._sum.amount ?? 0;
    if (amount <= 0) return null;

    return { amount, expiresAt };
  },

  // ── Internal helper (can accept a transaction client) ─────────
  async _computeBalance(
    userId: string,
    client: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    /** If set, EARN transactions older than this many days are excluded. */
    expiryDays?: number,
  ): Promise<number> {
    const where: Record<string, unknown> = { userId };

    if (expiryDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - expiryDays);
      // Exclude EARN transactions older than the cutoff (non-EARN ones like SPEND still count)
      where.OR = [
        { type: { not: TransactionType.EARN } },
        { type: TransactionType.EARN, createdAt: { gte: cutoff } },
      ];
    }

    const result = await (
      client as typeof prisma
    ).quackCoinTransaction.aggregate({
      where: where as Parameters<typeof prisma.quackCoinTransaction.aggregate>[0]["where"],
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  },
};
