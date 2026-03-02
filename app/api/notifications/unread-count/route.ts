// app/api/notifications/unread-count/route.ts
// GET — returns { count: number }. Used by NotificationBell polling fallback (60s).

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { NotificationService } from "@/lib/services/notification.service";

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await NotificationService.getUnreadCount(session.user.id);
  return NextResponse.json({ count });
}
