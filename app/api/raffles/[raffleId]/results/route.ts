// app/api/raffles/[raffleId]/results/route.ts
// GET — raffle results with masked winner display names.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

function maskName(name: string | null): string {
  if (!name) return "Anonymous";
  return name
    .split(" ")
    .map((part) => {
      if (part.length <= 2) return part;
      return part.slice(0, 2) + "*".repeat(part.length - 2);
    })
    .join(" ");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ raffleId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { raffleId } = await params;

  const raffle = await prisma.raffle.findUnique({
    where: { id: raffleId },
    include: {
      winners: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!raffle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myTicket = await prisma.raffleTicket.findUnique({
    where: { raffleId_userId: { raffleId, userId: session.user.id } },
    select: { quantity: true },
  });

  const myEntry = myTicket
    ? {
        tickets: myTicket.quantity,
        won: raffle.winners.some((w) => w.userId === session.user.id),
      }
    : null;

  const winners = raffle.winners.map((w) => ({
    userId: w.userId,
    displayName:
      w.userId === session.user.id ? w.user.name ?? "You" : maskName(w.user.name),
    prize: w.prizeDetail,
  }));

  return NextResponse.json({ winners, myEntry });
}
