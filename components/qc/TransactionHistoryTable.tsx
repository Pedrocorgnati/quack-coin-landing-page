"use client";

// components/qc/TransactionHistoryTable.tsx
// Paginated table of QuackCoin transactions.

import type { QuackCoinTransaction } from "@/lib/generated/prisma/client";
import type { PaginationMeta } from "@/lib/types";
import { TransactionTypeBadge } from "@/components/qc/TransactionTypeBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface TransactionHistoryTableProps {
  transactions: QuackCoinTransaction[];
  meta: PaginationMeta;
}

function formatAmount(amount: number): string {
  return amount > 0 ? `+${amount}` : String(amount);
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionHistoryTable({
  transactions,
  meta,
}: TransactionHistoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Earn QuackCoins through daily check-ins and course completions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Reason
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Amount
              </th>
              <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="bg-card transition-colors hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <TransactionTypeBadge type={tx.type} />
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-foreground">
                  {tx.reason}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold tabular-nums",
                    tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatAmount(tx.amount)} QC
                </td>
                <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground sm:table-cell">
                  {formatDate(tx.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!meta.hasPrev}
              onClick={() => goToPage(meta.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!meta.hasNext}
              onClick={() => goToPage(meta.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
