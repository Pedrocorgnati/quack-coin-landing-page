// app/api/admin/qc/deduct/route.ts
// POST /api/admin/qc/deduct — deduct QC from a user. Admin only.
// Supports forceDeduct to allow negative balance (bypasses balance check).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { QcService } from "@/lib/services/qc.service";
import { logAdminAction } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { TransactionType } from "@/lib/generated/prisma/client";

const schema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(1, "Amount must be at least 1"),
  reason: z.string().min(1, "Reason is required"),
  forceDeduct: z.boolean().default(false),
});

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { userId, amount, reason, forceDeduct } = parsed.data;
  const adminId = session.user.id;
  const idempotencyKey = `admin_deduct:${adminId}:${userId}:${crypto.randomUUID()}`;
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0] ?? undefined;

  try {
    if (forceDeduct) {
      // Bypass balance check — write directly as SPEND with negative-balance flag
      const tx = await prisma.quackCoinTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: TransactionType.SPEND,
          reason: `[Admin Override] ${reason}`,
          idempotencyKey,
          referenceId: adminId,
          referenceType: "admin_override",
        },
      });
      await logAdminAction(adminId, "qc.deduct", userId, { amount, reason, forceDeduct: true, txId: tx.id }, "user", ip);
      return NextResponse.json({ ok: true, transaction: tx });
    }

    const tx = await QcService.deduct(
      userId,
      amount,
      `[Admin Deduct] ${reason}`,
      idempotencyKey,
      { referenceId: adminId, referenceType: "admin_deduct" },
    );

    // Audit log (QA-010)
    await logAdminAction(adminId, "qc.deduct", userId, { amount, reason, forceDeduct: false, txId: tx.id }, "user", ip);

    return NextResponse.json({ ok: true, transaction: tx });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Insufficient")) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          hint: "Pass forceDeduct: true to override",
        },
        { status: 422 },
      );
    }
    throw err;
  }
}
