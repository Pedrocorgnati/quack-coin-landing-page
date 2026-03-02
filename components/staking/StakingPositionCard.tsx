"use client";

// components/staking/StakingPositionCard.tsx
// Shows current staked QC, estimated daily reward, current APY, and last reward info.

import { TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatQC } from "@/lib/utils/formatters";

interface StakingPositionCardProps {
  stakedAmount: number;
  estimatedDailyReward: number;
  estimatedAPY: number;
  lastRewardAt: Date | string | null;
}

function hoursUntilNextReward(lastRewardAt: Date | string | null): string {
  if (!lastRewardAt) return "24h";
  const last = new Date(lastRewardAt);
  const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();
  if (diffMs <= 0) return "soon";
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function StakingPositionCard({
  stakedAmount,
  estimatedDailyReward,
  estimatedAPY,
  lastRewardAt,
}: StakingPositionCardProps) {
  const apyPercent = (estimatedAPY * 100).toFixed(1);
  const nextRewardIn = hoursUntilNextReward(lastRewardAt);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-yellow-500" aria-hidden="true" />
          Your Staking Position
          {stakedAmount > 0 && (
            <Badge variant="default" className="ml-auto bg-green-600 text-xs">
              ACTIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* @ASSET_PLACEHOLDER
        name: staking-hero
        type: image
        format: png
        aspect_ratio: 16:9
        dimensions: 800x200
        description: Abstract digital visualization of tokens being locked and generating yield, blockchain staking concept
        context: Staking page hero banner (decorative, displayed above stats)
        style: flat illustration, crypto/web3 aesthetic, minimal
        mood: futuristic, rewarding, trustworthy
        colors: yellow (#FACC15), dark background (#1C1917), gold accents
        elements: coins, lock icon, upward arrow, subtle grid pattern
        avoid: people, hands, realistic photography
        */}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Staked</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatQC(stakedAmount)}
            </p>
            <p className="text-xs text-muted-foreground">QC</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Daily Reward</p>
            <p className="text-2xl font-bold tabular-nums text-yellow-600 dark:text-yellow-400">
              +{formatQC(estimatedDailyReward)}
            </p>
            <p className="text-xs text-muted-foreground">QC/day</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Current APY</p>
            <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
              {apyPercent}%
            </p>
            <p className="text-xs text-muted-foreground">annual</p>
          </div>

          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Next Reward
            </p>
            <p className="text-lg font-semibold tabular-nums">{nextRewardIn}</p>
            {lastRewardAt && (
              <p className="text-xs text-muted-foreground">
                Last: {new Date(lastRewardAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {stakedAmount === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No active stake. Deposit QC below to start earning rewards.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
