// app/api/raffles/[raffleId]/enter/route.ts
// POST { ticketCount } — purchase raffle tickets.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { RaffleService } from "@/lib/services/raffle.service";
import { RaffleNotActiveError, MaxTicketsExceededError } from "@/lib/errors/raffle.errors";

const bodySchema = z.object({
  ticketCount: z.number().int().min(1).max(100),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ raffleId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { raffleId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await RaffleService.enterRaffle(
      session.user.id,
      raffleId,
      parsed.data.ticketCount,
    );
    return NextResponse.json({
      ticketCount: result.newTicketCount,
      totalCost: result.totalCost,
    });
  } catch (err) {
    if (err instanceof RaffleNotActiveError || err instanceof MaxTicketsExceededError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    // Propagate InsufficientQcError as 400
    if (err instanceof Error && err.message.includes("Insufficient")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[POST /api/raffles/[raffleId]/enter]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
