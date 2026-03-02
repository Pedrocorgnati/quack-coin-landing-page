// app/api/messenger/conversations/route.ts
// GET  — returns conversation history.
//   Admin: all conversations.
//   User: their conversation (with unreadCount).
// PATCH mark-read sub-route handled separately.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { MessengerService } from "@/lib/services/messenger.service";

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "ADMIN") {
    // ?userId=xxx — return single user conversation for admin thread view
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId");
    if (targetUserId) {
      const conversation = await MessengerService.getConversation(targetUserId);
      return NextResponse.json(conversation ?? { messages: [], unreadCount: 0 });
    }
    // No userId param — return all conversations list
    const conversations = await MessengerService.getAllConversations();
    return NextResponse.json(conversations);
  }

  // Regular user: return their own conversation
  const conversation = await MessengerService.getConversation(session.user.id);
  if (!conversation) {
    return NextResponse.json({ messages: [], unreadCount: 0 });
  }

  return NextResponse.json(conversation);
}
