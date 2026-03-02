// app/api/leaderboard/my-rank/route.ts
// GET /api/leaderboard/my-rank — returns the current user's rank and total QC.
// Cached per user for 60 seconds.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { TransactionType } from "@/lib/generated/prisma/client";

interface RankResponse {
  rank: number;
  totalQc: number;
  totalUsers: number;
}

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const cacheKey = `leaderboard:rank:${userId}`;

  const cached = await redis.get<RankResponse>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // Get user's total EARN
  const userAggregate = await prisma.quackCoinTransaction.aggregate({
    where: { userId, type: TransactionType.EARN },
    _sum: { amount: true },
  });
  const userTotal = userAggregate._sum.amount ?? 0;

  // Count users with a higher total (rank = usersAhead + 1)
  const usersAhead = await prisma.quackCoinTransaction.groupBy({
    by: ["userId"],
    where: { type: TransactionType.EARN },
    _sum: { amount: true },
    having: { amount: { _sum: { gt: userTotal } } },
  });

  // Count total distinct users with any EARN
  const totalUsersResult = await prisma.quackCoinTransaction.groupBy({
    by: ["userId"],
    where: { type: TransactionType.EARN },
  });

  const rank = usersAhead.length + 1;
  const totalUsers = totalUsersResult.length;

  const result: RankResponse = { rank, totalQc: userTotal, totalUsers };
  await redis.set(cacheKey, result, { ex: 60 });

  return NextResponse.json({ ...result, cached: false });
}
