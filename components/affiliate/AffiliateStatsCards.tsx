"use client";

// components/affiliate/AffiliateStatsCards.tsx
// 4 metric cards: Total Clicks, Conversions, Pending Cashback (QC), Total Earned (QC).

import { MousePointerClick, TrendingUp, Clock, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AffiliateStatsCardsProps {
  totalClicks: number;
  conversions: number;
  conversionRate: number;
  pendingCashback: number;
  totalQcEarned: number;
}

export function AffiliateStatsCards({
  totalClicks,
  conversions,
  conversionRate,
  pendingCashback,
  totalQcEarned,
}: AffiliateStatsCardsProps) {
  const cards = [
    {
      label: "Total Clicks",
      value: totalClicks.toLocaleString(),
      icon: MousePointerClick,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Conversions",
      value: `${conversions} (${conversionRate}%)`,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Pending Cashback",
      value: `${pendingCashback} QC`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total Earned",
      value: `${totalQcEarned} QC`,
      icon: Coins,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="pt-4 pb-4">
              <div className={`inline-flex rounded-md p-2 ${card.bg} mb-2`}>
                <Icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold leading-tight mt-0.5">{card.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
