// app/api/admin/users/route.ts
// GET ?search=&role=&membershipTier=&banned=&page=
// Paginated user list (20/page) with search, filters, and computed fields.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 20;

const QuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  membershipTier: z.enum(["FREE", "SILVER", "GOLD", "PLATINUM"]).optional(),
  banned: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const query = QuerySchema.parse({
    search: searchParams.get("search") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    membershipTier: searchParams.get("membershipTier") ?? undefined,
    banned: searchParams.get("banned") ?? undefined,
    page: searchParams.get("page") ?? "1",
  });

  const where: Prisma.UserWhereInput = {};

  if (query.search) {
    where.OR = [
      { email: { contains: query.search } },
      { name: { contains: query.search } },
      { username: { contains: query.search } },
    ];
  }
  if (query.role) where.role = query.role;
  if (query.membershipTier) where.membershipTier = query.membershipTier;
  if (query.banned !== undefined) where.isBanned = query.banned === "true";

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        role: true,
        membershipTier: true,
        membershipExpiresAt: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { qcTransactions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // Compute QC balance per user in batch
  const userIds = users.map((u) => u.id);

  const qcAgg = await prisma.quackCoinTransaction.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  // amountUsdc is stored as VarChar — count confirmed payments per user as proxy
  const usdcCountAgg = await prisma.membershipPayment.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, status: "CONFIRMED" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const qcMap = new Map(qcAgg.map((r) => [r.userId, r._sum.amount ?? 0]));
  const usdcMap = new Map(usdcCountAgg.map((r) => [r.userId, String(r._count.id)]));

  const enriched = users.map((u) => ({
    ...u,
    qcBalance: qcMap.get(u.id) ?? 0,
    confirmedPayments: usdcMap.get(u.id) ?? "0",
  }));

  return NextResponse.json({
    users: enriched,
    total,
    page: query.page,
    pages: Math.ceil(total / PAGE_SIZE),
  });
}
