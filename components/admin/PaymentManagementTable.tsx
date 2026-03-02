"use client";

// components/admin/PaymentManagementTable.tsx
// Admin table showing all MembershipPayments with filters, manual confirm, and Solscan links.

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentStatus, MembershipTier } from "@/lib/generated/prisma/client";

interface PaymentRow {
  id: string;
  userId: string;
  tier: MembershipTier;
  amountUsdc: string;
  status: PaymentStatus;
  txSignature: string | null;
  validFrom: string | null;
  createdAt: string;
  user: { email: string; name: string | null };
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const STATUS_VARIANT: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> =
  {
    PENDING: "secondary",
    CONFIRMED: "default",
    FAILED: "destructive",
    EXPIRED: "outline",
    REFUNDED: "outline",
  };

const SOLSCAN_TX = (sig: string) =>
  `https://solscan.io/tx/${sig}`;

export function PaymentManagementTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual confirm dialog state
  const [confirmTarget, setConfirmTarget] = useState<PaymentRow | null>(null);
  const [txInput, setTxInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const page = searchParams.get("page") ?? "1";
  const status = searchParams.get("status") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page });
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load payments");
      const json = (await res.json()) as { data: PaymentRow[]; meta: Meta };
      setRows(json.data);
      setMeta(json.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, status, from, to]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
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

  const openConfirm = (row: PaymentRow) => {
    setConfirmTarget(row);
    setTxInput("");
    setPasswordInput("");
    setConfirmError(null);
  };

  const closeConfirm = () => {
    setConfirmTarget(null);
    setTxInput("");
    setPasswordInput("");
    setConfirmError(null);
  };

  const submitConfirm = async () => {
    if (!confirmTarget) return;
    if (!txInput.trim()) {
      setConfirmError("Transaction signature is required.");
      return;
    }
    if (!passwordInput.trim()) {
      setConfirmError("Admin password is required.");
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const res = await fetch(`/api/admin/payments/${confirmTarget.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": passwordInput,
        },
        body: JSON.stringify({ txSignature: txInput.trim() }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setConfirmError(json.error ?? "Confirmation failed");
        return;
      }

      closeConfirm();
      await fetchData();
    } catch {
      setConfirmError("Network error — please try again.");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={status || "ALL"}
            onValueChange={(v) => updateParam("status", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
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

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No payments found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.user.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.user.email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.tier}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {parseFloat(row.amountUsdc).toFixed(2)} USDC
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === "CONFIRMED" && row.txSignature && (
                          <a
                            href={SOLSCAN_TX(row.txSignature)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                            aria-label="View transaction on Solscan"
                          >
                            Solscan
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        )}
                        {row.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openConfirm(row)}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Confirm
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {meta.total} payments — page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={!meta.hasPrev}
              onClick={() => goToPage(meta.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={!meta.hasNext}
              onClick={() => goToPage(meta.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Manual Confirm Dialog */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) closeConfirm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manually Confirm Payment</DialogTitle>
            <DialogDescription>
              This bypasses on-chain verification. Use only for exceptional cases.
              Payment ID: <code className="text-xs">{confirmTarget?.id}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="txSignature">Transaction Signature</Label>
              <Input
                id="txSignature"
                value={txInput}
                onChange={(e) => setTxInput(e.target.value)}
                placeholder="5nP8Xg…"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adminPassword">Admin Password (re-confirmation)</Label>
              <Input
                id="adminPassword"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter admin confirm password"
              />
            </div>
            {confirmError && (
              <p className="text-sm text-destructive">{confirmError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm} disabled={confirmLoading}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => void submitConfirm()}
              disabled={confirmLoading}
            >
              {confirmLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Confirming…
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
