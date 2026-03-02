// components/landing/TierBenefitsTable.tsx
// Full tier comparison table. Server Component.

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureRow {
  label: string;
  free: string | boolean;
  silver: string | boolean;
  gold: string | boolean;
  platinum: string | boolean;
}

const FEATURES: FeatureRow[] = [
  {
    label: "Daily Check-in QC",
    free: "100 QC",
    silver: "250 QC",
    gold: "500 QC",
    platinum: "1,000 QC",
  },
  {
    label: "QC Earning Multiplier",
    free: "1×",
    silver: "1.5×",
    gold: "2×",
    platinum: "3×",
  },
  {
    label: "Staking APY",
    free: "5%",
    silver: "8%",
    gold: "12%",
    platinum: "18%",
  },
  {
    label: "Affiliate Cashback",
    free: false,
    silver: "5%",
    gold: "10%",
    platinum: "15%",
  },
  {
    label: "Invite Codes",
    free: "1",
    silver: "3",
    gold: "5",
    platinum: "10",
  },
  {
    label: "Education Courses",
    free: true,
    silver: true,
    gold: true,
    platinum: true,
  },
  {
    label: "Priority Support",
    free: false,
    silver: true,
    gold: true,
    platinum: "Dedicated",
  },
  {
    label: "Exclusive Content",
    free: false,
    silver: false,
    gold: true,
    platinum: true,
  },
  {
    label: "Achievement Badges",
    free: true,
    silver: true,
    gold: true,
    platinum: true,
  },
  {
    label: "Early Feature Access",
    free: false,
    silver: false,
    gold: false,
    platinum: true,
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-5 w-5 text-green-500" aria-label="Included" />
    ) : (
      <X className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="Not included" />
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}

const TIER_HEADERS = [
  { label: "Free", highlight: false },
  { label: "Silver ◈", highlight: false },
  { label: "Gold ★", highlight: true },
  { label: "Platinum ◆", highlight: false },
];

export function TierBenefitsTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="py-4 px-6 text-left font-semibold text-muted-foreground w-1/3">
              Feature
            </th>
            {TIER_HEADERS.map((t) => (
              <th
                key={t.label}
                className={cn(
                  "py-4 px-4 text-center font-bold",
                  t.highlight && "text-yellow-600 dark:text-yellow-400",
                )}
              >
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((row, i) => (
            <tr
              key={row.label}
              className={cn(
                "border-b last:border-0 transition-colors",
                i % 2 === 0 ? "bg-background" : "bg-muted/20",
              )}
            >
              <td className="py-3 px-6 font-medium">{row.label}</td>
              <td className="py-3 px-4 text-center">
                <Cell value={row.free} />
              </td>
              <td className="py-3 px-4 text-center">
                <Cell value={row.silver} />
              </td>
              <td className="py-3 px-4 text-center bg-yellow-500/5">
                <Cell value={row.gold} />
              </td>
              <td className="py-3 px-4 text-center">
                <Cell value={row.platinum} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
