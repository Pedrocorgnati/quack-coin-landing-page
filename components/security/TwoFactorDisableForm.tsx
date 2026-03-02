"use client";

// components/security/TwoFactorDisableForm.tsx
// Password-confirmed form to disable 2FA. Calls POST /api/auth/2fa/disable.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";

const schema = z.object({ password: z.string().min(1, "Password is required") });
type DisableForm = z.infer<typeof schema>;

export function TwoFactorDisableForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DisableForm>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: DisableForm) {
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error ?? "Failed to disable 2FA.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Disabling 2FA reduces your account security. Enter your password to confirm.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="disable-password">Current Password</Label>
        <Input
          id="disable-password"
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" variant="destructive" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Disabling...
          </>
        ) : (
          "Disable Two-Factor Authentication"
        )}
      </Button>
    </form>
  );
}
