// app/api/payments/[paymentId]/status/route.ts
// GET /api/payments/{paymentId}/status — poll payment confirmation status.
// Used by the QR polling loop in SolanaPayQR.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CachedPayment {
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "FAILED";
  paymentId: string;
  userId?: string;
  tier: string;
  amountUsdc: number;
  expiresAt: string;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paymentId } = await params;

  // Check Redis first (fast path)
  const cached = await redis.get<CachedPayment>(`payment:${paymentId}`);

  if (cached) {
    // QA-019: ownership check on Redis fast path — cached entries include userId when present
    if (
      cached.userId &&
      cached.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auto-expire if past expiry date
    if (
      cached.status === "PENDING" &&
      new Date(cached.expiresAt) < new Date()
    ) {
      await redis.set(
        `payment:${paymentId}`,
        { ...cached, status: "EXPIRED" },
        { ex: 60 }, // keep for 1 minute for final poll
      );
      return NextResponse.json({ status: "EXPIRED" });
    }

    return NextResponse.json({
      status: cached.status,
      tier: cached.tier,
      amountUsdc: cached.amountUsdc,
    });
  }

  // Fall back to DB if not in Redis (after TTL or server restart)
  const dbSession = await prisma.solanaPaymentSession.findUnique({
    where: { id: paymentId },
  });

  if (!dbSession) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Ownership check
  if (dbSession.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Map DB status to response
  const statusMap: Record<string, "PENDING" | "CONFIRMED" | "EXPIRED" | "FAILED"> = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    FAILED: "FAILED",
    CANCELLED: "EXPIRED",
    REFUNDED: "FAILED",
  };

  const status = statusMap[dbSession.status] ?? "PENDING";

  // Check if expired
  if (status === "PENDING" && dbSession.expiresAt < new Date()) {
    return NextResponse.json({ status: "EXPIRED" });
  }

  return NextResponse.json({
    status,
    tier: dbSession.purposeId,
    confirmedAt: dbSession.confirmedAt,
  });
}
