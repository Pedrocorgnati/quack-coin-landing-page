// app/api/admin/raffles/route.ts
// POST — admin create a new raffle.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

const CreateRaffleSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  prizeDescription: z.string().min(3).max(500),
  ticketPriceQc: z.number().int().positive(),
  maxTickets: z.number().int().positive().optional(),
  drawAt: z.string().datetime(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = CreateRaffleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, prizeDescription, ticketPriceQc, maxTickets, drawAt } =
    parsed.data;

  const raffle = await prisma.raffle.create({
    data: {
      title,
      description,
      prizeDescription,
      ticketPriceQc,
      maxTickets: maxTickets ?? null,
      drawAt: new Date(drawAt),
    },
  });

  return NextResponse.json(raffle, { status: 201 });
}
