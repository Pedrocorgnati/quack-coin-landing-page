"use client";

// components/affiliate/CashbackHistoryTable.tsx
// Table of cashback transactions with status (pending/claimed/expired) and claim button.

import { useState, useEffect, useCallback } from "react";
import { Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CashbackItem {
  id: string;
  amountQc: number;
  purchaseAmount: number;
  cashbackRate: number;
  expiresAt: string | null;
  claimedAt: string | null;
  createdAt: string;
  affiliateClick: { createdAt: string; convertedAt: string | null } | null;
}

function getStatus(item: CashbackItem): "claimed" | "expired" | "pending" {
  if (item.claimedAt) return "claimed";
  if (item.expiresAt && new Date(item.expiresAt) < new Date()) return "expired";
  return "pending";
}

export function CashbackHistoryTable() {
  const [items, setItems] = useState<CashbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/cashback");
      if (res.ok) {
        const data = await res.json();
        setItems(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  async function handleClaim(id: string) {
    setClaiming(id);
    try {
      const res = await fetch("/api/affiliate/cashback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashbackId: id }),
      });
      if (res.ok) {
        await fetchItems();
      }
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No cashback transactions yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="pb-2 text-left font-medium">Date</th>
            <th className="pb-2 text-right font-medium">Purchase</th>
            <th className="pb-2 text-right font-medium">QC</th>
            <th className="pb-2 text-center font-medium">Status</th>
            <th className="pb-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getStatus(item);
            return (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-3 text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="py-3 text-right">
                  ${item.purchaseAmount.toFixed(2)}
                </td>
                <td className="py-3 text-right font-medium text-yellow-600 dark:text-yellow-400">
                  <span className="flex items-center justify-end gap-1">
                    <Coins className="h-3 w-3" aria-hidden="true" />
                    {item.amountQc}
                  </span>
                </td>
                <td className="py-3 text-center">
                  {status === "claimed" && (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                      Claimed
                    </Badge>
                  )}
                  {status === "expired" && (
                    <Badge variant="secondary" className="text-xs">Expired</Badge>
                  )}
                  {status === "pending" && (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="py-3 text-right">
                  {status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={claiming === item.id}
                      onClick={() => handleClaim(item.id)}
                    >
                      {claiming === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Claim"
                      )}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
