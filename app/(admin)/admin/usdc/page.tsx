"use client";

// app/(admin)/admin/usdc/page.tsx
// Admin USDC payment management panel — list all payments, manual confirm, CSV export.

import { useSearchParams, useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentManagementTable } from "@/components/admin/PaymentManagementTable";

export default function AdminUsdcPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const buildExportUrl = () => {
    const params = new URLSearchParams();
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/admin/payments/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">USDC Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all membership USDC payments. Manually confirm pending transactions
            or export records for accounting.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <a href={buildExportUrl()} download>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>
        </Button>
      </div>

      {/* Payment table with filters */}
      <PaymentManagementTable />
    </div>
  );
}
