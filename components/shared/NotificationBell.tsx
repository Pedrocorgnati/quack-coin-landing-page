"use client";

// components/shared/NotificationBell.tsx
// Bell icon with unread badge. Connects to unified SSE stream for real-time updates.
// Renders NotificationCenter dropdown on click.

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface NotificationBellProps {
  userId: string;
  className?: string;
}

export function NotificationBell({ userId, className }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // ── Initial unread count fetch ───────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d: { count?: number }) => setUnreadCount(d.count ?? 0))
      .catch(() => {});
  }, [userId]);

  // ── SSE subscription for real-time notifications ─────────────
  const connectSse = useCallback(() => {
    if (!userId) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource("/api/events/stream");
    esRef.current = es;

    es.addEventListener("notification", () => {
      // Bump unread count optimistically; bell will load full list when opened
      setUnreadCount((c) => c + 1);
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Exponential backoff: 2s, 4s, 8s … cap at 30s
      const delay = Math.min(2 ** retryCountRef.current * 1000, 30_000);
      retryCountRef.current += 1;
      retryRef.current = setTimeout(connectSse, delay);
    };

    es.addEventListener("open", () => {
      retryCountRef.current = 0;
    });
  }, [userId]);

  useEffect(() => {
    connectSse();
    return () => {
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connectSse]);

  // ── Polling fallback every 60s (when SSE is down) ────────────
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) {
        fetch("/api/notifications/unread-count")
          .then((r) => r.json())
          .then((d: { count?: number }) => setUnreadCount(d.count ?? 0))
          .catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [userId]);

  // ── Close dropdown on outside click ──────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unreadCount > 0 ? ` (${displayCount} unread)` : ""}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {displayCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-popover shadow-xl">
          <NotificationCenter onCountChange={setUnreadCount} />
        </div>
      )}
    </div>
  );
}
