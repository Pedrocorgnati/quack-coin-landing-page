// app/api/user/qc-transactions/route.ts
// GET /api/user/qc-transactions — paginated transaction history with optional filters.
//
// Query params:
//   page     number  default 1
//   limit    number  default 20 (max 100)
//   type     EARN | SPEND | REFUND | REWARD | BONUS | REFERRAL | all  (default: all)
//   from     ISO date string  (inclusive)
//   to       ISO date string  (inclusive end of day)
//   cursor   last transaction ID for cursor-based pagination

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { TransactionType } from "@/lib/generated/prisma/client";

const VALID_TYPES = Object.values(TransactionType) as [
  TransactionType,
  ...TransactionType[],
];

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum([...VALID_TYPES, "all" as const]).default("all"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: z.string().optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { page, limit, type, from, to, cursor } = parsed.data;
  const userId = session.user.id;

  // Build where clause
  const where: Prisma.QuackCoinTransactionWhereInput = { userId };

  if (type !== "all") {
    where.type = type;
  }

  if (from ?? to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) {
      // Include the full end day (set to end of day)
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt.lte = endOfDay;
    }
  }

  // Cursor-based pagination (preferred for large ledgers)
  if (cursor) {
    const [data, total] = await Promise.all([
      prisma.quackCoinTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        cursor: { id: cursor },
        skip: 1, // skip the cursor itself
      }),
      prisma.quackCoinTransaction.count({ where }),
    ]);

    const nextCursor = data.length === limit ? (data[data.length - 1]?.id ?? null) : null;

    return NextResponse.json({
      data,
      total,
      nextCursor,
      mode: "cursor",
    });
  }

  // Offset-based pagination (default, for page controls)
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.quackCoinTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.quackCoinTransaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextCursor: data.length > 0 ? (data[data.length - 1]?.id ?? null) : null,
    mode: "offset",
  });
}
