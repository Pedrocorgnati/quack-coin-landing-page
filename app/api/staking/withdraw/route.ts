// app/api/staking/withdraw/route.ts
// POST /api/staking/withdraw — withdraw QC from staking position. Requires auth.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { StakingService } from "@/lib/services/staking.service";
import { InsufficientStakeError, NoActiveStakeError } from "@/lib/errors/staking.errors";

const withdrawSchema = z.object({
  amount: z.number().int("Amount must be a whole number").min(1, "Amount must be at least 1"),
});

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await StakingService.withdraw(session.user.id, parsed.data.amount);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientStakeError || err instanceof NoActiveStakeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
