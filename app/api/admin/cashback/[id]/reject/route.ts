// app/api/admin/cashback/[id]/reject/route.ts
// POST { reason? } — admin reject a pending cashback by expiring it immediately.
// Sets expiresAt to now. Sends a system notification to the user.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification.service";
import { NotificationType } from "@/lib/generated/prisma/client";
import { z } from "zod";

const schema = z.object({ reason: z.string().optional() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body);
  const reason = parsed.success ? (parsed.data.reason ?? "") : "";

  const tx = await prisma.cashbackTransaction.findUnique({
    where: { id },
    select: { id: true, userId: true, amountQc: true, claimedAt: true },
  });

  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tx.claimedAt) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  // Expire immediately (rejection = expired with past timestamp)
  await prisma.cashbackTransaction.update({
    where: { id },
    data: { expiresAt: new Date() },
  });

  const rejectMsg = reason
    ? `Your cashback of ${tx.amountQc} QC was rejected: ${reason}`
    : `Your cashback of ${tx.amountQc} QC was rejected by an admin.`;

  await NotificationService.send(tx.userId, NotificationType.SYSTEM, {
    type: NotificationType.SYSTEM,
    data: { message: rejectMsg },
  }).catch(() => {});

  return NextResponse.json({ rejected: true });
}
