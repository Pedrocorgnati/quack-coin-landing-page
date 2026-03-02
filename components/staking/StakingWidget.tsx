// components/staking/StakingWidget.tsx
// Dashboard staking summary widget. Shows staked QC and daily reward estimate.

import Link from "next/link";
import { TrendingUp, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatQC } from "@/lib/utils/formatters";

interface StakingWidgetProps {
  stakedAmount: number;
  estimatedDailyReward: number;
}

export function StakingWidget({ stakedAmount, estimatedDailyReward }: StakingWidgetProps) {
  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-yellow-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">
              {formatQC(stakedAmount)} staked
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-yellow-600 dark:text-yellow-400">
                earning +{formatQC(estimatedDailyReward)}/day
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Your staking position is active</p>
          </div>
        </div>
        <Link
          href="/staking"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go to staking page"
        >
          Manage <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
