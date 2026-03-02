"use client";

// components/layout/AdminShell.tsx
// Root shell for all (admin) pages: admin sidebar + admin header + content area.
// Visually distinct from DashboardShell with amber/warning accent.

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";

interface AdminShellProps {
  adminName: string;
  children: React.ReactNode;
}

export function AdminShell({ adminName, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop admin sidebar */}
      <AdminSidebar />

      {/* Mobile admin sidebar as Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <AdminSidebar onToggleCollapse={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          adminName={adminName}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
