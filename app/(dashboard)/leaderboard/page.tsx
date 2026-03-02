// app/(dashboard)/leaderboard/page.tsx
// QC Leaderboard — Server Component. Top 50 earners from cached API.

import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/requireRole";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/generated/prisma/client";
import { LeaderboardTable } from "@/components/qc/LeaderboardTable";
import { UserRankCard } from "@/components/qc/UserRankCard";
import type { LeaderboardEntry } from "@/components/qc/LeaderboardTable";

export const metadata: Metadata = { title: "Leaderboard | QuackCoin" };

const CACHE_KEY = "leaderboard:top50";
const CACHE_TTL_S = 300;

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const cached = await redis.get<LeaderboardEntry[]>(CACHE_KEY);
  if (cached) return cached;

  const rows = await prisma.quackCoinTransaction.groupBy({
    by: ["userId"],
    where: { type: TransactionType.EARN },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 50,
  });

  if (rows.length === 0) return [];

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

  await redis.set(CACHE_KEY, leaderboard, { ex: CACHE_TTL_S });
  return leaderboard;
}

export default async function LeaderboardPage() {
  const session = await requireAuth();
  const entries = await getLeaderboard();

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">QC Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Top QuackCoin earners on the platform. Updated every 5 minutes.
        </p>
      </div>

      {/* Your rank (client-side, shows for users outside top 50) */}
      <UserRankCard topRankThreshold={50} />

      {/* Leaderboard table */}
      <LeaderboardTable entries={entries} currentUserId={session.user.id} />
    </div>
  );
}
