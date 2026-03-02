// app/api/affiliate/cashback/route.ts
// GET user's cashback transactions. POST claim a cashback.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { AffiliateService } from "@/lib/services/affiliate.service";
import { z } from "zod";

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const [items, total] = await Promise.all([
    prisma.cashbackTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        amountQc: true,
        purchaseAmount: true,
        cashbackRate: true,
        expiresAt: true,
        claimedAt: true,
        createdAt: true,
        affiliateClick: {
          select: { createdAt: true, convertedAt: true },
        },
      },
    }),
    prisma.cashbackTransaction.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    data: items,
    meta: { total, page, totalPages: Math.ceil(total / limit) },
  });
}

const claimSchema = z.object({ cashbackId: z.string() });

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await AffiliateService.claimCashback(parsed.data.cashbackId, session.user.id);
    return NextResponse.json({ claimed: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to claim";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
