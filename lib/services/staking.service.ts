// lib/services/staking.service.ts
// StakingService — manages QC staking positions, reward calculation, and distribution.
// Each user has at most one ACTIVE StakingPosition. Deposits add to it; withdrawals reduce it.

import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";
import { MembershipService } from "@/lib/services/membership.service";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { InsufficientStakeError, NoActiveStakeError } from "@/lib/errors/staking.errors";
import { StakingStatus, StakingEventType, MembershipTier } from "@/lib/generated/prisma/client";
import type { StakingPosition, StakingHistory } from "@/lib/generated/prisma/client";
import { BadgeService } from "@/lib/services/badge.service";

const STAKING_BASE_APY_KEY = "staking.base_apy";
const DEFAULT_APY = "0.08"; // 8% base APY

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface StakingPositionDetail {
  position: StakingPosition | null;
  stakedAmount: number;
  estimatedDailyReward: number;
  estimatedAPY: number;
  lastRewardAt: Date | null;
  history: StakingHistory[];
}

export interface DepositResult {
  newBalance: number;
  stakedAmount: number;
  estimatedDailyReward: number;
}

export interface WithdrawResult {
  newBalance: number;
  stakedAmount: number;
  estimatedDailyReward: number;
}

export interface RewardDistributionResult {
  processed: number;
  totalQcDistributed: number;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

async function getBaseApy(): Promise<number> {
  const val = await SiteConfigService.getOrDefault(STAKING_BASE_APY_KEY, DEFAULT_APY);
  return parseFloat(val);
}

function dailyRate(annualApy: number): number {
  return annualApy / 365;
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────

export const StakingService = {
  /**
   * Deposit QC into staking. Deducts from user balance and adds to their StakingPosition.
   * Creates a new position if none exists, or increases the existing ACTIVE one.
   */
  async deposit(userId: string, amount: number): Promise<DepositResult> {
    if (amount <= 0) throw new Error("Deposit amount must be positive");

    const idempotencyKey = `staking_deposit:${userId}:${Date.now()}`;

    // Deduct QC from balance (throws InsufficientQcError if balance too low)
    await QcService.deduct(userId, amount, "Staking deposit", idempotencyKey);

    const baseApy = await getBaseApy();
    const benefits = await MembershipService.getActiveBenefits(userId);
    const effectiveApy = baseApy + benefits.stakingBonus / 100; // stakingBonus is 0-100 percentage points

    // Upsert staking position
    const position = await prisma.$transaction(async (tx) => {
      const existing = await tx.stakingPosition.findFirst({
        where: { userId, status: StakingStatus.ACTIVE },
      });

      let pos: StakingPosition;
      if (existing) {
        pos = await tx.stakingPosition.update({
          where: { id: existing.id },
          data: {
            amountQc: { increment: amount },
            apy: effectiveApy, // refresh APY on each deposit
          },
        });
      } else {
        pos = await tx.stakingPosition.create({
          data: {
            userId,
            amountQc: amount,
            apy: effectiveApy,
            status: StakingStatus.ACTIVE,
            lastRewardAt: new Date(),
          },
        });
      }

      // Record DEPOSIT history entry
      const currentStake = pos.amountQc;
      await tx.stakingHistory.create({
        data: {
          stakingPositionId: pos.id,
          eventType: StakingEventType.DEPOSIT,
          amountQc: amount,
          balanceAfter: currentStake,
          note: "User deposit",
        },
      });

      return pos;
    });

    const newBalance = await QcService.getBalance(userId);
    const estimatedDailyReward = Math.floor(position.amountQc * dailyRate(effectiveApy));

    // Fire-and-forget badge checks
    void BadgeService.check({
      type: "staking_deposit",
      userId,
      amount,
      positionStartedAt: position.createdAt,
    }).catch(() => {});

    return { newBalance, stakedAmount: position.amountQc, estimatedDailyReward };
  },

  /**
   * Withdraw QC from staking. Returns QC to user balance and reduces StakingPosition.
   * Throws InsufficientStakeError if amount > staked, NoActiveStakeError if no position.
   */
  async withdraw(userId: string, amount: number): Promise<WithdrawResult> {
    if (amount <= 0) throw new Error("Withdraw amount must be positive");

    const position = await prisma.stakingPosition.findFirst({
      where: { userId, status: StakingStatus.ACTIVE },
    });

    if (!position) throw new NoActiveStakeError(userId);
    if (amount > position.amountQc) throw new InsufficientStakeError(amount, position.amountQc);

    const idempotencyKey = `staking_withdraw:${userId}:${Date.now()}`;
    const baseApy = await getBaseApy();
    const benefits = await MembershipService.getActiveBenefits(userId);
    const effectiveApy = baseApy + benefits.stakingBonus / 100;

    await prisma.$transaction(async (tx) => {
      const newAmount = position.amountQc - amount;

      if (newAmount === 0) {
        await tx.stakingPosition.update({
          where: { id: position.id },
          data: { amountQc: 0, status: StakingStatus.COMPLETED, unstakedAt: new Date() },
        });
      } else {
        await tx.stakingPosition.update({
          where: { id: position.id },
          data: { amountQc: newAmount },
        });
      }

      await tx.stakingHistory.create({
        data: {
          stakingPositionId: position.id,
          eventType: StakingEventType.WITHDRAWAL,
          amountQc: amount,
          balanceAfter: newAmount,
          note: "User withdrawal",
        },
      });
    });

    // Return QC to balance
    await QcService.earn(userId, amount, "Staking withdrawal", idempotencyKey);

    const newBalance = await QcService.getBalance(userId);
    const newStakedAmount = position.amountQc - amount;
    const estimatedDailyReward =
      newStakedAmount > 0 ? Math.floor(newStakedAmount * dailyRate(effectiveApy)) : 0;

    return { newBalance, stakedAmount: newStakedAmount, estimatedDailyReward };
  },

  /**
   * Calculate the QC reward for a staking position since its lastRewardAt.
   * Uses base APY from SiteConfig + membership staking bonus.
   */
  async calculateReward(position: StakingPosition): Promise<number> {
    const lastReward = position.lastRewardAt ?? position.stakedAt;
    const now = new Date();
    const daysSince = (now.getTime() - lastReward.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < 1) return 0;

    const baseApy = await getBaseApy();
    const benefits = await MembershipService.getActiveBenefits(position.userId);
    const effectiveApy = baseApy + benefits.stakingBonus / 100;

    const reward = Math.floor(position.amountQc * dailyRate(effectiveApy) * daysSince);
    return Math.max(0, reward);
  },

  /**
   * Distribute rewards for all active staking positions.
   * Called by the staking-rewards cron job (daily).
   * QA-025: batch-fetches user membership data to avoid N+1 (one DB query per staker).
   */
  async distributeAllRewards(): Promise<RewardDistributionResult> {
    const positions = await prisma.stakingPosition.findMany({
      where: { status: StakingStatus.ACTIVE, amountQc: { gt: 0 } },
    });

    const baseApy = await getBaseApy();
    const now = new Date();

    // QA-025: batch-fetch membership tiers for all stakers in one query
    const userIds = [...new Set(positions.map((p) => p.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, membershipTier: true, membershipExpiresAt: true },
    });

    // Pre-fetch staking bonuses for each non-FREE tier (at most 3 SiteConfig queries)
    const paidTiers = [MembershipTier.SILVER, MembershipTier.GOLD, MembershipTier.PLATINUM] as const;
    const tierBonusMap = new Map<string, number>();
    await Promise.all(
      paidTiers.map(async (tier) => {
        const key = `membership.${tier.toLowerCase()}.staking_bonus`;
        const val = await SiteConfigService.getOrDefault(key, "0");
        tierBonusMap.set(tier, Math.max(0, parseFloat(val)));
      }),
    );

    // Build userId -> effectiveApy map
    const userApyMap = new Map<string, number>();
    for (const u of users) {
      const isExpired = u.membershipExpiresAt ? u.membershipExpiresAt <= now : true;
      const tier = u.membershipTier === MembershipTier.FREE || isExpired
        ? MembershipTier.FREE
        : u.membershipTier;
      const stakingBonus = tier === MembershipTier.FREE ? 0 : (tierBonusMap.get(tier) ?? 0);
      userApyMap.set(u.id, baseApy + stakingBonus / 100);
    }

    let processed = 0;
    let totalQcDistributed = 0;
    const errors: string[] = [];

    for (const pos of positions) {
      try {
        // Inline reward calculation using pre-fetched APY map (no extra DB queries)
        const lastReward = pos.lastRewardAt ?? pos.stakedAt;
        const daysSince = (now.getTime() - lastReward.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 1) continue;

        const effectiveApy = userApyMap.get(pos.userId) ?? baseApy;
        const reward = Math.max(0, Math.floor(pos.amountQc * dailyRate(effectiveApy) * daysSince));
        if (reward <= 0) continue;

        const idempotencyKey = `staking_reward:${pos.id}:${new Date().toISOString().slice(0, 10)}`;

        await prisma.$transaction(async (tx) => {
          // Credit the reward
          await tx.stakingHistory.create({
            data: {
              stakingPositionId: pos.id,
              eventType: StakingEventType.REWARD,
              amountQc: reward,
              balanceAfter: pos.amountQc, // staked amount unchanged by reward
              note: `Daily reward — ${(effectiveApy * 100).toFixed(2)}% APY`,
            },
          });

          await tx.stakingPosition.update({
            where: { id: pos.id },
            data: { lastRewardAt: new Date() },
          });
        });

        await QcService.earn(pos.userId, reward, "Staking reward (daily)", idempotencyKey, {
          referenceId: pos.id,
          referenceType: "staking_reward",
        });

        processed++;
        totalQcDistributed += reward;
      } catch (err) {
        errors.push(`Position ${pos.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { processed, totalQcDistributed, errors };
  },

  /**
   * Get full staking position detail for a user.
   */
  async getPosition(userId: string): Promise<StakingPositionDetail> {
    const position = await prisma.stakingPosition.findFirst({
      where: { userId, status: StakingStatus.ACTIVE },
      include: { history: { orderBy: { createdAt: "desc" }, take: 20 } },
    });

    if (!position) {
      return {
        position: null,
        stakedAmount: 0,
        estimatedDailyReward: 0,
        estimatedAPY: 0,
        lastRewardAt: null,
        history: [],
      };
    }

    const baseApy = await getBaseApy();
    const benefits = await MembershipService.getActiveBenefits(userId);
    const effectiveApy = baseApy + benefits.stakingBonus / 100;
    const estimatedDailyReward = Math.floor(position.amountQc * dailyRate(effectiveApy));

    return {
      position,
      stakedAmount: position.amountQc,
      estimatedDailyReward,
      estimatedAPY: effectiveApy,
      lastRewardAt: position.lastRewardAt,
      history: position.history,
    };
  },
};
