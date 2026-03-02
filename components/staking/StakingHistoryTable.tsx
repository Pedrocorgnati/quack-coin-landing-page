"use client";

// components/staking/StakingHistoryTable.tsx
// Paginated table showing staking history (deposits, withdrawals, rewards, penalties).

import { useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { formatQC } from "@/lib/utils/formatters";
import { StakingEventType } from "@/lib/generated/prisma/client";
import type { StakingHistory } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 10;

const EVENT_LABEL: Record<StakingEventType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  REWARD: "Reward",
  PENALTY: "Penalty",
};

const EVENT_CLASS: Record<StakingEventType, string> = {
  DEPOSIT: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  WITHDRAWAL: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  REWARD: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  PENALTY: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

function AmountCell({ row }: { row: StakingHistory }) {
  const isPositive =
    row.eventType === StakingEventType.DEPOSIT ||
    row.eventType === StakingEventType.REWARD;
  const prefix = isPositive ? "+" : "-";
  const cls = isPositive
    ? "text-green-600 dark:text-green-400 tabular-nums font-medium"
    : "text-red-600 dark:text-red-400 tabular-nums font-medium";

  return (
    <span className={cls}>
      {prefix}
      {formatQC(row.amountQc)}
    </span>
  );
}

const columns: ColumnDef<StakingHistory>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    accessorKey: "eventType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.eventType;
      return (
        <Badge variant="outline" className={EVENT_CLASS[type]}>
          {EVENT_LABEL[type]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "amountQc",
    header: "Amount",
    cell: ({ row }) => <AmountCell row={row.original} />,
  },
  {
    accessorKey: "balanceAfter",
    header: "Running Total",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{formatQC(row.original.balanceAfter)}</span>
    ),
  },
];

interface StakingHistoryTableProps {
  history: StakingHistory[];
}

export function StakingHistoryTable({ history }: StakingHistoryTableProps) {
  const [{ pageIndex }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const pageCount = Math.ceil(history.length / PAGE_SIZE);
  const pageData = history.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  return (
    <DataTable
      columns={columns}
      data={pageData}
      pagination={{ pageIndex, pageSize: PAGE_SIZE }}
      pageCount={pageCount}
      onPageChange={(page) =>
        setPagination({ pageIndex: page, pageSize: PAGE_SIZE })
      }
    />
  );
}
