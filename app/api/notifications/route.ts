// app/api/notifications/route.ts
// GET  — returns paginated notifications for the current user (20/page, desc).
//        Response: { notifications, unreadCount, hasMore, nextCursor }

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { NotificationService } from "@/lib/services/notification.service";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor"); // createdAt ISO string cursor

  const where = {
    userId: session.user.id,
    isRead: false,
    // soft-deleted guard if the model has deletedAt:
    // deletedAt: null,
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
  };

  // Run both queries in parallel
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1, // fetch one extra to determine hasMore
    }),
    NotificationService.getUnreadCount(session.user.id),
  ]);

  const hasMore = notifications.length > PAGE_SIZE;
  const page = notifications.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? page[page.length - 1]?.createdAt.toISOString() : null;

  return NextResponse.json({
    notifications: page,
    unreadCount,
    hasMore,
    nextCursor,
  });
}
