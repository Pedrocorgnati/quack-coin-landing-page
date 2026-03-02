"use client";

// components/qc/TransactionFilters.tsx
// Type + date-range filters for the transaction history page.
// Filters are stored as URL search params so they survive navigation.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { TransactionType } from "@/lib/generated/prisma/client";

const TYPE_LABELS: Record<TransactionType | "all", string> = {
  all: "All Types",
  EARN: "Earn",
  SPEND: "Spend",
  REFUND: "Refund",
  REWARD: "Reward",
  BONUS: "Bonus",
  REFERRAL: "Referral",
};

const TYPE_OPTIONS: Array<TransactionType | "all"> = [
  "all",
  "EARN",
  "SPEND",
  "REFUND",
  "REWARD",
  "BONUS",
  "REFERRAL",
];

interface TransactionFiltersProps {
  currentType?: string;
  currentFrom?: string;
  currentTo?: string;
}

export function TransactionFilters({
  currentType = "all",
  currentFrom,
  currentTo,
}: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1"); // reset to page 1 on filter change
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const hasFilters =
    (currentType && currentType !== "all") || currentFrom || currentTo;

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("from");
    params.delete("to");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type filter */}
      <Select
        value={currentType}
        onValueChange={(val) => updateParams({ type: val })}
      >
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((t) => (
            <SelectItem key={t} value={t} className="text-xs">
              {TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range: from */}
      <input
        type="date"
        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        value={currentFrom ?? ""}
        onChange={(e) => updateParams({ from: e.target.value })}
        aria-label="From date"
      />

      <span className="text-xs text-muted-foreground">to</span>

      {/* Date range: to */}
      <input
        type="date"
        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        value={currentTo ?? ""}
        onChange={(e) => updateParams({ to: e.target.value })}
        aria-label="To date"
      />

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={clearFilters}
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
