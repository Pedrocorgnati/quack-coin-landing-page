// app/(admin)/admin/messages/page.tsx
// Admin messenger dashboard — split panel: conversation list + thread.

"use client";

import { useEffect, useState } from "react";
import { ConversationList } from "@/components/messenger/admin/ConversationList";
import { AdminMessageThread } from "@/components/messenger/admin/AdminMessageThread";

interface ConversationSummary {
  id: string;
  userId: string;
  unreadCount: number;
  user: { id: string; name: string | null; email: string | null; avatarUrl: string | null };
  messages: { body: string; createdAt: Date; isFromAdmin: boolean }[];
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string>("");

  useEffect(() => {
    fetch("/api/messenger/conversations")
      .then((r) => r.json())
      .then((data: ConversationSummary[]) => setConversations(data))
      .catch(() => {});

    // Get current admin id from session
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s: { user?: { id: string } }) => {
        if (s?.user?.id) setAdminId(s.user.id);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-lg overflow-hidden bg-card">
      {/* Left panel */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedUserId={selectedUserId}
            onSelect={setSelectedUserId}
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col flex-1 min-w-0">
        <AdminMessageThread selectedUserId={selectedUserId} adminId={adminId} />
      </div>
    </div>
  );
}
