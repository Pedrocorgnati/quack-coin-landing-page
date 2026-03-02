"use client";

// components/admin/CronStatusPanel.tsx
// Card grid showing execution status for all 5 cron jobs.
// Auto-refreshes every 60s.

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CronJobStatus {
  name: string;
  label: string;
  schedule: string;
  lastRun: string | null;
  status: "success" | "error" | "skipped" | "never_run";
  message: string | null;
  durationMs: number | null;
  nextScheduledRun: string;
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function formatNextRun(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  const minutes = Math.ceil(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (hours > 1) return `in ${hours}h`;
  if (minutes > 0) return `in ${minutes}m`;
  return "soon";
}

function StatusIcon({ status }: { status: CronJobStatus["status"] }) {
  const classes = "h-4 w-4 shrink-0";
  switch (status) {
    case "success": return <CheckCircle className={cn(classes, "text-green-600 dark:text-green-400")} />;
    case "error":   return <XCircle className={cn(classes, "text-red-600 dark:text-red-400")} />;
    case "skipped": return <AlertCircle className={cn(classes, "text-amber-500")} />;
    case "never_run": return <Clock className={cn(classes, "text-muted-foreground")} />;
  }
}

const STATUS_BADGE: Record<CronJobStatus["status"], string> = {
  success:   "border-green-500/50 text-green-700 dark:text-green-400",
  error:     "border-red-500/50 text-red-600 dark:text-red-400",
  skipped:   "border-amber-500/50 text-amber-600",
  never_run: "border-muted-foreground/30 text-muted-foreground",
};

export function CronStatusPanel() {
  const [jobs, setJobs] = useState<CronJobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cron-status");
      if (!res.ok) return;
      const json: { jobs: CronJobStatus[] } = await res.json();
      setJobs(json.jobs);
      setLastRefresh(new Date());
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { void fetch_(); }, [fetch_]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => void fetch_(), 60_000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Cron Jobs</h3>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Updated {formatRelative(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={() => void fetch_()}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))
          : jobs.map((job) => (
              <div key={job.name} className="rounded-lg border p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status={job.status} />
                  <span className="text-sm font-medium truncate">{job.label}</span>
                </div>

                <Badge
                  variant="outline"
                  className={cn("text-xs w-fit", STATUS_BADGE[job.status])}
                >
                  {job.status === "never_run" ? "Never Run" : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    Last: {job.lastRun ? formatRelative(job.lastRun) : "—"}
                    {job.durationMs != null && ` (${job.durationMs}ms)`}
                  </p>
                  <p>Next: {formatNextRun(job.nextScheduledRun)}</p>
                </div>

                {job.status === "error" && job.message && (
                  <p className="text-xs text-red-600 dark:text-red-400 truncate" title={job.message}>
                    {job.message.slice(0, 80)}
                  </p>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}
