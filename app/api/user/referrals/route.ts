// app/api/user/referrals/route.ts
// GET — returns users referred by the current user (joined via invitedBy).

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const referrals = await prisma.user.findMany({
    where: { invitedById: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      membershipTier: true,
      createdAt: true,
      qcTransactions: {
        where: { type: "EARN" },
        select: { amount: true },
      },
    },
  });

  const data = referrals.map((u) => ({
    id: u.id,
    displayName: u.name,
    membershipTier: u.membershipTier,
    joinedAt: u.createdAt,
    totalQcEarned: u.qcTransactions.reduce((sum, t) => sum + t.amount, 0),
  }));

  return NextResponse.json({ data, total: data.length });
}
