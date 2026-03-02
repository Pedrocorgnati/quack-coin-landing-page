// app/(dashboard)/qc/page.tsx
// QC Economy dashboard page. Server Component.

import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/requireRole";
import { QcService } from "@/lib/services/qc.service";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { QC_CONFIG_KEYS, QC_EARN_DEFAULTS } from "@/lib/constants";
import { QCBalanceCard } from "@/components/shared/QCBalanceCard";
import { DailyLoginReward } from "@/components/qc/DailyLoginReward";
import { TransactionHistoryTable } from "@/components/qc/TransactionHistoryTable";
import { TransactionFilters } from "@/components/qc/TransactionFilters";
import { prisma } from "@/lib/prisma";
import type { TransactionType, Prisma } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "QC Economy | QuackCoin",
};

interface QcPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function QcPage({ searchParams }: QcPageProps) {
  const session = await requireAuth();
  const userId = session.user.id;

  const params = await searchParams;

  // Resolve pagination + filter params from URL
  const page = Math.max(1, Number(params.page) || 1);
  const limit = 20;
  const typeParam = (Array.isArray(params.type) ? params.type[0] : params.type) ?? "all";
  const fromParam = Array.isArray(params.from) ? params.from[0] : params.from;
  const toParam = Array.isArray(params.to) ? params.to[0] : params.to;

  const today = new Date().toISOString().slice(0, 10);
  const dailyIdempotencyKey = `daily_login:${userId}:${today}`;

  // Build Prisma where for filtering
  const txWhere: Prisma.QuackCoinTransactionWhereInput = { userId };

  if (typeParam && typeParam !== "all") {
    txWhere.type = typeParam as TransactionType;
  }
  if (fromParam ?? toParam) {
    txWhere.createdAt = {};
    if (fromParam) txWhere.createdAt.gte = new Date(fromParam);
    if (toParam) {
      const endOfDay = new Date(toParam);
      endOfDay.setHours(23, 59, 59, 999);
      txWhere.createdAt.lte = endOfDay;
    }
  }

  const skip = (page - 1) * limit;

  const [balance, claimedToday, dailyRateStr, txData, txTotal, expiringQc] =
    await Promise.all([
      QcService.getBalance(userId),
      prisma.quackCoinTransaction.findUnique({
        where: { idempotencyKey: dailyIdempotencyKey },
      }),
      SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.login,
        String(QC_EARN_DEFAULTS.login),
      ),
      prisma.quackCoinTransaction.findMany({
        where: txWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quackCoinTransaction.count({ where: txWhere }),
      QcService.getExpiringQc(userId, 7),
    ]);

  const dailyAmount = Math.max(0, parseInt(dailyRateStr, 10));

  const totalPages = Math.ceil(txTotal / limit);
  const meta = {
    page,
    limit,
    total: txTotal,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">QC Economy</h1>
        <p className="text-muted-foreground text-sm">
          Earn QuackCoins through daily activities and track your balance.
        </p>
      </div>

      {/* Balance card */}
      <QCBalanceCard balance={balance} variant="full" expiringQc={expiringQc} />

      {/* Daily claim */}
      <DailyLoginReward
        alreadyClaimed={!!claimedToday}
        dailyAmount={dailyAmount}
      />

      {/* Transaction history */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          <TransactionFilters
            currentType={typeParam}
            currentFrom={fromParam}
            currentTo={toParam}
          />
        </div>
        <TransactionHistoryTable transactions={txData} meta={meta} />
      </div>
    </div>
  );
}
