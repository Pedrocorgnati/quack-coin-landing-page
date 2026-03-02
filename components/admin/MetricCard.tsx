// components/admin/MetricCard.tsx
// Admin stat card with value, label, trend badge, icon, and skeleton variant.

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricVariant = "success" | "warning" | "danger" | "neutral";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: MetricVariant;
  /** Trend percentage vs previous period. e.g. 12.5 means +12.5% */
  trend?: number;
  loading?: boolean;
}

const variantStyles: Record<MetricVariant, { bg: string; icon: string; badge: string }> = {
  success: {
    bg: "bg-green-500/10",
    icon: "text-green-600 dark:text-green-400",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  },
  warning: {
    bg: "bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  danger: {
    bg: "bg-red-500/10",
    icon: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  neutral: {
    bg: "bg-muted/60",
    icon: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

function TrendBadge({ trend }: { trend: number }) {
  const positive = trend > 0;
  const neutral = trend === 0;
  const Icon = neutral ? Minus : positive ? TrendingUp : TrendingDown;
  const className = cn(
    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
    positive
      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
      : neutral
      ? "bg-muted text-muted-foreground"
      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  );

  return (
    <span className={className} aria-label={`${positive ? "+" : ""}${trend.toFixed(1)}% vs previous period`}>
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {positive && "+"}
      {trend.toFixed(1)}%
    </span>
  );
}

export function MetricCard({ label, value, icon: Icon, variant = "neutral", trend, loading }: MetricCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", styles.bg)}>
          <Icon className={cn("h-4 w-4", styles.icon)} aria-hidden />
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {trend !== undefined && <TrendBadge trend={trend} />}
    </div>
  );
}
