"use client";

// app/(admin)/admin/dashboard/page.tsx
// Admin dashboard: platform metric cards, revenue + user growth charts, activity feed.

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Crown,
  Coins,
  DollarSign,
  UserPlus,
  Zap,
  Gift,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MetricCard } from "@/components/admin/MetricCard";
import { CronStatusPanel } from "@/components/admin/CronStatusPanel";

// ── Types ─────────────────────────────────────────────────────

interface StatsOverview {
  totalUsers: number;
  activeMembers: number;
  newUsersLast7d: number;
  totalQcCirculation: number;
  totalUsdcRevenue: string;
  activeStakingPositions: number;
  pendingCashbacks: number;
  cachedAt: string;
}

interface ChartPoint {
  date: string;
  value: number;
}

// ── Helpers ───────────────────────────────────────────────────

function shortDate(iso: string): string {
  // iso is "YYYY-MM-DD" from MySQL DATE()
  const [, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatUSDC(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatQC(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M QC`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K QC`;
  return `${n.toLocaleString()} QC`;
}

// ── Component ─────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [revenueData, setRevenueData] = useState<ChartPoint[]>([]);
  const [usersData, setUsersData] = useState<ChartPoint[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats/overview");
      if (!res.ok) return;
      const data: StatsOverview = await res.json();
      setOverview(data);
    } catch {
      // fail silently
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchCharts = useCallback(async () => {
    try {
      const [revRes, usrRes] = await Promise.all([
        fetch("/api/admin/stats/charts?metric=revenue&period=30d"),
        fetch("/api/admin/stats/charts?metric=users&period=30d"),
      ]);
      if (revRes.ok) {
        const j: { data: ChartPoint[] } = await revRes.json();
        setRevenueData(j.data.map((p) => ({ ...p, date: shortDate(p.date) })));
      }
      if (usrRes.ok) {
        const j: { data: ChartPoint[] } = await usrRes.json();
        setUsersData(j.data.map((p) => ({ ...p, date: shortDate(p.date) })));
      }
    } catch {
      // fail silently
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
    void fetchCharts();
  }, [fetchOverview, fetchCharts]);

  const metrics = overview
    ? [
        {
          label: "Total Users",
          value: overview.totalUsers,
          icon: Users,
          variant: "neutral" as const,
        },
        {
          label: "Active Members",
          value: overview.activeMembers,
          icon: Crown,
          variant: "success" as const,
        },
        {
          label: "New (7 days)",
          value: overview.newUsersLast7d,
          icon: UserPlus,
          variant: "neutral" as const,
        },
        {
          label: "QC Circulation",
          value: formatQC(overview.totalQcCirculation),
          icon: Coins,
          variant: "warning" as const,
        },
        {
          label: "USDC Revenue",
          value: formatUSDC(overview.totalUsdcRevenue),
          icon: DollarSign,
          variant: "success" as const,
        },
        {
          label: "Active Staking",
          value: overview.activeStakingPositions,
          icon: Zap,
          variant: "neutral" as const,
        },
        {
          label: "Pending Cashbacks",
          value: overview.pendingCashbacks,
          icon: Gift,
          variant: overview.pendingCashbacks > 0 ? ("warning" as const) : ("neutral" as const),
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Platform metrics and system overview
          {overview?.cachedAt && (
            <span className="ml-2 text-xs opacity-60">
              · cached {new Date(overview.cachedAt).toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {loadingOverview
          ? Array.from({ length: 7 }).map((_, i) => (
              <MetricCard
                key={i}
                label=""
                value=""
                icon={Users}
                loading
              />
            ))
          : metrics.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* USDC Revenue (30d) */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">USDC Revenue — 30 days</h3>
          <p className="text-xs text-muted-foreground mb-4">Confirmed membership payments</p>
          {loadingCharts ? (
            <div className="h-48 animate-pulse rounded bg-muted" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={revenueData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  fill="url(#rev-grad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* User Growth (30d) */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">User Growth — 30 days</h3>
          <p className="text-xs text-muted-foreground mb-4">New registrations per day</p>
          {loadingCharts ? (
            <div className="h-48 animate-pulse rounded bg-muted" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={usersData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number | undefined) => [v ?? 0, "New users"]} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* QC Circulation card */}
      {overview && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">QuackCoin Circulation</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                {formatQC(overview.totalQcCirculation)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {overview.activeStakingPositions.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Active staking positions</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {overview.pendingCashbacks.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pending cashbacks</p>
            </div>
          </div>
        </div>
      )}

      {/* Cron job status */}
      <CronStatusPanel />
    </div>
  );
}
