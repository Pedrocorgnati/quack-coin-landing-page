"use client";

// components/dashboard/MetricCard.tsx
// Stat card with icon, title, value, optional change indicator, and skeleton loading state.

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value?: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  change?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  loading = false,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? "—"}</div>
            {change && (
              <div
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  change.direction === "up" && "text-green-600 dark:text-green-400",
                  change.direction === "down" && "text-red-600 dark:text-red-400",
                  change.direction === "neutral" && "text-muted-foreground",
                )}
              >
                {change.direction === "up" && (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                )}
                {change.direction === "down" && (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                {change.direction === "neutral" && (
                  <Minus className="h-3 w-3" aria-hidden="true" />
                )}
                <span>
                  {change.value}
                  {change.label ? ` ${change.label}` : ""}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
