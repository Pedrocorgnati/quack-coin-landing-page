// components/qc/TransactionTypeBadge.tsx
// Color-coded badge for QuackCoinTransaction types.

import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/generated/prisma/client";

interface TransactionTypeBadgeProps {
  type: TransactionType;
}

const CONFIG: Record<TransactionType, { label: string; className: string }> = {
  EARN: {
    label: "Earn",
    className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  },
  SPEND: {
    label: "Spend",
    className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
  REFUND: {
    label: "Refund",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  REWARD: {
    label: "Reward",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  },
  BONUS: {
    label: "Bonus",
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  REFERRAL: {
    label: "Referral",
    className: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
  },
};

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  const cfg = CONFIG[type] ?? {
    label: type,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}
