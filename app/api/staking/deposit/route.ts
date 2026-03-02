// app/api/staking/deposit/route.ts
// POST /api/staking/deposit — deposit QC into staking. Requires auth.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { StakingService } from "@/lib/services/staking.service";
import { InsufficientQcError } from "@/lib/errors/qc.errors";

const stakeSchema = z.object({
  amount: z.number().int("Amount must be a whole number").min(1, "Amount must be at least 1"),
});

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = stakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await StakingService.deposit(session.user.id, parsed.data.amount);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientQcError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
