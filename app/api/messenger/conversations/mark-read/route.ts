// app/api/messenger/conversations/mark-read/route.ts
// PATCH — mark user's conversation messages as read (unreadCount → 0).

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { MessengerService } from "@/lib/services/messenger.service";

export async function PATCH(_req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await MessengerService.markRead(session.user.id);
  return NextResponse.json({ ok: true });
}
