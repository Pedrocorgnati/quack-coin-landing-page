// components/messenger/admin/AdminMessageInput.tsx
// Message compose area with canned responses support.

"use client";

import { useState } from "react";
import { CannedResponsePicker } from "./CannedResponsePicker";

interface AdminMessageInputProps {
  toUserId: string;
  onSent: (message: { id: string; body: string; createdAt: string; authorId: string; isFromAdmin: boolean; conversationId: string }) => void;
}

export function AdminMessageInput({ toUserId, onSent }: AdminMessageInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const content = text.trim();
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messenger/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId, content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const msg = await res.json() as { id: string; body: string; createdAt: string; authorId: string; isFromAdmin: boolean; conversationId: string };
      setText("");
      onSent(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="border-t p-3 space-y-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={3}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex items-center justify-between">
        <CannedResponsePicker onSelect={(body) => setText((t) => t + body)} />
        <button
          onClick={() => void handleSend()}
          disabled={loading || !text.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
