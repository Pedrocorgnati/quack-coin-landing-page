// components/messenger/UserMessenger.tsx
// User-facing chat UI. Connects to unified SSE stream at /api/events/stream.

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { ConnectionStatus } from "./ConnectionStatus";
import type { MessagePayload } from "@/lib/services/messenger.service";

interface UserMessengerProps {
  currentUserId: string;
  initialMessages: MessagePayload[];
  initialUnreadCount: number;
}

type ConnStatus = "connected" | "connecting" | "disconnected";

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 2_000;

export function UserMessenger({
  currentUserId,
  initialMessages,
  initialUnreadCount,
}: UserMessengerProps) {
  const [messages, setMessages] = useState<MessagePayload[]>(initialMessages);
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageIds = useRef(new Set(initialMessages.map((m) => m.id)));
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const markRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await fetch("/api/messenger/conversations/mark-read", { method: "PATCH" });
    setUnreadCount(0);
  }, [unreadCount]);

  const connect = useCallback(() => {
    esRef.current?.close();
    setConnStatus("connecting");

    const es = new EventSource("/api/events/stream");
    esRef.current = es;

    es.addEventListener("open", () => {
      setConnStatus("connected");
      retryCountRef.current = 0;
    });

    es.addEventListener("message", (e: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(e.data) as MessagePayload;
        if (!messageIds.current.has(payload.id)) {
          messageIds.current.add(payload.id);
          setMessages((prev) => [...prev, payload]);
          // If new admin message, it's unread until we mark read
          if (payload.isFromAdmin) setUnreadCount((n) => n + 1);
        }
      } catch {
        // ignore malformed
      }
    });

    es.addEventListener("error", () => {
      es.close();
      setConnStatus("disconnected");
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = BASE_RETRY_MS * Math.pow(2, retryCountRef.current);
        retryCountRef.current++;
        retryTimerRef.current = setTimeout(connect, delay);
      }
    });

    es.addEventListener("replaced", () => {
      es.close();
      setConnStatus("disconnected");
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [connect]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark read when component is visible
  useEffect(() => {
    void markRead();
  }, [markRead]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="text-sm font-semibold">Messages from QuackCoin</h3>
        <ConnectionStatus status={connStatus} onReconnect={connect} />
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            No messages yet. Our team will reach out here.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} currentUserId={currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
