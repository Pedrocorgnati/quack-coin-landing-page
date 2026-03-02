// app/api/admin/audit-log/route.ts
// GET ?targetId=&action=&adminId=&page=
// Paginated audit log query.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 25;

const QuerySchema = z.object({
  targetId: z.string().optional(),
  action: z.string().optional(),
  adminId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const query = QuerySchema.parse({
    targetId: searchParams.get("targetId") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    adminId: searchParams.get("adminId") ?? undefined,
    page: searchParams.get("page") ?? "1",
  });

  const where: Prisma.AdminActionLogWhereInput = {};
  if (query.targetId) where.targetId = query.targetId;
  if (query.action) where.action = { contains: query.action };
  if (query.adminId) where.adminId = query.adminId;

  const [total, logs] = await prisma.$transaction([
    prisma.adminActionLog.count({ where }),
    prisma.adminActionLog.findMany({
      where,
      include: { admin: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page: query.page,
    pages: Math.ceil(total / PAGE_SIZE),
  });
}
