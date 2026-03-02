// app/api/affiliate/links/route.ts
// GET user's affiliate links. POST create new link.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { AffiliateService } from "@/lib/services/affiliate.service";
import { z } from "zod";

const createSchema = z.object({
  targetUrl: z.string().url().optional(),
  campaign: z.string().max(50).optional(),
});

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await prisma.affiliateLink.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      url: true,
      totalClicks: true,
      totalEarned: true,
      isActive: true,
      createdAt: true,
      _count: { select: { clicks: { where: { convertedAt: { not: null } } } } },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json(
    links.map((l) => ({
      ...l,
      shortUrl: `${appUrl}/r/${l.code}`,
      conversionCount: l._count.clicks,
    })),
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const link = await AffiliateService.generateLink(
    session.user.id,
    parsed.data.targetUrl,
    parsed.data.campaign,
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({ ...link, shortUrl: `${appUrl}/r/${link.code}` }, { status: 201 });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const link = await prisma.affiliateLink.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.affiliateLink.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ deleted: true });
}
