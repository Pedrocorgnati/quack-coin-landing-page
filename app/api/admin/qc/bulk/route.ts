// app/api/admin/qc/bulk/route.ts
// POST /api/admin/qc/bulk — batch grant/deduct QC for up to 100 users. Admin only.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { QcService } from "@/lib/services/qc.service";
import { logAdminAction } from "@/lib/audit/audit-log";
import { headers } from "next/headers";

const operationSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(1),
  type: z.enum(["grant", "deduct"]),
  reason: z.string().min(1),
});

const schema = z.object({
  operations: z
    .array(operationSchema)
    .min(1, "At least one operation required")
    .max(100, "Maximum 100 operations per request"),
});

type OperationResult =
  | { userId: string; ok: true; txId: string }
  | { userId: string; ok: false; error: string };

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

  const adminId = session.user.id;
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0] ?? undefined;
  const results: OperationResult[] = [];
  let successCount = 0;

  // Process each operation independently (no all-or-nothing).
  // Failed operations are reported but don't block the rest.
  for (const op of parsed.data.operations) {
    const idempotencyKey = `admin_bulk:${adminId}:${op.userId}:${op.type}:${crypto.randomUUID()}`;

    try {
      if (op.type === "grant") {
        const tx = await QcService.earn(
          op.userId,
          op.amount,
          `[Admin Bulk Grant] ${op.reason}`,
          idempotencyKey,
          { referenceId: adminId, referenceType: "admin_bulk" },
        );
        results.push({ userId: op.userId, ok: true, txId: tx.id });
      } else {
        const tx = await QcService.deduct(
          op.userId,
          op.amount,
          `[Admin Bulk Deduct] ${op.reason}`,
          idempotencyKey,
          { referenceId: adminId, referenceType: "admin_bulk" },
        );
        results.push({ userId: op.userId, ok: true, txId: tx.id });
      }
      successCount++;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      results.push({ userId: op.userId, ok: false, error });
    }
  }

  const failed = results.filter((r): r is Extract<OperationResult, { ok: false }> => !r.ok);

  // Audit log — single entry summarising the batch (QA-010)
  await logAdminAction(
    adminId,
    "qc.bulk",
    adminId,
    {
      total: parsed.data.operations.length,
      success: successCount,
      failedCount: failed.length,
      operations: parsed.data.operations.map((op) => ({ userId: op.userId, type: op.type, amount: op.amount })),
    },
    "user",
    ip,
  );

  return NextResponse.json({
    success: successCount,
    failed: failed.map((f) => ({ userId: f.userId, error: f.error })),
    total: parsed.data.operations.length,
  });
}
