// app/api/raffles/[raffleId]/my-tickets/route.ts
// GET — returns current user's ticket count and total spent for a raffle.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { RaffleService } from "@/lib/services/raffle.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ raffleId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { raffleId } = await params;
  const result = await RaffleService.getMyTickets(session.user.id, raffleId);

  return NextResponse.json(result);
}
