"use client";

// components/affiliate/ConversionFunnel.tsx
// Simple funnel: Clicks → Conversions → Claimed. Shows drop-off at each step.

interface ConversionFunnelProps {
  totalClicks: number;
  conversions: number;
  claimedCashback: number;
  totalQcEarned: number;
}

export function ConversionFunnel({
  totalClicks,
  conversions,
  claimedCashback,
  totalQcEarned,
}: ConversionFunnelProps) {
  const steps = [
    { label: "Clicks", value: totalClicks, unit: "clicks" },
    { label: "Conversions", value: conversions, unit: "referrals" },
    { label: "Claimed Cashback", value: claimedCashback, unit: "QC" },
    { label: "Total QC Earned", value: totalQcEarned, unit: "QC" },
  ];

  const maxVal = Math.max(totalClicks, 1);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const pct = Math.round((step.value / maxVal) * 100);
        const dropOff =
          i > 0 && steps[i - 1]!.value > 0
            ? Math.round((1 - step.value / steps[i - 1]!.value) * 100)
            : null;

        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="font-medium">
                {step.value.toLocaleString()} {step.unit}
                {dropOff !== null && dropOff > 0 && (
                  <span className="ml-1.5 text-red-500">-{dropOff}%</span>
                )}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
