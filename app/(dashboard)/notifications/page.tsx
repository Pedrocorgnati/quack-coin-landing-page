// app/(dashboard)/notifications/page.tsx
// Full notification history page — infinite scroll, All/Unread filter, bulk mark-all-read.

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Notification } from "@/lib/generated/prisma/client";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread";

const TABS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
];

interface ApiResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (nextCursor: string | null, replace = false) => {
      setLoading(true);
      try {
        const url = new URL("/api/notifications", window.location.origin);
        if (nextCursor) url.searchParams.set("cursor", nextCursor);
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = (await res.json()) as ApiResponse;

        const incoming = data.notifications ?? [];
        const filtered =
          filter === "unread" ? incoming.filter((n) => !n.isRead) : incoming;

        setNotifications((prev) => (replace ? filtered : [...prev, ...filtered]));
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // Fail silently
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [filter],
  );

  // Initial load + filter change
  useEffect(() => {
    setInitialLoading(true);
    setNotifications([]);
    setCursor(null);
    void fetchPage(null, true);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          void fetchPage(cursor);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, cursor, fetchPage]);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  async function handleMarkAllRead() {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Fail silently
    } finally {
      setMarkingAll(false);
    }
  }

  const displayed =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Title row */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={unreadCount === 0 || markingAll}
          onClick={handleMarkAllRead}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              filter === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.value === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border divide-y overflow-hidden bg-card">
        {initialLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <span className="text-4xl">🔔</span>
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </p>
          </div>
        ) : (
          displayed.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkRead} />
          ))
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-4 text-center">
        {loading && !initialLoading && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
        {!hasMore && !initialLoading && displayed.length > 0 && (
          <span className="text-xs text-muted-foreground">You&apos;ve reached the end</span>
        )}
      </div>
    </div>
  );
}
