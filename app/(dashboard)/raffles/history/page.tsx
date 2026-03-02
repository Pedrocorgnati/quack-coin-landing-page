// app/(dashboard)/raffles/history/page.tsx
// Raffle history — Server Component with "All Raffles" and "My Entries" tabs.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { RaffleStatus } from "@/lib/generated/prisma/client";
import { RaffleResultCard } from "@/components/raffles/RaffleResultCard";
import { Trophy, Ticket } from "lucide-react";

export const metadata: Metadata = { title: "Raffle History | QuackCoin" };

export default async function RaffleHistoryPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?callbackUrl=/raffles/history");

  const [allCompleted, myEntries] = await Promise.all([
    // All completed raffles
    prisma.raffle.findMany({
      where: { status: RaffleStatus.COMPLETED },
      orderBy: { drawAt: "desc" },
      take: 50,
      include: {
        _count: { select: { tickets: true } },
        winners: {
          include: { user: { select: { name: true } } },
        },
      },
    }),
    // Raffles where the current user participated
    prisma.raffleTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        raffle: {
          include: {
            _count: { select: { tickets: true } },
            winners: {
              where: { userId: session.user.id },
              select: { prizeDetail: true, drawnAt: true },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Raffle History</h2>
          <p className="text-muted-foreground text-sm">Past drawings and results.</p>
        </div>
        <Link href="/raffles" className="text-sm text-primary hover:underline">
          ← Active raffles
        </Link>
      </div>

      {/* My Entries section */}
      {myEntries.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            My Entries ({myEntries.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {myEntries.map((entry) => (
              <RaffleResultCard
                key={entry.id}
                raffle={entry.raffle}
                myTickets={entry.quantity}
                won={entry.raffle.winners.length > 0}
                prizeDetail={entry.raffle.winners[0]?.prizeDetail}
                isCurrentUser
              />
            ))}
          </div>
        </section>
      )}

      {/* All completed raffles */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          All Completed Raffles ({allCompleted.length})
        </h3>
        {allCompleted.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {allCompleted.map((raffle) => (
              <RaffleResultCard
                key={raffle.id}
                raffle={raffle}
                myTickets={0}
                won={false}
                winners={raffle.winners.map((w) => ({
                  name: w.user.name ?? "Anonymous",
                  prize: w.prizeDetail,
                }))}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No completed raffles yet.</p>
        )}
      </section>
    </div>
  );
}
