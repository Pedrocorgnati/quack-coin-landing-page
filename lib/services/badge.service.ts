// lib/services/badge.service.ts
// BadgeService — evaluates unlock conditions and awards UserBadge records.
// All check() calls are meant to be fire-and-forget (non-blocking).

import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification.service";
import type { BadgeCategory } from "@/lib/generated/prisma/client";
import { NotificationType } from "@/lib/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────
// Trigger event types
// ─────────────────────────────────────────────────────────────────

export type BadgeTriggerEvent =
  | { type: "login"; userId: string; consecutiveDays: number }
  | { type: "qc_balance"; userId: string; balance: number }
  | { type: "lesson_complete"; userId: string; lessonId: string }
  | { type: "course_complete"; userId: string; courseId: string; allCoursesComplete: boolean }
  | { type: "usdc_payment"; userId: string }
  | { type: "membership_upgrade"; userId: string; tier: "GOLD" | "PLATINUM" }
  | { type: "staking_deposit"; userId: string; amount: number; positionStartedAt: Date }
  | { type: "staking_streak"; userId: string; daysActive: number }
  | { type: "raffle_entry"; userId: string }
  | { type: "cashback_claimed"; userId: string }
  | { type: "referral_count"; userId: string; count: number };

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

async function getUnearnedBadgeSlugs(userId: string): Promise<string[]> {
  const earned = await prisma.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { slug: true } } },
  });
  const earnedSlugs = new Set(earned.map((ub) => ub.badge.slug));

  const allBadges = await prisma.badge.findMany({
    where: { isActive: true },
    select: { slug: true },
  });

  return allBadges.map((b) => b.slug).filter((s) => !earnedSlugs.has(s));
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────

export const BadgeService = {
  /**
   * Check if the given trigger event unlocks any new badges for the user.
   * Safe to call fire-and-forget — errors are caught and logged.
   */
  async check(event: BadgeTriggerEvent): Promise<void> {
    try {
      const { userId } = event;
      const unearned = await getUnearnedBadgeSlugs(userId);
      if (unearned.length === 0) return;

      const toUnlock: string[] = [];

      switch (event.type) {
        case "login":
          if (event.consecutiveDays >= 7 && unearned.includes("login-streak-7")) {
            toUnlock.push("login-streak-7");
          }
          if (event.consecutiveDays >= 30 && unearned.includes("login-streak-30")) {
            toUnlock.push("login-streak-30");
          }
          if (event.consecutiveDays >= 90 && unearned.includes("login-streak-90")) {
            toUnlock.push("login-streak-90");
          }
          break;

        case "qc_balance":
          if (event.balance >= 500 && unearned.includes("qc-hoarder-500")) {
            toUnlock.push("qc-hoarder-500");
          }
          if (event.balance >= 5000 && unearned.includes("qc-whale-5000")) {
            toUnlock.push("qc-whale-5000");
          }
          break;

        case "lesson_complete":
          if (unearned.includes("first-lesson")) {
            toUnlock.push("first-lesson");
          }
          break;

        case "course_complete":
          if (unearned.includes("first-course")) {
            toUnlock.push("first-course");
          }
          if (event.allCoursesComplete && unearned.includes("all-courses")) {
            toUnlock.push("all-courses");
          }
          break;

        case "usdc_payment":
          if (unearned.includes("first-usdc-payment")) {
            toUnlock.push("first-usdc-payment");
          }
          break;

        case "membership_upgrade":
          if (event.tier === "GOLD" && unearned.includes("gold-member")) {
            toUnlock.push("gold-member");
          }
          if (event.tier === "PLATINUM" && unearned.includes("platinum-member")) {
            toUnlock.push("platinum-member");
          }
          break;

        case "staking_deposit":
          if (unearned.includes("first-stake")) {
            toUnlock.push("first-stake");
          }
          if (event.amount >= 1000 && unearned.includes("stake-1000-qc")) {
            toUnlock.push("stake-1000-qc");
          }
          break;

        case "staking_streak":
          if (event.daysActive >= 30 && unearned.includes("staking-streak-30")) {
            toUnlock.push("staking-streak-30");
          }
          break;

        case "raffle_entry":
          if (unearned.includes("first-raffle-entry")) {
            toUnlock.push("first-raffle-entry");
          }
          break;

        case "cashback_claimed":
          if (unearned.includes("first-cashback")) {
            toUnlock.push("first-cashback");
          }
          break;

        case "referral_count":
          if (event.count >= 5 && unearned.includes("invite-master")) {
            toUnlock.push("invite-master");
          }
          break;
      }

      for (const slug of toUnlock) {
        await BadgeService.unlock(userId, slug);
      }
    } catch (err) {
      // Non-blocking — log but never throw
      console.error("[BadgeService.check] error:", err);
    }
  },

  /**
   * Award a badge to a user by slug.
   * Silently ignores duplicates (unique constraint on userId+badgeId).
   */
  async unlock(userId: string, badgeSlug: string): Promise<void> {
    const badge = await prisma.badge.findUnique({
      where: { slug: badgeSlug },
      select: { id: true, name: true, imageUrl: true },
    });
    if (!badge) {
      console.warn(`[BadgeService.unlock] badge not found: ${badgeSlug}`);
      return;
    }

    try {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      });

      // Notify user
      await NotificationService.send(userId, NotificationType.BADGE_EARNED, {
        type: NotificationType.BADGE_EARNED,
        data: {
          badgeId: badge.id,
          badgeName: badge.name,
          badgeImageUrl: badge.imageUrl,
        },
      }).catch(() => {});
    } catch (err: unknown) {
      // Ignore P2002 unique constraint (badge already earned)
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return;
      }
      throw err;
    }
  },

  /**
   * Get badge unlock data for a user — used by /api/badges.
   */
  async getBadgesForUser(userId: string): Promise<BadgeWithEarnedStatus[]> {
    const [allBadges, userBadges] = await Promise.all([
      prisma.badge.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true, earnedAt: true },
      }),
    ]);

    const earnedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

    return allBadges.map((badge) => ({
      ...badge,
      earned: earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id) ?? null,
    }));
  },
};

export interface BadgeWithEarnedStatus {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  category: BadgeCategory;
  qcThreshold: number | null;
  isActive: boolean;
  createdAt: Date;
  earned: boolean;
  earnedAt: Date | null;
}
