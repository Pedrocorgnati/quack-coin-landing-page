"use client";

// components/qc/UserRankCard.tsx
// Shows the current user's rank (fetched client-side from /api/leaderboard/my-rank).
// Used for users outside the top 50 display.

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatQC } from "@/lib/utils/formatters";

interface RankData {
  rank: number;
  totalQc: number;
  totalUsers: number;
}

interface UserRankCardProps {
  /** If user is in the top 50, their rank is already shown in the table. */
  topRankThreshold?: number;
}

export function UserRankCard({ topRankThreshold = 50 }: UserRankCardProps) {
  const [rank, setRank] = useState<RankData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard/my-rank")
      .then((r) => r.json())
      .then((data: RankData) => setRank(data))
      .catch(() => {
        /* silently degrade */
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  if (!rank) return null;

  // If user is in the top threshold, no need to show this card
  if (rank.rank <= topRankThreshold) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Your Rank</p>
          <p className="text-xs text-muted-foreground">
            #{rank.rank} of {rank.totalUsers.toLocaleString()} users
          </p>
        </div>
      </div>
      <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
        {formatQC(rank.totalQc)}
      </p>
    </div>
  );
}
