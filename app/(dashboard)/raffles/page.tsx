// app/(dashboard)/raffles/page.tsx
// Active & upcoming raffles listing page — Server Component.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { RaffleStatus } from "@/lib/generated/prisma/client";
import { RaffleCard } from "@/components/raffles/RaffleCard";

export const metadata: Metadata = { title: "Raffles | QuackCoin" };

export default async function RafflesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?callbackUrl=/raffles");

  const [activeRaffles, pastRaffles] = await Promise.all([
    prisma.raffle.findMany({
      where: { status: { in: [RaffleStatus.UPCOMING, RaffleStatus.ACTIVE, RaffleStatus.DRAWING] } },
      orderBy: { drawAt: "asc" },
      include: {
        _count: { select: { tickets: true } },
        tickets: {
          where: { userId: session.user.id },
          select: { quantity: true },
        },
      },
    }),
    prisma.raffle.findMany({
      where: { status: RaffleStatus.COMPLETED },
      orderBy: { drawAt: "desc" },
      take: 10,
      include: {
        _count: { select: { tickets: true } },
        tickets: {
          where: { userId: session.user.id },
          select: { quantity: true },
        },
        winners: { where: { userId: session.user.id }, select: { id: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Raffles</h2>
        <p className="text-muted-foreground text-sm">
          Spend QC to enter — winners selected by cryptographic draw.
        </p>
      </div>

      {/* Active & upcoming */}
      {activeRaffles.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Active & Upcoming</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeRaffles.map((raffle) => (
              <RaffleCard
                key={raffle.id}
                raffle={raffle}
                myTickets={raffle.tickets[0]?.quantity ?? 0}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No active raffles right now.</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
        </section>
      )}

      {/* Past raffles */}
      {pastRaffles.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Past Raffles</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastRaffles.map((raffle) => (
              <RaffleCard
                key={raffle.id}
                raffle={raffle}
                myTickets={raffle.tickets[0]?.quantity ?? 0}
                won={"winners" in raffle ? (raffle as typeof raffle & { winners: { id: string }[] }).winners.length > 0 : false}
              />
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/raffles/history"
              className="text-sm text-primary hover:underline"
            >
              View full history →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
