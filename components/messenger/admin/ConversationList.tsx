// components/messenger/admin/ConversationList.tsx
// Left panel: list of user conversations sorted by last message.

"use client";

interface ConversationSummary {
  id: string;
  userId: string;
  unreadCount: number;
  user: { id: string; name: string | null; email: string | null; avatarUrl: string | null };
  messages: { body: string; createdAt: Date; isFromAdmin: boolean }[];
}

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ConversationList({ conversations, selectedUserId, onSelect }: ConversationListProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto divide-y">
      {conversations.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
      )}
      {conversations.map((conv) => {
        const lastMsg = conv.messages[0];
        const displayName = conv.user.name ?? conv.user.email ?? conv.userId;
        const isSelected = conv.userId === selectedUserId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.userId)}
            className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
              isSelected ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  {lastMsg && (
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMsg.isFromAdmin ? "You: " : ""}{lastMsg.body}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1">
                {lastMsg && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(lastMsg.createdAt)}
                  </span>
                )}
                {conv.unreadCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
