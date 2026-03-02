"use client";

// components/layout/AdminHeader.tsx
// Admin top bar: Admin Mode badge, admin user name, back-to-dashboard link, system health indicator, theme toggle.
// System health polls /api/admin/stats/system-health every 30s.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type HealthStatus = "healthy" | "degraded" | "down" | "loading";

interface AdminHeaderProps {
  adminName: string;
  onMobileMenuOpen?: () => void;
}

const healthColors: Record<HealthStatus, { dot: string; text: string; label: string }> = {
  loading: {
    dot: "bg-muted-foreground animate-pulse",
    text: "text-muted-foreground",
    label: "Checking...",
  },
  healthy: {
    dot: "bg-green-500 animate-pulse",
    text: "text-green-700 dark:text-green-400",
    label: "Healthy",
  },
  degraded: {
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-700 dark:text-amber-400",
    label: "Degraded",
  },
  down: {
    dot: "bg-red-500 animate-pulse",
    text: "text-red-700 dark:text-red-400",
    label: "Down",
  },
};

export function AdminHeader({ adminName, onMobileMenuOpen }: AdminHeaderProps) {
  const [health, setHealth] = useState<HealthStatus>("loading");
  const [sseCount, setSseCount] = useState<number | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/admin/stats/system-health");
        if (!res.ok) { setHealth("degraded"); return; }
        const json: { status: HealthStatus; checks: { sse: { activeConnections: number } } } = await res.json();
        setHealth(json.status);
        setSseCount(json.checks.sse.activeConnections);
      } catch {
        setHealth("degraded");
      }
    }

    void checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  const hc = healthColors[health];

  return (
    <header className="flex h-16 items-center gap-4 border-b border-amber-500/20 bg-amber-500/5 px-4 lg:px-6">
      {/* Mobile menu trigger */}
      {onMobileMenuOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuOpen}
          aria-label="Open admin navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Admin Mode badge */}
      <Badge
        variant="outline"
        className="border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
      >
        ⚠ Admin Mode
      </Badge>

      {/* Admin user name */}
      <span className="text-sm text-muted-foreground hidden sm:block">{adminName}</span>

      <div className="flex-1" />

      {/* System Health */}
      <div
        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
        title={sseCount !== null ? `${sseCount} active SSE connections` : "System health status"}
      >
        <span className={`h-2 w-2 rounded-full ${hc.dot}`} aria-hidden="true" />
        <span className={hc.text}>{hc.label}</span>
        {sseCount !== null && (
          <span className="text-muted-foreground ml-1">· {sseCount} SSE</span>
        )}
      </div>

      {/* Back to dashboard */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard" className="flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </Button>

      <ThemeToggle />
    </header>
  );
}
