"use client";

// components/raffles/RaffleEntryForm.tsx
// Form to enter a raffle — shows ticket count selector, total cost preview, and submit.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RaffleStatus } from "@/lib/generated/prisma/client";

interface RaffleEntryFormProps {
  raffleId: string;
  status: RaffleStatus;
  ticketPriceQc: number;
  maxTickets: number | null;
  userBalance: number;
  currentTickets: number;
}

export function RaffleEntryForm({
  raffleId,
  status,
  ticketPriceQc,
  maxTickets,
  userBalance,
  currentTickets,
}: RaffleEntryFormProps) {
  const router = useRouter();
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isActive = status === RaffleStatus.ACTIVE;
  const totalCost = count * ticketPriceQc;
  const canAfford = userBalance >= totalCost;
  const canEnter = isActive && canAfford && count >= 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEnter) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/raffles/${raffleId}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCount: count }),
      });

      const data = await res.json() as { error?: string; ticketCount?: number };
      if (!res.ok) {
        setError(data.error ?? "Failed to enter raffle");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isActive) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {status === RaffleStatus.UPCOMING
          ? "This raffle hasn't started yet."
          : status === RaffleStatus.DRAWING
          ? "Drawing is in progress…"
          : "This raffle has ended."}
      </p>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-2">
        <p className="text-primary font-semibold">🎉 You&apos;re entered!</p>
        <p className="text-sm text-muted-foreground">
          You now have {currentTickets + count} ticket{currentTickets + count !== 1 ? "s" : ""} in this raffle.
        </p>
        <Button variant="outline" size="sm" onClick={() => { setSuccess(false); setCount(1); }}>
          Enter more tickets
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ticket-count">Number of tickets</Label>
        <Input
          id="ticket-count"
          type="number"
          min={1}
          max={maxTickets ?? undefined}
          value={count}
          onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          {ticketPriceQc} QC per ticket
          {maxTickets !== null && ` · max ${maxTickets} total tickets`}
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tickets</span>
          <span>{count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total cost</span>
          <span className="font-semibold">{totalCost} QC</span>
        </div>
        <div className="flex justify-between border-t pt-1.5">
          <span className="text-muted-foreground">Your balance</span>
          <span className={canAfford ? "text-foreground" : "text-destructive"}>
            {userBalance} QC
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!canAfford && (
        <p className="text-sm text-destructive">Insufficient QC balance.</p>
      )}

      <Button
        type="submit"
        disabled={!canEnter || loading}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Ticket className="h-4 w-4 mr-2" />
        )}
        Enter Raffle — {totalCost} QC
      </Button>
    </form>
  );
}
