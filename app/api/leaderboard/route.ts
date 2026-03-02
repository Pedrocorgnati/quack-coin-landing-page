// app/api/leaderboard/route.ts
// GET /api/leaderboard — top 50 QC earners, Redis-cached for 5 minutes.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { TransactionType } from "@/lib/generated/prisma/client";

const CACHE_KEY = "leaderboard:top50";
const CACHE_TTL_S = 300; // 5 minutes

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  membershipTier: string;
  totalQc: number;
}

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try cache first
  const cached = await redis.get<LeaderboardEntry[]>(CACHE_KEY);
  if (cached) {
    return NextResponse.json({ data: cached, cached: true });
  }

  // Compute leaderboard: sum EARN transactions per user, top 50
  const rows = await prisma.quackCoinTransaction.groupBy({
    by: ["userId"],
    where: { type: TransactionType.EARN },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 50,
  });

  if (rows.length === 0) {
    return NextResponse.json({ data: [], cached: false });
  }

  const userIds = rows.map((r) => r.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      membershipTier: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard: LeaderboardEntry[] = rows.map((row, idx) => {
    const user = userMap.get(row.userId);
    const displayName =
      user?.name ?? user?.email?.split("@")[0] ?? "Anonymous";
    return {
      rank: idx + 1,
      userId: row.userId,
      displayName,
      avatarUrl: user?.avatarUrl ?? null,
      membershipTier: user?.membershipTier ?? "FREE",
      totalQc: row._sum.amount ?? 0,
    };
  });

  // Cache result
  await redis.set(CACHE_KEY, leaderboard, { ex: CACHE_TTL_S });

  return NextResponse.json({ data: leaderboard, cached: false });
}
