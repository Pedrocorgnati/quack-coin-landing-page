// app/api/admin/payments/export/route.ts
// GET /api/admin/payments/export — downloads CSV of MembershipPayments.
// Filters: from (date), to (date), status.
// Columns: Date, User Email, Tier, Amount (USDC), Status, TxSignature, Confirmed At.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { PaymentStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if the field contains comma, double-quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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

  // Fetch all matching payments (up to 10 000 rows to protect memory)
  const rows = await prisma.membershipPayment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  const HEADERS = ["Date", "User Email", "Display Name", "Tier", "Amount (USDC)", "Status", "Tx Signature", "Confirmed At"];

  const lines: string[] = [
    HEADERS.map(escapeCsvField).join(","),
    ...rows.map((row) =>
      [
        escapeCsvField(row.createdAt.toISOString()),
        escapeCsvField(row.user.email),
        escapeCsvField(row.user.name),
        escapeCsvField(row.tier),
        escapeCsvField(row.amountUsdc),
        escapeCsvField(row.status),
        escapeCsvField(row.txSignature),
        escapeCsvField(row.validFrom?.toISOString() ?? null),
      ].join(","),
    ),
  ];

  const csv = lines.join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0] ?? new Date().toISOString().slice(0, 10);
  const filename = `usdc-payments-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
