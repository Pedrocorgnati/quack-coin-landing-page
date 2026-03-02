// components/notifications/NotificationItem.tsx
// Single notification row used in the bell dropdown and full history page.

"use client";

import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/generated/prisma/client";
import { NOTIFICATION_ICON_MAP } from "@/lib/notifications/icon-map";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  compact?: boolean;
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

export function NotificationItem({ notification, onMarkRead, compact }: NotificationItemProps) {
  const router = useRouter();
  const { id, type, title, body, isRead, createdAt } = notification;

  const config = NOTIFICATION_ICON_MAP[type];
  const { Icon, colorClass, bgClass } = config;

  // data may contain an href
  const data = notification.data as Record<string, unknown> | null;
  const href = typeof data?.href === "string" ? data.href : null;

  async function handleClick() {
    if (!isRead) {
      onMarkRead(id);
      // Fire-and-forget API call
      fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
    }
    if (href) router.push(href);
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
        !isRead && "bg-primary/5",
        compact ? "py-2" : "py-3",
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          bgClass,
        )}
      >
        <Icon className={cn("h-4 w-4", colorClass)} />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-tight", !isRead ? "font-semibold" : "font-medium")}>
          {title}
        </p>
        {body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{body}</p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground/70">{relativeTime(createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      )}
    </button>
  );
}
