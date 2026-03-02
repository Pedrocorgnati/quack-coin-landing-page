// app/api/affiliate/stats/route.ts
// GET aggregated affiliate stats for the current user. Cached per user in Redis (TTL 300s).

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30d";

  const cacheKey = `affiliate:stats:${session.user.id}:${range}`;
  const cached = await redis.get<object>(cacheKey).catch(() => null);
  if (cached) return NextResponse.json(cached);

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [links, clicks, cashbacks, referralCount] = await Promise.all([
    prisma.affiliateLink.findMany({
      where: { userId: session.user.id },
      select: { id: true, code: true, totalClicks: true, totalEarned: true },
    }),
    prisma.affiliateClick.findMany({
      where: {
        affiliateLink: { userId: session.user.id },
        createdAt: { gte: from },
      },
      select: { id: true, convertedAt: true, createdAt: true, qcAwarded: true },
    }),
    prisma.cashbackTransaction.findMany({
      where: { userId: session.user.id, createdAt: { gte: from } },
      select: { amountQc: true, claimedAt: true, expiresAt: true, createdAt: true },
    }),
    prisma.user.count({ where: { invitedById: session.user.id } }),
  ]);

  const totalClicks = clicks.length;
  const conversions = clicks.filter((c) => c.convertedAt !== null).length;
  const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

  const now = new Date();
  const pendingCashback = cashbacks
    .filter((c) => !c.claimedAt && (!c.expiresAt || c.expiresAt > now))
    .reduce((sum, c) => sum + c.amountQc, 0);
  const claimedCashback = cashbacks
    .filter((c) => !!c.claimedAt)
    .reduce((sum, c) => sum + c.amountQc, 0);
  const totalQcEarned = links.reduce((sum, l) => sum + l.totalEarned, 0);

  // Build daily clicks array for chart
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const click of clicks) {
    const day = click.createdAt.toISOString().slice(0, 10);
    if (day in dailyMap) dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  }
  const dailyClicks = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  const topLinks = links
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 5)
    .map((l) => ({ code: l.code, clicks: l.totalClicks, earned: l.totalEarned }));

  const data = {
    totalClicks,
    uniqueClicks: totalClicks,
    conversions,
    conversionRate: Math.round(conversionRate * 10) / 10,
    pendingCashback,
    claimedCashback,
    totalQcEarned,
    referralCount,
    dailyClicks,
    topLinks,
  };

  await redis.set(cacheKey, data, { ex: 300 }).catch(() => {});
  return NextResponse.json(data);
}
