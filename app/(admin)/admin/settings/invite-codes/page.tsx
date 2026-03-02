"use client";

// app/(admin)/admin/settings/invite-codes/page.tsx
// Admin invite code management: paginated table, bulk generate, copy, revoke, CSV export.

import { useEffect, useState, useCallback } from "react";
import { Plus, Copy, Ban, Download, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface InviteCode {
  id: string;
  code: string;
  usedAt: string | null;
  usedByEmail: string | null;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  createdAt: string;
  isActive: boolean;
  issuedBy: { id: string; email: string; name: string | null };
}

interface CodesResponse {
  codes: InviteCode[];
  total: number;
  page: number;
  pages: number;
}

const COUNT_OPTIONS = [1, 5, 10, 20] as const;
type GenerateCount = (typeof COUNT_OPTIONS)[number];

// ── Component ──────────────────────────────────────────────────────────────

export default function InviteCodesPage() {
  const [data, setData] = useState<CodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState<GenerateCount>(5);
  const [filterActive, setFilterActive] = useState<string>("");
  const [filterUsed, setFilterUsed] = useState<string>("");
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<InviteCode | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filterActive) params.set("active", filterActive);
    if (filterUsed) params.set("used", filterUsed);
    params.set("page", String(page));
    return params.toString();
  }, [filterActive, filterUsed, page]);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/invite-codes?${buildQuery()}`);
      if (!res.ok) return;
      const json: CodesResponse = await res.json();
      setData(json);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { void fetchCodes(); }, [fetchCodes]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: generateCount }),
      });
      setPage(1);
      void fetchCodes();
    } catch {
      // fail silently
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await fetch("/api/admin/invite-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: revokeTarget.code }),
      });
      void fetchCodes();
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback — silently ignore
    }
  }

  function handleExportCSV() {
    const params = new URLSearchParams();
    if (filterActive) params.set("active", filterActive);
    if (filterUsed) params.set("used", filterUsed);
    window.open(`/api/admin/invite-codes/export?${params.toString()}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invite Codes</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString()} codes` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Select
            value={String(generateCount)}
            onValueChange={(v) => setGenerateCount(Number(v) as GenerateCount)}
          >
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {generating ? "Generating..." : `Generate ${generateCount}`}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterActive || "__all__"} onValueChange={(v) => { setFilterActive(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterUsed || "__all__"} onValueChange={(v) => { setFilterUsed(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Used" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="false">Unused</SelectItem>
            <SelectItem value="true">Used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Used by</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Expires</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-3 w-28 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 w-36 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-20 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 animate-pulse rounded-full bg-muted" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-7 w-20 animate-pulse rounded bg-muted ml-auto" /></td>
                  </tr>
                ))
              : data?.codes.map((code) => (
                  <tr key={code.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{code.code}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {code.usedByEmail ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {code.expiresAt
                        ? new Date(code.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      {code.isActive ? (
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-700 dark:text-green-400">
                          Active
                        </Badge>
                      ) : code.usedAt ? (
                        <Badge variant="secondary" className="text-xs">Used</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Expired</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn("h-7 w-7 p-0", copiedCode === code.code && "text-green-600")}
                          onClick={() => handleCopy(code.code)}
                          title="Copy code"
                        >
                          {copiedCode === code.code
                            ? <Check className="h-3.5 w-3.5" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        {code.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-600"
                            onClick={() => setRevokeTarget(code)}
                            title="Revoke code"
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && data?.codes.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No codes found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {data.page} of {data.pages}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Revoke confirm dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open: boolean) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke code <code className="font-mono">{revokeTarget?.code}</code>?</DialogTitle>
            <DialogDescription>
              This code will be expired immediately and cannot be used for registration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
