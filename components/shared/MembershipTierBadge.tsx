"use client";

import type { MembershipTier } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";
import { MEMBERSHIP_EXPIRY_WARNING_DAYS } from "@/lib/constants";

interface MembershipTierBadgeProps {
  tier: MembershipTier;
  expiresAt?: Date;
  className?: string;
}

const TIER_CONFIG: Record<
  MembershipTier,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  FREE: {
    label: "Free",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-300 dark:border-gray-600",
    icon: "○",
  },
  SILVER: {
    label: "Silver",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-500 dark:text-slate-300",
    border: "border-slate-400",
    icon: "◈",
  },
  GOLD: {
    label: "Gold",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-400",
    icon: "★",
  },
  PLATINUM: {
    label: "Platinum",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-400",
    icon: "◆",
  },
};

function isExpiringSoon(expiresAt: Date): boolean {
  const msUntilExpiry = expiresAt.getTime() - Date.now();
  const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);
  return daysUntilExpiry <= MEMBERSHIP_EXPIRY_WARNING_DAYS && daysUntilExpiry > 0;
}

export function MembershipTierBadge({ tier, expiresAt, className }: MembershipTierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const showExpiryWarning = expiresAt && tier !== "FREE" && isExpiringSoon(expiresAt);

  return (
    <div className={cn("inline-flex flex-col items-start gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          config.bg,
          config.text,
          config.border,
        )}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
      {showExpiryWarning && expiresAt && (
        <span className="text-xs text-orange-500 dark:text-orange-400">
          ⚠ Expires{" "}
          {expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}
