"use client";

// components/auth/TwoFactorChallengeForm.tsx
// 6-digit OTP input for 2FA challenge. Auto-submits on 6 chars.
// Toggles to backup-code mode. Calls POST /api/auth/2fa/challenge.

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const totpSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Digits only"),
});
const backupSchema = z.object({
  code: z
    .string()
    .min(4, "Code too short")
    .max(20, "Code too long")
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "")),
});

type TotpForm = z.infer<typeof totpSchema>;
type BackupForm = z.infer<typeof backupSchema>;

export function TwoFactorChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isBackupMode, setIsBackupMode] = useState(
    searchParams.get("backup") === "true",
  );
  const [error, setError] = useState<string | null>(null);
  const autoSubmitRef = useRef(false);

  const totpForm = useForm<TotpForm>({
    resolver: zodResolver(totpSchema),
  });

  const backupForm = useForm<BackupForm>({
    resolver: zodResolver(backupSchema),
  });

  async function submit(code: string, isBackupCode: boolean) {
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, isBackupCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Invalid code. Please try again.");
        autoSubmitRef.current = false;
        if (isBackupCode) backupForm.reset();
        else totpForm.reset();
        return;
      }

      // Refresh session, then redirect to dashboard
      await fetch("/api/auth/session");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      autoSubmitRef.current = false;
    }
  }

  async function onTotpSubmit(data: TotpForm) {
    await submit(data.code, false);
  }

  async function onBackupSubmit(data: BackupForm) {
    await submit(data.code, true);
  }

  // Auto-submit when 6 TOTP digits entered
  function onTotpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    totpForm.setValue("code", val);
    if (val.length === 6 && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      void totpForm.handleSubmit(onTotpSubmit)();
    }
  }

  const isSubmitting = totpForm.formState.isSubmitting || backupForm.formState.isSubmitting;

  if (isBackupMode) {
    return (
      <form onSubmit={backupForm.handleSubmit(onBackupSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter one of your backup codes. Each code can only be used once.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="backup-code">Backup Code</Label>
          <Input
            id="backup-code"
            type="text"
            placeholder="XXXX-XXXX-XXXX"
            autoComplete="one-time-code"
            className="font-mono tracking-widest text-center uppercase"
            disabled={isSubmitting}
            {...backupForm.register("code")}
          />
          {backupForm.formState.errors.code && (
            <p className="text-sm text-destructive">{backupForm.formState.errors.code.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Use Backup Code"
          )}
        </Button>

        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => {
            setIsBackupMode(false);
            setError(null);
          }}
        >
          Use authenticator app instead
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={totpForm.handleSubmit(onTotpSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Open your authenticator app and enter the 6-digit code.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="totp-code">Verification Code</Label>
        <Input
          id="totp-code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          autoComplete="one-time-code"
          autoFocus
          className="text-center text-lg tracking-[0.5em] font-mono"
          disabled={isSubmitting}
          onChange={onTotpChange}
        />
        {totpForm.formState.errors.code && (
          <p className="text-sm text-destructive">{totpForm.formState.errors.code.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Code"
        )}
      </Button>

      <button
        type="button"
        className="w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={() => {
          setIsBackupMode(true);
          setError(null);
        }}
      >
        Lost access to your authenticator? Use a backup code
      </button>
    </form>
  );
}
