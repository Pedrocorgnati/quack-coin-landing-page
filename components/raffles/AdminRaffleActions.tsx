// components/raffles/AdminRaffleActions.tsx
// Client component — activate, draw, and view results actions for admin raffle table.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RaffleStatus } from "@/lib/generated/prisma/client";

interface AdminRaffleActionsProps {
  raffle: { id: string; status: RaffleStatus };
}

export function AdminRaffleActions({ raffle }: AdminRaffleActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAction(endpoint: string, label: string) {
    setLoading(label);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {raffle.status === "UPCOMING" && (
        <button
          onClick={() =>
            callAction(`/api/admin/raffles/${raffle.id}/activate`, "activate")
          }
          disabled={loading === "activate"}
          className="rounded px-2 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading === "activate" ? "…" : "Activate"}
        </button>
      )}

      {raffle.status === "ACTIVE" && (
        <button
          onClick={() =>
            callAction(`/api/admin/raffles/${raffle.id}/draw`, "draw")
          }
          disabled={loading === "draw"}
          className="rounded px-2 py-1 text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
        >
          {loading === "draw" ? "…" : "Draw Now"}
        </button>
      )}

      {raffle.status === "COMPLETED" && (
        <Link
          href={`/admin/raffles/${raffle.id}`}
          className="rounded px-2 py-1 text-xs font-medium border hover:bg-muted/50"
        >
          Results
        </Link>
      )}

      {error && (
        <span className="text-xs text-destructive" title={error}>
          ⚠ {error}
        </span>
      )}
    </div>
  );
}
