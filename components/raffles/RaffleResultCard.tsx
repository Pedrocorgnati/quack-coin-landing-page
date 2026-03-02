// components/raffles/RaffleResultCard.tsx
// Completed raffle card showing prize, winners (masked), and user result.

import Link from "next/link";
import { Trophy, Ticket } from "lucide-react";
import type { RaffleStatus } from "@/lib/generated/prisma/client";

/** Masks a name: "John Doe" → "Jo** D**" */
function maskName(name: string): string {
  return name
    .split(" ")
    .map((part) => {
      if (part.length <= 2) return part;
      return part.slice(0, 2) + "*".repeat(part.length - 2);
    })
    .join(" ");
}

interface RaffleResultCardProps {
  raffle: {
    id: string;
    title: string;
    prizeDescription: string;
    status: RaffleStatus;
    drawAt: Date;
    _count: { tickets: number };
  };
  myTickets: number;
  won: boolean;
  prizeDetail?: string;
  winners?: { name: string; prize: string }[];
  isCurrentUser?: boolean;
}

export function RaffleResultCard({
  raffle,
  myTickets,
  won,
  prizeDetail,
  winners,
  isCurrentUser = false,
}: RaffleResultCardProps) {
  return (
    <Link
      href={`/raffles/${raffle.id}`}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h4 className="text-sm font-semibold leading-snug line-clamp-2">{raffle.title}</h4>
          <p className="text-xs text-muted-foreground">
            Drew {new Date(raffle.drawAt).toLocaleDateString()} · {raffle._count.tickets} entries
          </p>
        </div>
        {won && <Trophy className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" aria-label="Won" />}
      </div>

      {/* My entry status */}
      {isCurrentUser && myTickets > 0 && (
        <div
          className={`text-xs rounded-md px-2 py-1.5 flex items-center gap-1.5 ${
            won
              ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Ticket className="h-3 w-3 shrink-0" />
          {won ? (
            <span className="font-medium">You won! — {prizeDetail}</span>
          ) : (
            <span>Entered with {myTickets} ticket{myTickets !== 1 ? "s" : ""} — not selected</span>
          )}
        </div>
      )}

      {/* Winners list (masked, for public display) */}
      {winners && winners.length > 0 && (
        <div className="text-xs space-y-0.5">
          {winners.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />
              {maskName(w.name)}
            </div>
          ))}
        </div>
      )}

      {(!winners || winners.length === 0) && !isCurrentUser && (
        <p className="text-xs text-muted-foreground">{raffle.prizeDescription}</p>
      )}
    </Link>
  );
}
