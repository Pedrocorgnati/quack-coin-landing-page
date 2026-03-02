"use client";

// components/admin/AdminCashbackTable.tsx
// Admin table of pending cashback transactions with approve/reject actions.

import { useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CashbackRow {
  id: string;
  amountQc: number;
  purchaseAmount: number;
  expiresAt: Date | null;
  createdAt: Date;
  user: { id: string; name: string | null; email: string };
  affiliateClick: {
    createdAt: Date;
    convertedAt: Date | null;
    affiliateLink: { code: string } | null;
  } | null;
}

interface AdminCashbackTableProps {
  rows: CashbackRow[];
}

export function AdminCashbackTable({ rows: initialRows }: AdminCashbackTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/cashback/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Rejection reason (optional):") ?? "";
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/cashback/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setProcessing(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No pending cashback transactions.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="pb-2 text-left font-medium">User</th>
            <th className="pb-2 text-left font-medium">Link</th>
            <th className="pb-2 text-right font-medium">Purchase</th>
            <th className="pb-2 text-right font-medium">QC</th>
            <th className="pb-2 text-left font-medium">Click Date</th>
            <th className="pb-2 text-left font-medium">Expires</th>
            <th className="pb-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="py-3">
                <div>
                  <p className="font-medium">{row.user.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{row.user.email}</p>
                </div>
              </td>
              <td className="py-3">
                {row.affiliateClick?.affiliateLink?.code ? (
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                    {row.affiliateClick.affiliateLink.code}
                  </code>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="py-3 text-right">${row.purchaseAmount.toFixed(2)}</td>
              <td className="py-3 text-right font-medium text-yellow-600 dark:text-yellow-400">
                {row.amountQc} QC
              </td>
              <td className="py-3 text-xs text-muted-foreground">
                {row.affiliateClick
                  ? new Date(row.affiliateClick.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </td>
              <td className="py-3 text-xs text-muted-foreground">
                {row.expiresAt ? (
                  new Date(row.expiresAt) < new Date() ? (
                    <Badge variant="secondary" className="text-xs">Expired</Badge>
                  ) : (
                    new Date(row.expiresAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  )
                ) : (
                  "Never"
                )}
              </td>
              <td className="py-3 text-right">
                <div className="flex gap-1 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-green-700 border-green-500/30 hover:bg-green-500/10"
                    disabled={processing === row.id}
                    onClick={() => handleApprove(row.id)}
                    aria-label="Approve cashback"
                  >
                    {processing === row.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-700 border-red-500/30 hover:bg-red-500/10"
                    disabled={processing === row.id}
                    onClick={() => handleReject(row.id)}
                    aria-label="Reject cashback"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
