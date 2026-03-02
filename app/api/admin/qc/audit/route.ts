// app/api/admin/qc/audit/route.ts
// GET /api/admin/qc/audit — paginated audit trail of admin-initiated QC operations.
// Filters: adminId (referenceId), userId, from, to, page, limit.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const skip = (page - 1) * limit;

  const where: Prisma.QuackCoinTransactionWhereInput = {
    // Admin transactions are identified by their reason prefix OR referenceType
    OR: [
      { reason: { startsWith: "[Admin" } },
      { referenceType: { in: ["admin_grant", "admin_deduct", "admin_override", "admin_bulk"] } },
    ],
  };

  if (userId) where.userId = userId;
  if (adminId) where.referenceId = adminId;
  if (from ?? to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.quackCoinTransaction.findMany({
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
    prisma.quackCoinTransaction.count({ where }),
  ]);

  // Enrich with admin user data if referenceId is present
  const adminIds = [...new Set(rows.map((r) => r.referenceId).filter(Boolean))] as string[];
  const adminUsers =
    adminIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

  const adminMap = new Map(adminUsers.map((u) => [u.id, u]));

  const data = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userName: row.user?.name ?? row.user?.email?.split("@")[0] ?? "Unknown",
    adminId: row.referenceId ?? null,
    adminName: row.referenceId
      ? (adminMap.get(row.referenceId)?.name ??
        adminMap.get(row.referenceId)?.email?.split("@")[0] ??
        "Unknown Admin")
      : null,
    type: row.type,
    referenceType: row.referenceType,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.createdAt,
  }));

  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}
