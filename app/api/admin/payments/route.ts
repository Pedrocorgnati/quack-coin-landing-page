// app/api/admin/payments/route.ts
// GET /api/admin/payments — paginated list of all MembershipPayments with user info.
// Filters: status, from (date), to (date), page, limit.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { PaymentStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where: Prisma.MembershipPaymentWhereInput = {};

  if (statusParam && Object.values(PaymentStatus).includes(statusParam as PaymentStatus)) {
    where.status = statusParam as PaymentStatus;
  }

  if (from ?? to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.membershipPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.membershipPayment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: rows,
    meta: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}
