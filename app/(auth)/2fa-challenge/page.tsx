"use client";

// app/(auth)/2fa-challenge/page.tsx
// 2FA challenge page shown after password login when twoFactorEnabled=true.
// Redirects to /login if user navigates here directly without a pending session.

import { Suspense } from "react";
import { TwoFactorChallengeForm } from "@/components/auth/TwoFactorChallengeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

function TwoFactorChallengePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-Factor Verification</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorChallengeForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <TwoFactorChallengePage />
    </Suspense>
  );
}
