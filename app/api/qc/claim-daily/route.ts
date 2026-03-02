// app/api/qc/claim-daily/route.ts
// POST /api/qc/claim-daily — emits daily_login QC event and returns new balance.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { handleQcEvent } from "@/lib/events/qcEventHandler";
import { QcService } from "@/lib/services/qc.service";

export async function POST(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await handleQcEvent({
    type: "daily_login",
    userId: session.user.id,
  });

  const newBalance = await QcService.getBalance(session.user.id);

  return NextResponse.json({
    earned: result?.earned ?? 0,
    alreadyClaimed: result === null,
    newBalance,
  });
}
