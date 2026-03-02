// components/profile/SecurityOverview.tsx
// Shows 2FA status, last login, and account creation date.

import { Shield, ShieldCheck, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/formatters";
import Link from "next/link";

interface SecurityOverviewProps {
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function SecurityOverview({
  twoFactorEnabled,
  lastLoginAt,
  createdAt,
}: SecurityOverviewProps) {
  return (
    <div className="space-y-4">
      {/* 2FA Status */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {twoFactorEnabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground">
              {twoFactorEnabled
                ? "Your account is protected with 2FA"
                : "Add an extra layer of security"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
            {twoFactorEnabled ? "Enabled" : "Disabled"}
          </Badge>
          {!twoFactorEnabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/security">Enable</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Last Login */}
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Last Login</p>
          <p className="text-xs text-muted-foreground">
            {lastLoginAt ? formatDate(lastLoginAt) : "Never"}
          </p>
        </div>
      </div>

      {/* Account Created */}
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Member Since</p>
          <p className="text-xs text-muted-foreground">{formatDate(createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
