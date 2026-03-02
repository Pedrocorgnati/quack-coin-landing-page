// components/qc/LeaderboardTable.tsx
// Leaderboard table. Top 3 get gold/silver/bronze highlights.

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MembershipTierBadge } from "@/components/shared/MembershipTierBadge";
import { formatQC } from "@/lib/utils/formatters";
import type { MembershipTier } from "@/lib/generated/prisma/client";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  membershipTier: string;
  totalQc: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

const MEDAL_COLORS: Record<number, string> = {
  1: "text-yellow-500",
  2: "text-slate-400",
  3: "text-amber-600",
};

const ROW_BG: Record<number, string> = {
  1: "bg-yellow-500/5 dark:bg-yellow-500/10",
  2: "bg-slate-500/5 dark:bg-slate-500/10",
  3: "bg-amber-600/5 dark:bg-amber-600/10",
};

function AvatarInitials({ name, size = 8 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        `flex h-${size} w-${size} shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground`,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
        No leaderboard data yet. Start earning QC!
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="w-12 px-4 py-3 text-center font-medium text-muted-foreground">
              #
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              User
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
              Tier
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Total QC
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            const isTop3 = entry.rank <= 3;

            return (
              <tr
                key={entry.userId}
                className={cn(
                  "transition-colors",
                  isTop3 ? ROW_BG[entry.rank] : "bg-card",
                  isCurrentUser && "ring-1 ring-inset ring-primary/40",
                )}
              >
                {/* Rank */}
                <td className="px-4 py-3 text-center">
                  {entry.rank === 1 ? (
                    <Crown
                      className={cn(
                        "mx-auto h-4 w-4",
                        MEDAL_COLORS[entry.rank],
                      )}
                      aria-label="1st place"
                    />
                  ) : (
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        MEDAL_COLORS[entry.rank] ?? "text-muted-foreground",
                      )}
                    >
                      {entry.rank}
                    </span>
                  )}
                </td>

                {/* User */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AvatarInitials name={entry.displayName} />
                    <span
                      className={cn(
                        "font-medium",
                        isCurrentUser ? "text-primary" : "text-foreground",
                      )}
                    >
                      {entry.displayName}
                      {isCurrentUser && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </span>
                  </div>
                </td>

                {/* Tier */}
                <td className="hidden px-4 py-3 sm:table-cell">
                  <MembershipTierBadge
                    tier={entry.membershipTier as MembershipTier}
                  />
                </td>

                {/* Total QC */}
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-yellow-600 dark:text-yellow-400">
                  {formatQC(entry.totalQc)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
