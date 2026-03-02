// app/api/admin/stats/charts/route.ts
// Time-series data for admin charts.
// GET ?metric={users|revenue|qc}&period={7d|30d|90d}
// Cached in Redis per metric+period TTL 600s.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { z } from "zod";

const QuerySchema = z.object({
  metric: z.enum(["users", "revenue", "qc"]),
  period: z.enum(["7d", "30d", "90d"]),
});

const CACHE_TTL = 600; // 10 minutes

const periodDays = { "7d": 7, "30d": 30, "90d": 90 } as const;

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const parsed = QuerySchema.safeParse({
    metric: searchParams.get("metric"),
    period: searchParams.get("period"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid metric or period" }, { status: 400 });
  }

  const { metric, period } = parsed.data;
  const cacheKey = `admin:stats:charts:${metric}:${period}`;

  const cached = await redis.get<unknown[]>(cacheKey).catch(() => null);
  if (cached) return NextResponse.json({ data: cached });

  const days = periodDays[period];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let data: { date: string; value: number }[] = [];

  if (metric === "users") {
    // New user registrations per day
    const rows = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM users
      WHERE created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    data = rows.map((r) => ({ date: r.date, value: Number(r.count) }));
  } else if (metric === "revenue") {
    // USDC revenue per day (confirmed membership payments)
    const rows = await prisma.$queryRaw<{ date: string; total: string | null }[]>`
      SELECT DATE(created_at) AS date,
             CAST(SUM(CAST(amount_usdc AS DECIMAL(20,8))) AS CHAR) AS total
      FROM membership_payments
      WHERE status = 'CONFIRMED' AND created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    data = rows.map((r) => ({ date: r.date, value: parseFloat(r.total ?? "0") }));
  } else {
    // QC earned per day (positive transactions)
    const rows = await prisma.$queryRaw<{ date: string; total: bigint }[]>`
      SELECT DATE(created_at) AS date, SUM(amount) AS total
      FROM quack_coin_transactions
      WHERE amount > 0 AND created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    data = rows.map((r) => ({ date: r.date, value: Number(r.total) }));
  }

  await redis.set(cacheKey, data, { ex: CACHE_TTL }).catch(() => {});

  return NextResponse.json({ data });
}
