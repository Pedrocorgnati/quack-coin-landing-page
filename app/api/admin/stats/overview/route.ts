// app/api/admin/stats/overview/route.ts
// Admin stats: platform metrics aggregated in a single transaction batch.
// Cached in Redis admin:stats:overview TTL 300s.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const CACHE_KEY = "admin:stats:overview";
const CACHE_TTL = 300; // 5 minutes

export async function GET() {
  await requireAdmin();

  // Try cache
  const cached = await redis.get<Record<string, unknown>>(CACHE_KEY).catch(() => null);
  if (cached) return NextResponse.json(cached);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeMembers,
    newUsersLast7d,
    qcCirculationRaw,
    activeStakingPositions,
    pendingCashbacks,
  ] = await prisma.$transaction([
    prisma.user.count(),

    prisma.user.count({
      where: {
        membershipTier: { not: "FREE" },
        membershipExpiresAt: { gt: now },
      },
    }),

    prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),

    prisma.quackCoinTransaction.aggregate({
      _sum: { amount: true },
      where: { amount: { gt: 0 } },
    }),

    prisma.stakingPosition.count({
      where: { status: "ACTIVE" },
    }),

    prisma.cashbackTransaction.count({
      where: { claimedAt: null },
    }),
  ]);

  // amountUsdc is stored as VARCHAR — use raw query for SUM
  const usdcResult = await prisma.$queryRaw<[{ total: string | null }]>`
    SELECT CAST(SUM(CAST(amount_usdc AS DECIMAL(20,8))) AS CHAR) AS total
    FROM membership_payments
    WHERE status = 'CONFIRMED'
  `;
  const totalUsdcRevenue = usdcResult[0]?.total ?? "0";

  const payload = {
    totalUsers,
    activeMembers,
    newUsersLast7d,
    totalQcCirculation: qcCirculationRaw._sum.amount ?? 0,
    totalUsdcRevenue,
    activeStakingPositions,
    pendingCashbacks,
    cachedAt: now.toISOString(),
  };

  await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {});

  return NextResponse.json(payload);
}
