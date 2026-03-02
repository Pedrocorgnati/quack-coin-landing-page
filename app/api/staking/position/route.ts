// app/api/staking/position/route.ts
// GET /api/staking/position — returns user's staking position + history.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { StakingService } from "@/lib/services/staking.service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const detail = await StakingService.getPosition(session.user.id);
  return NextResponse.json(detail);
}
