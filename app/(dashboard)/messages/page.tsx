// app/(dashboard)/messages/page.tsx
// User messages page — server wrapper that pre-fetches history.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";
import { MessengerService } from "@/lib/services/messenger.service";
import { UserMessenger } from "@/components/messenger/UserMessenger";

export const metadata: Metadata = { title: "Messages | QuackCoin" };

export default async function MessagesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?callbackUrl=/messages");

  const conversation = await MessengerService.getConversation(session.user.id);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-2xl mx-auto rounded-lg border bg-card overflow-hidden">
      <UserMessenger
        currentUserId={session.user.id}
        initialMessages={conversation?.messages ?? []}
        initialUnreadCount={conversation?.unreadCount ?? 0}
      />
    </div>
  );
}
