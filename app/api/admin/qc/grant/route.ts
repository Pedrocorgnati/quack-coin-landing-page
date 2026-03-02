// app/api/admin/qc/grant/route.ts
// POST /api/admin/qc/grant — grant QC to a user. Admin only.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { QcService } from "@/lib/services/qc.service";
import { logAdminAction } from "@/lib/audit/audit-log";
import { headers } from "next/headers";

const schema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(1, "Amount must be at least 1"),
  reason: z.string().min(1, "Reason is required"),
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

  const { userId, amount, reason } = parsed.data;
  const adminId = session.user.id;
  const idempotencyKey = `admin_grant:${adminId}:${userId}:${crypto.randomUUID()}`;

  const tx = await QcService.earn(
    userId,
    amount,
    `[Admin Grant] ${reason}`,
    idempotencyKey,
    { referenceId: adminId, referenceType: "admin_grant" },
  );

  // Audit log (QA-010)
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0] ?? undefined;
  await logAdminAction(adminId, "qc.grant", userId, { amount, reason, txId: tx.id }, "user", ip);

  return NextResponse.json({ ok: true, transaction: tx });
}
