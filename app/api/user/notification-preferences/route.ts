// app/api/user/notification-preferences/route.ts
// GET  — returns merged preferences (with defaults for missing keys).
// PATCH — validates + saves, invalidates Redis cache.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { getPreferences, savePreferences } from "@/lib/notifications/preferences";
import { NotificationType } from "@/lib/generated/prisma/client";

const TypePrefSchema = z.object({
  inApp: z.boolean(),
  push: z.boolean(),
});

const PatchSchema = z.object({
  preferences: z.record(z.nativeEnum(NotificationType), TypePrefSchema),
});

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await getPreferences(session.user.id);
  return NextResponse.json({ preferences: prefs });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await savePreferences(session.user.id, parsed.data.preferences);
  return NextResponse.json({ preferences: updated });
}
