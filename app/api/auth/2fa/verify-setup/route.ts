// app/api/auth/2fa/verify-setup/route.ts
// POST { code } — Verify the first OTP to activate 2FA.
// On success: enables twoFactorEnabled, stores backup code hashes, returns plaintext codes.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySync } from "otplib";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { decryptTotpSecret } from "@/lib/auth/totp";
import { generateBackupCodes, hashBackupCodes } from "@/lib/auth/backupCodes";
import { z } from "zod";

const bodySchema = z.object({ code: z.string().length(6) });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 422 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorSecret) {
      return NextResponse.json({ error: "2FA setup not initiated" }, { status: 400 });
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
    }

    const secret = decryptTotpSecret(user.twoFactorSecret);
    const result = verifySync({ token: parsed.data.code, secret });
    if (!result.valid) {
      return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
    }

    // Generate backup codes
    const codes = generateBackupCodes();
    const hashes = await hashBackupCodes(codes);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: true,
        backupCodeHashes: JSON.stringify(hashes),
      },
    });

    return NextResponse.json({ success: true, backupCodes: codes });
  } catch (err) {
    console.error("[2fa/verify-setup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
