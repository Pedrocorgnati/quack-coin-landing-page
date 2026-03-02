"use client";

// components/qc/DailyLoginReward.tsx
// Shows whether daily QC has been claimed. Allows claiming via button.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Coins, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyLoginRewardProps {
  alreadyClaimed: boolean;
  dailyAmount: number; // QC to earn (from SiteConfig)
  /** ISO string of when today's claim was made (if already claimed) */
  claimedAt?: string;
}

function getNextMidnight(): string {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
  );
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export function DailyLoginReward({
  alreadyClaimed: initialClaimed,
  dailyAmount,
}: DailyLoginRewardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(initialClaimed);
  const [justEarned, setJustEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = () => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/qc/claim-daily", { method: "POST" });
        const data = (await res.json()) as { earned: number; alreadyClaimed: boolean };
        if (data.alreadyClaimed) {
          setClaimed(true);
        } else {
          setClaimed(true);
          setJustEarned(data.earned);
          router.refresh(); // Refresh Server Components to update balance
        }
      } catch {
        setError("Failed to claim. Please try again.");
      }
    });
  };

  if (claimed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {justEarned ? `+${justEarned} QC claimed!` : "Daily QC claimed"}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              Come back in {getNextMidnight()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
          <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">Daily Check-in</p>
          <p className="text-xs text-muted-foreground">
            Claim your {dailyAmount} QC reward for today
          </p>
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
      </div>
      <Button
        onClick={handleClaim}
        disabled={isPending}
        size="sm"
        className={cn(
          "bg-yellow-500 hover:bg-yellow-400 text-black font-semibold shrink-0",
          isPending && "opacity-70",
        )}
      >
        {isPending ? "Claiming…" : `Claim ${dailyAmount} QC`}
      </Button>
    </div>
  );
}
