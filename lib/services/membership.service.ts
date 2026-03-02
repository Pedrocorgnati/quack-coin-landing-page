// lib/services/membership.service.ts
// MembershipService — manages tier upgrades, expiry, renewal, and benefit reads.
// Benefits (QC multiplier, staking bonus, cashback) are stored in SiteConfig
// and refreshed every 5 minutes via Redis cache.

import { prisma } from "@/lib/prisma";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { MembershipTier } from "@/lib/generated/prisma/client";
import type { NotificationType } from "@/lib/generated/prisma/client";
import { BadgeService } from "@/lib/services/badge.service";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface MembershipBenefits {
  qcMultiplier: number;
  stakingBonus: number;  // percentage points added to APY
  cashbackBonus: number; // percentage cashback on referrals
}

const TIER_ORDER: MembershipTier[] = [
  MembershipTier.FREE,
  MembershipTier.SILVER,
  MembershipTier.GOLD,
  MembershipTier.PLATINUM,
];

const FREE_BENEFITS: MembershipBenefits = {
  qcMultiplier: 1.0,
  stakingBonus: 0,
  cashbackBonus: 0,
};

// ─────────────────────────────────────────────────────────────────
// SiteConfig key helpers
// ─────────────────────────────────────────────────────────────────

function benefitKey(tier: MembershipTier, benefit: string): string {
  return `membership.${tier.toLowerCase()}.${benefit}`;
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────

export const MembershipService = {
  /**
   * Upgrade a user's membership tier and extend expiry.
   * Renewal before expiry stacks (adds months to current expiry).
   * Tier is never downgraded — lower-tier upgrades are silently ignored.
   */
  async upgrade(userId: string, tier: MembershipTier, months: number): Promise<void> {
    const now = new Date();
    const daysToAdd = months * 30;
    const msToAdd = daysToAdd * 24 * 60 * 60 * 1000;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { membershipTier: true, membershipExpiresAt: true },
      });

      if (!user) throw new Error(`User ${userId} not found`);

      // Never downgrade
      const currentRank = TIER_ORDER.indexOf(user.membershipTier);
      const newRank = TIER_ORDER.indexOf(tier);
      const effectiveTier = newRank >= currentRank ? tier : user.membershipTier;

      // Extend from current expiry if still active; otherwise start from now
      const baseExpiry = user.membershipExpiresAt && user.membershipExpiresAt > now
        ? user.membershipExpiresAt
        : now;
      const newExpiry = new Date(baseExpiry.getTime() + msToAdd);

      await tx.user.update({
        where: { id: userId },
        data: {
          membershipTier: effectiveTier,
          membershipExpiresAt: newExpiry,
        },
      });
    });

    // Fire-and-forget badge check for membership tier
    if (tier === MembershipTier.GOLD || tier === MembershipTier.PLATINUM) {
      void BadgeService.check({
        type: "membership_upgrade",
        userId,
        tier: tier as "GOLD" | "PLATINUM",
      }).catch(() => {});
    }
  },

  /**
   * Returns true if the user's membership is currently active.
   */
  async isActive(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { membershipTier: true, membershipExpiresAt: true },
    });

    if (!user) return false;
    if (user.membershipTier === MembershipTier.FREE) return false;
    if (!user.membershipExpiresAt) return false;
    return user.membershipExpiresAt > new Date();
  },

  /**
   * Returns the active benefits for a user based on their tier.
   * FREE members always get the baseline (1x, 0%, 0%).
   * Paid members who have expired are treated as FREE.
   */
  async getActiveBenefits(userId: string): Promise<MembershipBenefits> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { membershipTier: true, membershipExpiresAt: true },
    });

    if (!user) return FREE_BENEFITS;

    const now = new Date();
    const isExpired = user.membershipExpiresAt ? user.membershipExpiresAt <= now : true;
    const tier = (user.membershipTier === MembershipTier.FREE || isExpired)
      ? MembershipTier.FREE
      : user.membershipTier;

    if (tier === MembershipTier.FREE) return FREE_BENEFITS;

    const [multStr, stakingStr, cashbackStr] = await Promise.all([
      SiteConfigService.getOrDefault(benefitKey(tier, "qc_multiplier"), "1.0"),
      SiteConfigService.getOrDefault(benefitKey(tier, "staking_bonus"), "0"),
      SiteConfigService.getOrDefault(benefitKey(tier, "cashback_bonus"), "0"),
    ]);

    return {
      qcMultiplier: Math.max(1.0, parseFloat(multStr)),
      stakingBonus: Math.max(0, parseFloat(stakingStr)),
      cashbackBonus: Math.max(0, parseFloat(cashbackStr)),
    };
  },

  /**
   * Returns the tier string for a userId, respecting expiry.
   */
  async getEffectiveTier(userId: string): Promise<MembershipTier> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { membershipTier: true, membershipExpiresAt: true },
    });

    if (!user || user.membershipTier === MembershipTier.FREE) return MembershipTier.FREE;

    const now = new Date();
    const isExpired = user.membershipExpiresAt ? user.membershipExpiresAt <= now : true;
    return isExpired ? MembershipTier.FREE : user.membershipTier;
  },

  /**
   * Trigger expiry notifications for members whose membership expires within
   * `withinDays` days. Called by the billing-retry cron (module-17).
   * Returns number of notifications dispatched.
   */
  async notifyExpiringMemberships(withinDays = 7): Promise<number> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const expiringUsers = await prisma.user.findMany({
      where: {
        membershipTier: { not: MembershipTier.FREE },
        membershipExpiresAt: {
          gt: now,
          lte: cutoff,
        },
      },
      select: { id: true, membershipTier: true, membershipExpiresAt: true },
    });

    // Lazy import to avoid circular dependency
    const { NotificationService } = await import("@/lib/services/notification.service");

    let dispatched = 0;
    await Promise.all(
      expiringUsers.map(async (user) => {
        const expiresAt = user.membershipExpiresAt!;
        const msLeft = expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

        try {
          await NotificationService.send(
            user.id,
            "MEMBERSHIP_EXPIRING" as NotificationType,
            {
              type: "MEMBERSHIP_EXPIRING" as typeof NotificationType.MEMBERSHIP_EXPIRING,
              data: {
                tier: user.membershipTier,
                daysRemaining,
                expiresAt: expiresAt.toISOString(),
              },
            },
          );
          dispatched++;
        } catch {
          // Non-fatal — log but continue
        }
      }),
    );

    return dispatched;
  },
};
