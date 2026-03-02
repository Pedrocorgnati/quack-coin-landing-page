"use client";

import Image from "next/image";
import { formatQC } from "@/lib/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface QCBalanceCardProps {
  balance: number;
  loading?: boolean;
  variant?: "compact" | "full";
  lastTransactionLabel?: string;
  className?: string;
  /** If set, shows an expiry warning in the full variant. */
  expiringQc?: { amount: number; expiresAt: Date } | null;
}

export function QCBalanceCard({
  balance,
  loading = false,
  variant = "compact",
  lastTransactionLabel,
  className,
  expiringQc,
}: QCBalanceCardProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
          "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
          className,
        )}
      >
        <Image
          src="/rubber-duck.png"
          alt="QuackCoin"
          width={14}
          height={14}
          className="h-3.5 w-3.5"
        />
        {loading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-sm font-semibold">{formatQC(balance)}</span>
        )}
      </div>
    );
  }

  // full variant
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        "border-yellow-500/30 bg-yellow-500/5",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <Image
          src="/rubber-duck.png"
          alt="QuackCoin"
          width={20}
          height={20}
          className="h-5 w-5"
        />
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          QuackCoin Balance
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
          {formatQC(balance)}
        </p>
      )}
      {!loading && lastTransactionLabel && (
        <p className="text-muted-foreground mt-1 text-xs">{lastTransactionLabel}</p>
      )}
      {!loading && expiringQc && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-orange-500/10 px-2 py-1 text-xs text-orange-600 dark:text-orange-400">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            {expiringQc.amount} QC expires by{" "}
            {expiringQc.expiresAt.toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
