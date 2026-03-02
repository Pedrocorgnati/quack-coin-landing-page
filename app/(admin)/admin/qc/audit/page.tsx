"use client";

// app/(admin)/admin/qc/audit/page.tsx
// Admin QC audit trail — filterable table of all admin-initiated QC operations.

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionTypeBadge } from "@/components/qc/TransactionTypeBadge";
import { formatQC } from "@/lib/utils/formatters";

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  adminId: string | null;
  adminName: string | null;
  type: string;
  referenceType: string | null;
  amount: number;
  reason: string;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface AuditResponse {
  data: AuditEntry[];
  meta: Meta;
}

export default function AdminQcAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  const page = searchParams.get("page") ?? "1";
  const adminId = searchParams.get("adminId") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (adminId) params.set("adminId", adminId);
    if (userId) params.set("userId", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/admin/qc/audit?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as AuditResponse;
        setData(json.data);
        setMeta(json.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, adminId, userId, from, to]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/qc">
          <Button variant="ghost" size="icon" aria-label="Back to QC management">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">QC Audit Trail</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All admin-initiated QC operations.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Admin User ID</Label>
          <Input
            value={adminId}
            onChange={(e) => updateParam("adminId", e.target.value)}
            placeholder="Filter by admin…"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Target User ID</Label>
          <Input
            value={userId}
            onChange={(e) => updateParam("userId", e.target.value)}
            placeholder="Filter by user…"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => updateParam("from", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => updateParam("to", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Admin
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Target User
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Reason
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                data.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {entry.adminName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.userName}
                    </td>
                    <td className="px-4 py-3">
                      <TransactionTypeBadge type={entry.type as never} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-yellow-600 dark:text-yellow-400">
                      {formatQC(entry.amount)}
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                      {entry.reason}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {meta.total} entries — page {meta.page} of {meta.pages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={meta.page <= 1}
              onClick={() => goToPage(meta.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={meta.page >= meta.pages}
              onClick={() => goToPage(meta.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
