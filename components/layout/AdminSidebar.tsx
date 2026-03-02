"use client";

// components/layout/AdminSidebar.tsx
// Admin-specific sidebar navigation.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TicketCheck,
  Coins,
  CreditCard,
  BookOpen,
  MessageSquare,
  Ticket,
  Link2,
  Settings,
  ChevronLeft,
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

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "System Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Users",
    items: [
      { label: "User List", href: "/admin/users", icon: Users },
      { label: "Invite Codes", href: "/admin/settings/invite-codes", icon: TicketCheck },
    ],
  },
  {
    title: "Economy",
    items: [
      { label: "QC Management", href: "/admin/qc", icon: Coins },
      { label: "USDC Payments", href: "/admin/usdc", icon: CreditCard },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Courses", href: "/admin/courses", icon: BookOpen },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Messages", href: "/admin/messages", icon: MessageSquare },
      { label: "Raffles", href: "/admin/raffles", icon: Ticket },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Affiliate Links", href: "/admin/affiliate", icon: Link2 },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Site Config", href: "/admin/settings/site-config", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="hidden lg:flex w-60 flex-col border-r bg-card border-amber-500/20">
        {/* Admin header */}
        <div className="flex h-16 items-center justify-between border-b border-amber-500/20 bg-amber-500/5 px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/rubber-duck.png"
              alt="QuackCoin"
              width={20}
              height={20}
              className="h-5 w-5"
            />
            <span className="text-xs font-bold tracking-tight text-amber-600 dark:text-amber-400 uppercase">
              Admin Panel
            </span>
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleCollapse}
              aria-label="Collapse admin sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.title}
              </p>
              <ul className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                              active
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
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
