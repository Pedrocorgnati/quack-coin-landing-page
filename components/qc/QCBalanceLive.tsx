"use client";

// components/qc/QCBalanceLive.tsx
// Client wrapper that polls /api/user/qc-balance and keeps QCBalanceCard in sync.
// Used in places where we want near-real-time balance without a full page refresh.

import { useEffect, useState, useCallback } from "react";
import { QCBalanceCard } from "@/components/shared/QCBalanceCard";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

interface QCBalanceLiveProps {
  /** Initial balance from the server (avoids loading flash). */
  initialBalance: number;
  /** Optional label from the last transaction. */
  initialLastEarned?: string | null;
  variant?: "compact" | "full";
  className?: string;
}

interface BalanceResponse {
  balance: number;
  lastEarned: { amount: number; reason: string; createdAt: string } | null;
}

export function QCBalanceLive({
  initialBalance,
  initialLastEarned,
  variant = "compact",
  className,
}: QCBalanceLiveProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [lastLabel, setLastLabel] = useState(initialLastEarned ?? null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/user/qc-balance");
      if (!res.ok) return;
      const data = (await res.json()) as BalanceResponse;
      setBalance(data.balance);
      if (data.lastEarned) {
        const date = new Date(data.lastEarned.createdAt).toLocaleDateString();
        setLastLabel(`+${data.lastEarned.amount} QC on ${date}`);
      }
    } catch {
      // Silently ignore; keeps showing stale balance
    }
  }, []);

  // Poll every 30 s to pick up background earn events (e.g., signIn hook)
  useEffect(() => {
    setLoading(false); // initial render uses server value — no skeleton
    const id = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <QCBalanceCard
      balance={balance}
      loading={loading}
      variant={variant}
      lastTransactionLabel={lastLabel ?? undefined}
      className={className}
    />
  );
}
