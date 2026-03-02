// components/landing/RoadmapTimeline.tsx
// Product roadmap timeline. Server Component with static content.

import { CheckCircle2, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemStatus = "done" | "in-progress" | "planned";

interface RoadmapItem {
  quarter: string;
  title: string;
  description: string;
  status: ItemStatus;
  features: string[];
}

const ITEMS: RoadmapItem[] = [
  {
    quarter: "Q1 2024",
    title: "Platform Foundation",
    description: "Core infrastructure, authentication, and invite system.",
    status: "done",
    features: [
      "Invite-only registration",
      "Email + password auth with 2FA",
      "Member dashboard",
      "Daily check-in rewards",
    ],
  },
  {
    quarter: "Q2 2024",
    title: "QC Economy",
    description: "Token economy, staking pools, and membership tiers.",
    status: "done",
    features: [
      "QC token ledger",
      "Membership tiers (Free, Silver, Gold, Platinum)",
      "USDC subscription payments",
      "Staking pools with APY",
    ],
  },
  {
    quarter: "Q3 2024",
    title: "Education Platform",
    description: "DeFi and Web3 courses with QC rewards.",
    status: "done",
    features: [
      "Course catalog",
      "Interactive lessons",
      "QC rewards per completed lesson",
      "Achievement badges",
    ],
  },
  {
    quarter: "Q4 2024 – Q1 2025",
    title: "Community & Affiliate",
    description: "Social features, affiliate cashback, and community events.",
    status: "in-progress",
    features: [
      "Affiliate cashback system",
      "Community leaderboard",
      "Seasonal events",
      "Advanced staking strategies (in progress)",
    ],
  },
  {
    quarter: "Q2 2025",
    title: "Analytics & Insights",
    description: "Portfolio dashboard and earning analytics.",
    status: "planned",
    features: [
      "Earnings history charts",
      "Staking performance analytics",
      "Referral network visualizer",
      "Monthly summary reports",
    ],
  },
  {
    quarter: "Q3 2025",
    title: "Mobile App",
    description: "Native mobile apps for iOS and Android.",
    status: "planned",
    features: [
      "iOS app",
      "Android app",
      "Push notifications for rewards",
      "Biometric authentication",
    ],
  },
];

const STATUS_CONFIG: Record<
  ItemStatus,
  { icon: typeof CheckCircle2; label: string; color: string; border: string }
> = {
  done: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-green-500",
    border: "border-green-500/30 bg-green-500/5",
  },
  "in-progress": {
    icon: Clock,
    label: "In Progress",
    color: "text-yellow-500",
    border: "border-yellow-500/30 bg-yellow-500/5",
  },
  planned: {
    icon: Circle,
    label: "Planned",
    color: "text-muted-foreground",
    border: "border-border bg-card",
  },
};

export function RoadmapTimeline() {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-5 top-0 bottom-0 w-px bg-border hidden sm:block"
        aria-hidden="true"
      />

      <div className="space-y-8">
        {ITEMS.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;

          return (
            <div key={item.quarter} className="relative sm:pl-16">
              {/* Icon dot */}
              <div
                className={cn(
                  "absolute left-0 top-5 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background z-10",
                  item.status === "done"
                    ? "border-green-500"
                    : item.status === "in-progress"
                      ? "border-yellow-500"
                      : "border-border",
                )}
              >
                <Icon className={cn("h-5 w-5", cfg.color)} />
              </div>

              {/* Card */}
              <div className={cn("rounded-2xl border p-6", cfg.border)}>
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {item.quarter}
                    </p>
                    <h3 className="text-lg font-bold">{item.title}</h3>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shrink-0",
                      item.status === "done"
                        ? "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10"
                        : item.status === "in-progress"
                          ? "border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                <ul className="space-y-1">
                  {item.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          item.status === "done"
                            ? "bg-green-500"
                            : item.status === "in-progress"
                              ? "bg-yellow-500"
                              : "bg-muted-foreground/40",
                        )}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
