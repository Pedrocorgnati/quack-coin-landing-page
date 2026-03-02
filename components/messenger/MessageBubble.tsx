// components/messenger/MessageBubble.tsx
// Single chat message bubble.

import type { MessagePayload } from "@/lib/services/messenger.service";

interface MessageBubbleProps {
  message: MessagePayload;
  currentUserId: string;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isOwn = message.authorId === currentUserId;
  const isAdmin = message.isFromAdmin;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      {/* Avatar area (left only for admin messages) */}
      {!isOwn && (
        <div
          aria-label={isAdmin ? "Admin" : "User"}
          className="mr-2 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-1"
        >
          {isAdmin ? "A" : "U"}
        </div>
      )}

      <div
        className={`max-w-xs rounded-2xl px-4 py-2 text-sm break-words ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
