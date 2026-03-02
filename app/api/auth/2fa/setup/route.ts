// app/api/auth/2fa/setup/route.ts
// POST — Generate TOTP secret and return otpauth URI for QR code.
// Secret is encrypted with AES-256-GCM and stored (but NOT yet active until verified).

import { NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { encryptTotpSecret } from "@/lib/auth/totp";
import { rateLimitPresets } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimitPresets.strict(`2fa_setup:${ip}`);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Generate a new secret (don't enable 2FA yet — only after verification)
    const secret = generateSecret();
    const encryptedSecret = encryptTotpSecret(secret);

    // Store encrypted secret (pending activation)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: encryptedSecret },
    });

    const label = session.user.email ?? session.user.name ?? session.user.id;
    const otpAuthUrl = generateURI({
      secret,
      label,
      issuer: "QuackCoin",
    });

    return NextResponse.json({ secret, otpAuthUrl });
  } catch (err) {
    console.error("[2fa/setup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
