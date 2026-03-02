// components/notifications/NotificationCenter.tsx
// Dropdown panel showing last 20 notifications with mark-all-read + see-all link.

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Notification } from "@/lib/generated/prisma/client";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";

interface NotificationCenterProps {
  onCountChange?: (count: number) => void;
}

export function NotificationCenter({ onCountChange }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.notifications ?? []);
      setUnreadCount(json.unreadCount ?? 0);
      onCountChange?.(json.unreadCount ?? 0);
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    onCountChange?.(Math.max(0, unreadCount - 1));
  }, [onCountChange, unreadCount]);

  async function handleMarkAllRead() {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onCountChange?.(0);
    } catch {
      // Fail silently
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold">
          Notifications{unreadCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          disabled={unreadCount === 0 || markingAll}
          onClick={handleMarkAllRead}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all as read
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <span className="text-2xl">🔔</span>
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
              compact
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2 flex items-center justify-between">
        <Link
          href="/notifications"
          className="text-xs text-primary hover:underline"
        >
          See all
        </Link>
        <Link
          href="/settings/notifications"
          className="text-xs text-muted-foreground hover:underline"
        >
          Notification settings
        </Link>
      </div>
    </div>
  );
}
