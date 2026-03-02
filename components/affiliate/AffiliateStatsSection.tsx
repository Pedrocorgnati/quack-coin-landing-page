"use client";

// components/affiliate/AffiliateStatsSection.tsx
// Client wrapper for affiliate stats — fetches data and manages range state.

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AffiliateStatsCards } from "./AffiliateStatsCards";
import { ClicksChart } from "./ClicksChart";
import { ConversionFunnel } from "./ConversionFunnel";
import { Users } from "lucide-react";

type Range = "7d" | "30d" | "90d";

interface StatsData {
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  pendingCashback: number;
  claimedCashback: number;
  totalQcEarned: number;
  referralCount: number;
  dailyClicks: { date: string; count: number }[];
  topLinks: { code: string; clicks: number; earned: number }[];
}

export function AffiliateStatsSection() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (r: Range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/affiliate/stats?range=${r}`);
      if (res.ok) {
        const json = await res.json();
        setData(json as StatsData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats(range);
  }, [fetchStats, range]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AffiliateStatsCards
        totalClicks={data.totalClicks}
        conversions={data.conversions}
        conversionRate={data.conversionRate}
        pendingCashback={data.pendingCashback}
        totalQcEarned={data.totalQcEarned}
      />

      <Card>
        <CardContent className="pt-4">
          <ClicksChart
            data={data.dailyClicks}
            currentRange={range}
            onRangeChange={(r) => setRange(r)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionFunnel
              totalClicks={data.totalClicks}
              conversions={data.conversions}
              claimedCashback={data.claimedCashback}
              totalQcEarned={data.totalQcEarned}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{data.referralCount}</p>
            <p className="text-xs text-muted-foreground">
              users joined via your invite code
            </p>
            {data.referralCount > 0 && (
              <a
                href="/affiliate/referrals"
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                View referred users →
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      {data.topLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {data.topLinks.map((link) => (
                <div
                  key={link.code}
                  className="flex items-center justify-between text-sm"
                >
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {link.code}
                  </code>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{link.clicks} clicks</span>
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      {link.earned} QC
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
