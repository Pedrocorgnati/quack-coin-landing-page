"use client";

// components/layout/TopHeader.tsx
// Dashboard top bar: mobile menu trigger, breadcrumb, QC balance, notifications, theme toggle, user dropdown.

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { QCBalanceCard } from "@/components/shared/QCBalanceCard";
import { UserDropdown } from "@/components/layout/UserDropdown";
import type { MembershipTier } from "@/lib/generated/prisma/client";

interface TopHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    membershipTier: MembershipTier;
    qcBalance: number;
  };
  onMobileMenuOpen: () => void;
}

function buildBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const last = segments[segments.length - 1];
  if (!last) return "Dashboard";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export function TopHeader({ user, onMobileMenuOpen }: TopHeaderProps) {
  const pathname = usePathname();
  const title = buildBreadcrumb(pathname);

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuOpen}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb / Page title */}
      <div className="flex-1">
        <h1 className="text-base font-semibold">{title}</h1>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-2">
        <QCBalanceCard balance={user.qcBalance} variant="compact" />
        <NotificationBell userId={user.id} />
        <ThemeToggle />
        <UserDropdown user={user} />
      </div>
    </header>
  );
}
