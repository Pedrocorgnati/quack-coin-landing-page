"use client";

// components/raffles/RaffleCountdown.tsx
// Live countdown timer that updates every second.

import { useEffect, useState } from "react";
import { RaffleStatus } from "@/lib/generated/prisma/client";

interface RaffleCountdownProps {
  drawAt: Date;
  status: RaffleStatus;
  compact?: boolean;
}

function getTimeLeft(target: Date): { d: number; h: number; m: number; s: number } {
  const diff = Math.max(0, target.getTime() - Date.now());
  const s = Math.floor((diff / 1000) % 60);
  const m = Math.floor((diff / 1000 / 60) % 60);
  const h = Math.floor((diff / 1000 / 60 / 60) % 24);
  const d = Math.floor(diff / 1000 / 60 / 60 / 24);
  return { d, h, m, s };
}

export function RaffleCountdown({ drawAt, status, compact = false }: RaffleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date(drawAt)));

  useEffect(() => {
    if (status === RaffleStatus.COMPLETED || status === RaffleStatus.CANCELLED) return;

    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(new Date(drawAt)));
    }, 1000);

    return () => clearInterval(interval);
  }, [drawAt, status]);

  if (status === RaffleStatus.DRAWING) {
    return (
      <span className="text-yellow-500 font-medium animate-pulse">
        Drawing in progress…
      </span>
    );
  }

  if (status === RaffleStatus.COMPLETED || status === RaffleStatus.CANCELLED) {
    return <span className="text-muted-foreground">Completed</span>;
  }

  const { d, h, m, s } = timeLeft;

  if (compact) {
    if (d > 0) return <span>{d}d {h}h remaining</span>;
    if (h > 0) return <span>{h}h {m}m remaining</span>;
    return <span className="text-yellow-600 font-medium">{m}m {s}s remaining</span>;
  }

  return (
    <div className="flex items-center gap-3 text-center">
      {[
        { value: d, label: "Days" },
        { value: h, label: "Hours" },
        { value: m, label: "Mins" },
        { value: s, label: "Secs" },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl font-bold font-mono tabular-nums w-14 text-center">
            {String(value).padStart(2, "0")}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
