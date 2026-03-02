"use client";

// components/badges/BadgeCard.tsx
// Badge card — earned badges are full color; unearned are grayscale with a lock overlay.

import Image from "next/image";
import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BadgeWithEarnedStatus } from "@/lib/services/badge.service";

interface BadgeCardProps {
  badge: BadgeWithEarnedStatus;
  compact?: boolean;
}

export function BadgeCard({ badge, compact = false }: BadgeCardProps) {
  const imageSize = compact ? 40 : 64;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              relative flex flex-col items-center gap-2 rounded-xl border bg-card p-4
              transition-shadow hover:shadow-md
              ${!badge.earned ? "opacity-60" : ""}
              ${compact ? "p-2 gap-1" : "p-4 gap-2"}
            `}
          >
            {/* Badge image */}
            <div className="relative">
              <Image
                src={badge.imageUrl}
                alt={badge.name}
                width={imageSize}
                height={imageSize}
                className={`rounded-full object-cover ${!badge.earned ? "grayscale" : ""}`}
                unoptimized
              />
              {!badge.earned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-muted-foreground drop-shadow" />
                </div>
              )}
            </div>

            {/* Name */}
            <p className={`font-semibold text-center leading-tight ${compact ? "text-xs" : "text-sm"}`}>
              {badge.name}
            </p>

            {/* Earned date */}
            {badge.earned && badge.earnedAt && !compact && (
              <p className="text-xs text-muted-foreground">
                {new Date(badge.earnedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-center">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
          {!badge.earned && (
            <p className="text-xs text-amber-500 mt-1">
              {getProgressHint(badge)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getProgressHint(badge: BadgeWithEarnedStatus): string {
  switch (badge.slug) {
    case "login-streak-7":
      return "Log in for 7 days in a row";
    case "login-streak-30":
      return "Log in for 30 days in a row";
    case "login-streak-90":
      return "Log in for 90 days in a row";
    case "qc-hoarder-500":
      return "Accumulate 500 QC";
    case "qc-whale-5000":
      return "Accumulate 5,000 QC";
    case "first-lesson":
      return "Complete your first lesson";
    case "first-course":
      return "Complete your first course";
    case "all-courses":
      return "Complete all courses";
    case "first-usdc-payment":
      return "Make a USDC payment";
    case "gold-member":
      return "Upgrade to GOLD membership";
    case "platinum-member":
      return "Upgrade to PLATINUM membership";
    case "first-stake":
      return "Stake QC for the first time";
    case "stake-1000-qc":
      return "Stake 1,000+ QC at once";
    case "staking-streak-30":
      return "Keep staking active for 30 days";
    case "first-raffle-entry":
      return "Enter your first raffle";
    case "first-cashback":
      return "Claim your first cashback";
    default:
      return badge.description;
  }
}
