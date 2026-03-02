// app/api/auth/2fa/challenge/route.ts
// POST { code, isBackupCode? } — Verify TOTP or backup code, grant twoFactorVerified.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySync } from "otplib";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { decryptTotpSecret } from "@/lib/auth/totp";
import { consumeBackupCode } from "@/lib/auth/backupCodes";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";
import { rateLimitPresets } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  code: z.string().min(4).max(20),
  isBackupCode: z.boolean().optional().default(false),
});

// Track failed attempts per user
const LOCKOUT_KEY = (userId: string) => `2fa_attempts:${userId}`;
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimitPresets.strict(`2fa_challenge:${ip}`);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 422 });
    }

    // Check lockout
    const attemptsKey = LOCKOUT_KEY(session.user.id);
    const attempts = Number((await redis.get(attemptsKey)) ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please log in again." },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true, backupCodeHashes: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }

    const { code, isBackupCode } = parsed.data;
    let verified = false;

    if (isBackupCode) {
      const hashes: string[] = user.backupCodeHashes
        ? JSON.parse(user.backupCodeHashes as string)
        : [];
      const remaining = await consumeBackupCode(code, hashes);
      if (remaining !== null) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { backupCodeHashes: JSON.stringify(remaining) },
        });
        verified = true;
      }
    } else {
      const secret = decryptTotpSecret(user.twoFactorSecret);
      const result = verifySync({ token: code, secret });
      verified = result.valid;
    }

    if (!verified) {
      await redis.setex(attemptsKey, 300, attempts + 1);
      return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
    }

    // Clear failed attempts
    await redis.del(attemptsKey);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[2fa/challenge]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
