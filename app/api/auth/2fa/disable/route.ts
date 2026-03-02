// app/api/auth/2fa/disable/route.ts
// POST { password } — Disable 2FA after verifying current password.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({ password: z.string().min(1) });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 422 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: "No password set" }, { status: 400 });
    }

    const isValid = await compare(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodeHashes: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[2fa/disable]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
