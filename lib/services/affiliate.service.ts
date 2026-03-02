// lib/services/affiliate.service.ts
// Affiliate link generation, click tracking (IP dedup), and cashback creation.

import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { NotificationService } from "@/lib/services/notification.service";
import { NotificationType } from "@/lib/generated/prisma/client";
import { QcService } from "@/lib/services/qc.service";

const CASHBACK_RATE_KEY = "cashback.rate";
const CASHBACK_WINDOW_KEY = "cashback.window_days";
const CASHBACK_MIN_QC_KEY = "cashback.min_qc";

export const AffiliateService = {
  // ── Link Generation ──────────────────────────────────────────

  async generateLink(
    userId: string,
    targetUrl?: string,
    campaign?: string,
  ) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";
    const code = nanoid(10);
    const url = targetUrl ?? appUrl;

    return prisma.affiliateLink.create({
      data: {
        userId,
        code,
        url,
        // Store campaign as a URL query param appended to the short URL
        // The actual campaign label is stored in a separate field if needed
      },
    });
  },

  // ── Click Tracking ───────────────────────────────────────────

  async trackClick(
    linkId: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void> {
    // Deduplicate: same link + IP within 24h = 1 unique click
    if (ip) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await prisma.affiliateClick.findFirst({
        where: {
          affiliateLinkId: linkId,
          ipAddress: ip,
          createdAt: { gte: cutoff },
        },
        select: { id: true },
      });
      if (existing) return; // duplicate within 24h window
    }

    await prisma.$transaction([
      prisma.affiliateClick.create({
        data: {
          affiliateLinkId: linkId,
          ipAddress: ip,
          userAgent,
        },
      }),
      prisma.affiliateLink.update({
        where: { id: linkId },
        data: { totalClicks: { increment: 1 } },
      }),
    ]);
  },

  // ── Cashback Creation ────────────────────────────────────────

  async createCashback(
    clickId: string,
    purchaseAmount: number,
    referredUserId?: string,
  ) {
    const [rateStr, windowStr, minQcStr] = await Promise.all([
      SiteConfigService.getOrDefault(CASHBACK_RATE_KEY, "0.05"),
      SiteConfigService.getOrDefault(CASHBACK_WINDOW_KEY, "30"),
      SiteConfigService.getOrDefault(CASHBACK_MIN_QC_KEY, "1"),
    ]);
    const rate = parseFloat(rateStr);
    const windowDays = parseInt(windowStr, 10);
    const minQc = parseInt(minQcStr, 10);

    const click = await prisma.affiliateClick.findUnique({
      where: { id: clickId },
      include: { affiliateLink: { select: { userId: true } } },
    });
    if (!click) throw new Error("Click not found");

    // Check conversion window
    const cutoff = new Date(click.createdAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
    if (new Date() > cutoff) {
      throw new Error("Conversion window expired");
    }

    const amountQc = Math.max(minQc, Math.round(purchaseAmount * rate));
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 day claim window

    const userId = click.affiliateLink.userId;

    const cashback = await prisma.cashbackTransaction.create({
      data: {
        userId,
        affiliateClickId: clickId,
        amountQc,
        purchaseAmount,
        cashbackRate: rate,
        windowDays,
        expiresAt,
      },
    });

    // Update click with conversion info
    await prisma.affiliateClick.update({
      where: { id: clickId },
      data: {
        convertedAt: new Date(),
        qcAwarded: amountQc,
        ...(referredUserId ? { referredUserId } : {}),
      },
    });

    // Notify affiliate link owner
    await NotificationService.send(userId, NotificationType.QC_EARNED, {
      type: NotificationType.QC_EARNED,
      data: {
        amount: amountQc,
        reason: "Cashback pending — claim in Affiliate dashboard",
        newBalance: 0,
      },
    }).catch(() => {});

    return cashback;
  },

  // ── Claim Cashback ───────────────────────────────────────────

  async claimCashback(cashbackId: string, userId: string) {
    const tx = await prisma.cashbackTransaction.findFirst({
      where: { id: cashbackId, userId, claimedAt: null },
    });
    if (!tx) throw new Error("Cashback not found or already claimed");
    if (tx.expiresAt && new Date() > tx.expiresAt) {
      throw new Error("Cashback expired");
    }

    await prisma.cashbackTransaction.update({
      where: { id: cashbackId },
      data: { claimedAt: new Date() },
    });

    await QcService.earn(
      userId,
      tx.amountQc,
      "cashback_claimed",
      `cashback:${cashbackId}`,
      { referenceId: cashbackId, referenceType: "cashback" },
    );

    // Update affiliate link totalEarned
    if (tx.affiliateClickId) {
      const click = await prisma.affiliateClick.findUnique({
        where: { id: tx.affiliateClickId },
        select: { affiliateLinkId: true },
      });
      if (click) {
        await prisma.affiliateLink.update({
          where: { id: click.affiliateLinkId },
          data: { totalEarned: { increment: tx.amountQc } },
        });
      }
    }

    return tx;
  },

  // ── Stats ────────────────────────────────────────────────────

  async getStats(userId: string, from: Date, to: Date) {
    const [totalClicks, uniqueClicks, conversions, pendingCashback, claimedCashback, topLinks] =
      await Promise.all([
        prisma.affiliateClick.count({
          where: { affiliateLink: { userId }, createdAt: { gte: from, lte: to } },
        }),
        prisma.affiliateClick.groupBy({
          by: ["ipAddress"],
          where: { affiliateLink: { userId }, createdAt: { gte: from, lte: to }, ipAddress: { not: null } },
          _count: { ipAddress: true },
        }).then((r) => r.length),
        prisma.affiliateClick.count({
          where: { affiliateLink: { userId }, convertedAt: { not: null }, createdAt: { gte: from, lte: to } },
        }),
        prisma.cashbackTransaction.aggregate({
          where: { userId, claimedAt: null, expiresAt: { gt: new Date() } },
          _sum: { amountQc: true },
        }).then((r) => r._sum.amountQc ?? 0),
        prisma.cashbackTransaction.aggregate({
          where: { userId, claimedAt: { not: null } },
          _sum: { amountQc: true },
        }).then((r) => r._sum.amountQc ?? 0),
        prisma.affiliateLink.findMany({
          where: { userId },
          orderBy: { totalClicks: "desc" },
          take: 5,
          select: { id: true, code: true, url: true, totalClicks: true, totalEarned: true },
        }),
      ]);

    const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

    return {
      totalClicks,
      uniqueClicks,
      conversions,
      conversionRate: Math.round(conversionRate * 10) / 10,
      pendingCashbackQc: pendingCashback,
      claimedCashbackQc: claimedCashback,
      totalQcEarned: pendingCashback + claimedCashback,
      topLinks,
    };
  },
};
