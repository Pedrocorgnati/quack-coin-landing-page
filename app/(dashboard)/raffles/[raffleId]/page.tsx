// app/(dashboard)/raffles/[raffleId]/page.tsx
// Raffle detail page — shows prize, rules, entry form, and user ticket status.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";
import { RaffleEntryForm } from "@/components/raffles/RaffleEntryForm";
import { RaffleCountdown } from "@/components/raffles/RaffleCountdown";
import { Ticket, Trophy } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ raffleId: string }>;
}): Promise<Metadata> {
  const { raffleId } = await params;
  const raffle = await prisma.raffle.findUnique({
    where: { id: raffleId },
    select: { title: true },
  });
  return { title: raffle ? `${raffle.title} | Raffles` : "Raffle | QuackCoin" };
}

export default async function RaffleDetailPage({
  params,
}: {
  params: Promise<{ raffleId: string }>;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { raffleId } = await params;

  const [raffle, myTicket, qcBalance] = await Promise.all([
    prisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        _count: { select: { tickets: true } },
        winners: {
          select: { userId: true, prizeDetail: true, drawnAt: true },
        },
      },
    }),
    prisma.raffleTicket.findUnique({
      where: { raffleId_userId: { raffleId, userId: session.user.id } },
      select: { quantity: true },
    }),
    QcService.getBalance(session.user.id),
  ]);

  if (!raffle) notFound();

  const myTicketCount = myTicket?.quantity ?? 0;
  const myWin = raffle.winners.find((w) => w.userId === session.user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{raffle.title}</h2>
        <p className="text-muted-foreground text-sm">{raffle.description}</p>
      </div>

      {/* Countdown */}
      <div className="rounded-lg border bg-card p-5 flex flex-col items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {raffle.status === "COMPLETED" ? "Drew" : "Drawing"}
        </span>
        <RaffleCountdown drawAt={raffle.drawAt} status={raffle.status} />
      </div>

      {/* Prize */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Prize
        </h3>
        <p className="text-sm">{raffle.prizeDescription}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-lg font-bold">{raffle.ticketPriceQc}</p>
          <p className="text-xs text-muted-foreground">QC per ticket</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-lg font-bold">{raffle._count.tickets}</p>
          <p className="text-xs text-muted-foreground">Tickets sold</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-lg font-bold">{myTicketCount}</p>
          <p className="text-xs text-muted-foreground">Your tickets</p>
        </div>
      </div>

      {/* Win notification */}
      {myWin && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-500 shrink-0" />
          <div>
            <p className="font-semibold text-sm">You won this raffle! 🎉</p>
            <p className="text-xs text-muted-foreground">{myWin.prizeDetail}</p>
          </div>
        </div>
      )}

      {/* Entry form */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          Enter Raffle
        </h3>
        <RaffleEntryForm
          raffleId={raffle.id}
          status={raffle.status}
          ticketPriceQc={raffle.ticketPriceQc}
          maxTickets={raffle.maxTickets}
          userBalance={qcBalance}
          currentTickets={myTicketCount}
        />
      </div>
    </div>
  );
}
