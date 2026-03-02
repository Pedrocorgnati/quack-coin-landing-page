// app/api/auth/2fa/use-backup/route.ts
// POST { backupCode } — Use a backup code to bypass TOTP (standalone, not challenge flow).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { consumeBackupCode } from "@/lib/auth/backupCodes";
import { z } from "zod";

const bodySchema = z.object({ backupCode: z.string().min(4) });

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
      select: { backupCodeHashes: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }

    const hashes: string[] = user.backupCodeHashes
      ? JSON.parse(user.backupCodeHashes as string)
      : [];
    const remaining = await consumeBackupCode(parsed.data.backupCode, hashes);

    if (remaining === null) {
      return NextResponse.json({ success: false, error: "Invalid backup code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { backupCodeHashes: JSON.stringify(remaining) },
    });

    return NextResponse.json({ success: true, codesRemaining: remaining.length });
  } catch (err) {
    console.error("[2fa/use-backup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
