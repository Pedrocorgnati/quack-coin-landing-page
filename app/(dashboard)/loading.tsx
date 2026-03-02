// app/(dashboard)/loading.tsx
// Suspense fallback for the dashboard overview — renders 4 skeleton MetricCards.

import { MetricCard } from "@/components/dashboard/MetricCard";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md mb-2" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="QC Balance" loading />
        <MetricCard title="Total Earned" loading />
        <MetricCard title="Transactions" loading />
        <MetricCard title="Courses" loading />
      </div>
    </div>
  );
}
