// app/(dashboard)/security/page.tsx
// Security settings page: 2FA setup/disable + password change.

import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TwoFactorSetupForm } from "@/components/security/TwoFactorSetupForm";
import { TwoFactorDisableForm } from "@/components/security/TwoFactorDisableForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Settings | QuackCoin",
};

export default async function SecurityPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, passwordHash: true },
  });

  const is2FAEnabled = user?.twoFactorEnabled ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage two-factor authentication and account security.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {is2FAEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
            </div>
            <Badge variant={is2FAEnabled ? "default" : "secondary"}>
              {is2FAEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <CardDescription>
            {is2FAEnabled
              ? "Your account is protected with 2FA. You can disable it below."
              : "Add an extra layer of security by requiring a code from your authenticator app."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {is2FAEnabled ? (
            <TwoFactorDisableForm />
          ) : (
            <TwoFactorSetupForm />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
