"use client";

// components/membership/MembershipStatusCard.tsx
// Displays current membership tier, expiry countdown, and active benefits.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MembershipTierBadge } from "@/components/shared/MembershipTierBadge";
import { MembershipTier } from "@/lib/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface MembershipStatusCardProps {
  tier: MembershipTier;
  expiresAt?: Date | null;
  qcMultiplier: number;
  stakingBonus: number;
  cashbackBonus: number;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function expiryColor(days: number): string {
  if (days > 30) return "text-green-600 dark:text-green-400";
  if (days > 7) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function MembershipStatusCard({
  tier,
  expiresAt,
  qcMultiplier,
  stakingBonus,
  cashbackBonus,
  className,
}: MembershipStatusCardProps) {
  const isFree = tier === MembershipTier.FREE;
  const isNotPlatinum = tier !== MembershipTier.PLATINUM;
  const now = new Date();
  const isExpired = expiresAt ? expiresAt <= now : true;
  const days = expiresAt ? daysUntil(expiresAt) : null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Membership</CardTitle>
            <CardDescription className="mt-0.5">
              {isFree ? "Free plan" : `${tier.charAt(0)}${tier.slice(1).toLowerCase()} plan`}
            </CardDescription>
          </div>
          <MembershipTierBadge tier={tier} expiresAt={expiresAt ?? undefined} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Expiry row */}
        {!isFree && expiresAt && (
          <div className="text-sm">
            {isExpired ? (
              <span className="font-medium text-destructive">
                Expired {formatDate(expiresAt)}
              </span>
            ) : (
              <span>
                Expires {formatDate(expiresAt)}
                {days !== null && (
                  <span className={`ml-2 font-semibold ${expiryColor(days)}`}>
                    ({days}d left)
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {/* Benefits summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted px-2 py-1.5">
            <p className="text-xs text-muted-foreground">QC</p>
            <p className="text-sm font-bold">{qcMultiplier}x</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-1.5">
            <p className="text-xs text-muted-foreground">Staking</p>
            <p className="text-sm font-bold">+{stakingBonus}%</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-1.5">
            <p className="text-xs text-muted-foreground">Cashback</p>
            <p className="text-sm font-bold">{cashbackBonus}%</p>
          </div>
        </div>

        {/* CTA */}
        {isNotPlatinum && (
          <Button asChild size="sm" className="w-full" variant={isFree ? "default" : "outline"}>
            <Link href="/membership/upgrade">
              {isFree ? "Upgrade" : isExpired ? "Renew" : "Upgrade"}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
