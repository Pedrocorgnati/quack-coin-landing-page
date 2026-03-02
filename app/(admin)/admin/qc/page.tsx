"use client";

// app/(admin)/admin/qc/page.tsx
// Admin QC management — grant/deduct QC for individual users.

import { useState } from "react";
import { Coins, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QCManagementForm } from "./QCManagementForm";

export default function AdminQcPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">QC Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manually grant or deduct QuackCoin for individual users.
        </p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {successMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" aria-hidden="true" />
            Manual QC Operation
          </CardTitle>
          <CardDescription>
            Grant or deduct QC for a specific user. All operations are logged in
            the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QCManagementForm onSuccess={(msg) => setSuccessMessage(msg)} />
        </CardContent>
      </Card>

      <div className="flex gap-3 text-sm">
        <a
          href="/admin/qc/audit"
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          View audit trail →
        </a>
        <a
          href="/admin/settings/qc-rules"
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          QC rules / expiry settings →
        </a>
      </div>
    </div>
  );
}
