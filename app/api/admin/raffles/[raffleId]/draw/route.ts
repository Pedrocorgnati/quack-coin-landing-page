// app/api/admin/raffles/[raffleId]/draw/route.ts
// POST — admin manually trigger the drawing for an ACTIVE raffle.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { RaffleService } from "@/lib/services/raffle.service";
import { AppError } from "@/lib/errors/app.errors";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ raffleId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { raffleId } = await params;

  try {
    await RaffleService.startDrawing(raffleId);
    const result = await RaffleService.drawWinners(raffleId);
    return NextResponse.json({ winners: result.winners.length, raffleId });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    throw err;
  }
}
