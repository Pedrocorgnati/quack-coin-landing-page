"use client";

// components/membership/BillingHistoryTable.tsx
// Client component — paginated table of MembershipPayment records.

import { useState, useEffect, useCallback } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import type { MembershipTier, PaymentStatus } from "@/lib/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────
// Row type (matches API response)
// ─────────────────────────────────────────────────────────────────

interface BillingRow {
  id: string;
  tier: MembershipTier;
  amountUsdc: string;
  status: PaymentStatus;
  txSignature: string | null;
  createdAt: string;
  validFrom: string | null;
  validUntil: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  FAILED: "destructive",
  EXPIRED: "outline",
  REFUNDED: "outline",
};

function truncateSig(sig: string): string {
  return `${sig.slice(0, 6)}…${sig.slice(-6)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────────────────────────

const COLUMNS: ColumnDef<BillingRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    accessorKey: "tier",
    header: "Tier",
    cell: ({ row }) => (
      <span className="text-sm font-medium capitalize">
        {row.original.tier.charAt(0) + row.original.tier.slice(1).toLowerCase()}
      </span>
    ),
  },
  {
    accessorKey: "amountUsdc",
    header: "Amount",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.amountUsdc} USDC</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "txSignature",
    header: "Transaction",
    cell: ({ row }) => {
      const sig = row.original.txSignature;
      if (!sig) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <a
          href={`https://solscan.io/tx/${sig}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-blue-500 underline hover:text-blue-600"
          title={sig}
        >
          {truncateSig(sig)}
        </a>
      );
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

interface BillingHistoryTableProps {
  initialData?: BillingRow[];
  initialTotal?: number;
}

export function BillingHistoryTable({
  initialData = [],
  initialTotal = 0,
}: BillingHistoryTableProps) {
  const [data, setData] = useState<BillingRow[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const fetchPage = useCallback(async (page: number, limit: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`/api/user/billing?${params.toString()}`);
      if (!res.ok) return;
      const json = (await res.json()) as { data: BillingRow[]; total: number };
      setData(json.data);
      setTotal(json.total);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch when pagination changes (skip initial load if we have initialData)
  useEffect(() => {
    if (pagination.pageIndex === 0 && initialData.length > 0) return;
    void fetchPage(pagination.pageIndex + 1, pagination.pageSize);
  }, [pagination.pageIndex, pagination.pageSize, fetchPage, initialData.length]);

  const pageCount = Math.ceil(total / pagination.pageSize);

  return (
    <DataTable
      columns={COLUMNS}
      data={data}
      isLoading={isLoading}
      pagination={pagination}
      pageCount={pageCount}
      onPageChange={(page) => setPagination((p) => ({ ...p, pageIndex: page }))}
      skeletonRows={5}
    />
  );
}
