// app/api/auth/invite/validate/route.ts
// Validates an invite code before registration. Rate limited.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { InviteService } from "@/lib/services/invite.service";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await withRateLimit(`invite_validate:${ip}`, 10, "60 s");

  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 },
    );
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ valid: false, error: "Code is required" }, { status: 400 });
  }

  const invite = await InviteService.validate(code);
  if (!invite) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const remaining = invite.maxUses - invite.useCount;
  return NextResponse.json({ valid: true, remaining }, { status: 200 });
}
