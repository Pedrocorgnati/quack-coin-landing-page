// components/messenger/admin/AdminMessageThread.tsx
// Chat thread for a selected user conversation (admin view).

"use client";

import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "@/components/messenger/MessageBubble";
import { AdminMessageInput } from "./AdminMessageInput";
import type { MessagePayload } from "@/lib/services/messenger.service";

interface AdminMessageThreadProps {
  selectedUserId: string | null;
  adminId: string;
}

export function AdminMessageThread({ selectedUserId, adminId }: AdminMessageThreadProps) {
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    // Admin fetches conversation for a specific user (reuse conversations endpoint)
    fetch(`/api/messenger/conversations?userId=${selectedUserId}`)
      .then((r) => r.json())
      .then((data: { messages?: MessagePayload[] }) => {
        setMessages(data.messages ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedUserId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Select a conversation to view messages.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <p className="text-sm text-muted-foreground text-center">Loading…</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} currentUserId={adminId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <AdminMessageInput
        toUserId={selectedUserId}
        onSent={(msg) => setMessages((prev) => [...prev, msg])}
      />
    </div>
  );
}
