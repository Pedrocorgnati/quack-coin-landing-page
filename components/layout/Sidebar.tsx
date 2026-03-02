"use client";

// components/layout/Sidebar.tsx
// Collapsible sidebar navigation for the dashboard route group.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Coins,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  BookOpen,
  Medal,
  Ticket,
  MessageSquare,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "QC Economy", href: "/qc", icon: Coins },
    ],
  },
  {
    title: "Economy",
    items: [
      {
        label: "Transactions",
        href: "/transactions",
        icon: ArrowLeftRight,
      },
      { label: "Staking", href: "/staking", icon: TrendingUp },
      {
        label: "Membership",
        href: "/membership",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Learn",
    items: [{ label: "Courses", href: "/courses", icon: BookOpen }],
  },
  {
    title: "Community",
    items: [
      { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
      { label: "Badges", href: "/badges", icon: Medal },
      { label: "Raffles", href: "/raffles", icon: Ticket },
      {
        label: "Messages",
        href: "/messages",
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "Affiliate",
    items: [
      { label: "Affiliate Program", href: "/affiliate", icon: Link2 },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/profile", icon: User },
      { label: "Security", href: "/security", icon: Shield },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            "flex h-16 items-center border-b px-3",
            collapsed ? "justify-center" : "justify-between px-4",
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/rubber-duck.png"
                alt="QuackCoin"
                width={20}
                height={20}
                className="h-5 w-5"
              />
              <span className="text-sm font-bold tracking-tight">
                QuackCoin
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" aria-label="QuackCoin Dashboard">
              <Image
                src="/rubber-duck.png"
                alt="QuackCoin"
                width={24}
                height={24}
                className="h-6 w-6"
              />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden lg:flex h-7 w-7"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  if (collapsed) {
                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex h-9 w-full items-center justify-center rounded-md transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                              aria-label={item.label}
                            >
                              <Icon className="h-4 w-4" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
