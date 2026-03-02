"use client";

// components/staking/StakeActionForm.tsx
// Stake / Unstake tab form. Calls deposit/withdraw APIs and invalidates page on success.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatQC } from "@/lib/utils/formatters";

interface StakeActionFormProps {
  availableBalance: number;
  currentStake: number;
  estimatedAPY: number;
}

function estimateDaily(amount: number, apy: number): number {
  if (amount <= 0) return 0;
  return Math.floor((amount * apy) / 365);
}

export function StakeActionForm({
  availableBalance,
  currentStake,
  estimatedAPY,
}: StakeActionFormProps) {
  const router = useRouter();

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stakeNum = parseInt(stakeAmount) || 0;
  const unstakeNum = parseInt(unstakeAmount) || 0;
  const previewDaily = estimateDaily(stakeNum, estimatedAPY);

  async function handleAction(endpoint: string, amount: number) {
    if (amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const json = (await res.json()) as {
        newBalance?: number;
        stakedAmount?: number;
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? "Operation failed");
        return;
      }

      setSuccess(
        endpoint.includes("deposit")
          ? `Successfully staked ${formatQC(amount)} QC!`
          : `Successfully unstaked ${formatQC(amount)} QC!`,
      );
      setStakeAmount("");
      setUnstakeAmount("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <Tabs defaultValue="stake">
        <TabsList className="w-full">
          <TabsTrigger value="stake" className="flex-1">
            Stake
          </TabsTrigger>
          <TabsTrigger value="unstake" className="flex-1">
            Unstake
          </TabsTrigger>
        </TabsList>

        {/* ── Stake tab ── */}
        <TabsContent value="stake" className="space-y-4 pt-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="stake-amount">Amount (QC)</Label>
              <span className="text-xs text-muted-foreground">
                Available: {formatQC(availableBalance)} QC
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id="stake-amount"
                type="number"
                min="1"
                max={availableBalance}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="0"
                className="tabular-nums"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setStakeAmount(String(availableBalance))}
                disabled={availableBalance === 0}
              >
                Max
              </Button>
            </div>
          </div>

          {stakeNum > 0 && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p className="text-muted-foreground">
                Estimated daily reward:{" "}
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  +{formatQC(previewDaily)} QC/day
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                At {(estimatedAPY * 100).toFixed(1)}% APY
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => void handleAction("/api/staking/deposit", stakeNum)}
            disabled={loading || stakeNum <= 0 || stakeNum > availableBalance}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Stake QC
          </Button>
        </TabsContent>

        {/* ── Unstake tab ── */}
        <TabsContent value="unstake" className="space-y-4 pt-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="unstake-amount">Amount (QC)</Label>
              <span className="text-xs text-muted-foreground">
                Staked: {formatQC(currentStake)} QC
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id="unstake-amount"
                type="number"
                min="1"
                max={currentStake}
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                placeholder="0"
                className="tabular-nums"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setUnstakeAmount(String(currentStake))}
                disabled={currentStake === 0}
              >
                Max
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => void handleAction("/api/staking/withdraw", unstakeNum)}
            disabled={loading || unstakeNum <= 0 || unstakeNum > currentStake}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Unstake QC
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
