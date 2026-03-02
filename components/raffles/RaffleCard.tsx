"use client";

// components/raffles/RaffleCard.tsx
// Card displaying raffle summary with countdown, ticket price, and entry CTA.

import Link from "next/link";
import { Ticket, Trophy } from "lucide-react";
import { RaffleStatus } from "@/lib/generated/prisma/client";
import { RaffleCountdown } from "@/components/raffles/RaffleCountdown";

const STATUS_LABELS: Record<RaffleStatus, string> = {
  UPCOMING: "Upcoming",
  ACTIVE: "Active",
  DRAWING: "Drawing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<RaffleStatus, string> = {
  UPCOMING: "bg-secondary text-secondary-foreground",
  ACTIVE: "bg-primary text-primary-foreground",
  DRAWING: "bg-yellow-500 text-white",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive text-destructive-foreground",
};

interface RaffleCardProps {
  raffle: {
    id: string;
    title: string;
    prizeDescription: string;
    status: RaffleStatus;
    ticketPriceQc: number;
    drawAt: Date;
    imageUrl?: string | null;
    _count: { tickets: number };
  };
  myTickets: number;
  won?: boolean;
}

export function RaffleCard({ raffle, myTickets, won }: RaffleCardProps) {
  return (
    <Link
      href={`/raffles/${raffle.id}`}
      className="flex flex-col rounded-lg border bg-card overflow-hidden hover:bg-muted/50 transition-colors"
    >
      {/* Thumbnail placeholder */}
      <div className="h-32 w-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
        {/* @ASSET_PLACEHOLDER
        name: raffle-card-thumbnail
        type: image
        format: png
        aspect_ratio: 16:9
        description: Eye-catching raffle prize thumbnail — vibrant, exciting
        context: Raffle card thumbnail
        style: product photography
        mood: exciting, premium
        */}
        <Ticket className="h-8 w-8 opacity-30" />
      </div>

      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Status badge */}
        <span
          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[raffle.status]}`}
        >
          {STATUS_LABELS[raffle.status]}
        </span>

        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{raffle.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{raffle.prizeDescription}</p>

        <div className="mt-auto space-y-1.5 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{raffle.ticketPriceQc} QC / ticket</span>
            <span>{raffle._count.tickets} tickets sold</span>
          </div>

          {raffle.status !== RaffleStatus.COMPLETED && raffle.status !== RaffleStatus.CANCELLED ? (
            <RaffleCountdown drawAt={raffle.drawAt} status={raffle.status} compact />
          ) : (
            <span className="text-muted-foreground">
              Drew {new Date(raffle.drawAt).toLocaleDateString()}
            </span>
          )}

          {myTickets > 0 && (
            <div className="flex items-center gap-1 text-primary font-medium">
              <Ticket className="h-3 w-3" />
              {myTickets} ticket{myTickets !== 1 ? "s" : ""} entered
              {won && <Trophy className="h-3 w-3 ml-1 text-yellow-500" />}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
