"use client";

// components/security/TwoFactorSetupForm.tsx
// Complete 2FA setup flow: get QR code → scan → verify OTP → show backup codes.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BackupCodesDisplay } from "./BackupCodesDisplay";
import { Loader2, RefreshCw } from "lucide-react";

type Step = "init" | "qr" | "verify" | "backup" | "done";

const otpSchema = z.object({ code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Digits only") });
type OtpForm = z.infer<typeof otpSchema>;

interface SetupData {
  secret: string;
  otpAuthUrl: string;
}

export function TwoFactorSetupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("init");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
  });

  async function loadSetup() {
    setStep("init");
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start setup");
      setSetupData({ secret: data.secret, otpAuthUrl: data.otpAuthUrl });
      setStep("qr");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start setup");
      setStep("init");
    }
  }

  useEffect(() => {
    loadSetup();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onVerify(data: OtpForm) {
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.code }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error ?? "Invalid code. Please try again.");
        reset();
        return;
      }
      setBackupCodes(body.backupCodes);
      setStep("backup");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  if (step === "init") {
    return (
      <div className="flex items-center justify-center py-8">
        {error ? (
          <div className="space-y-3 text-center">
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            <Button onClick={loadSetup}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  if (step === "qr" && setupData) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
        </p>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg border bg-white p-3">
            <QRCodeSVG
              value={setupData.otpAuthUrl}
              size={200}
              aria-label="2FA QR code — scan with your authenticator app"
            />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
            <code className="rounded bg-muted px-2 py-1 text-xs font-mono tracking-widest break-all">
              {setupData.secret}
            </code>
          </div>
        </div>

        <Button className="w-full" onClick={() => setStep("verify")}>
          I&apos;ve scanned the QR code
        </Button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to confirm setup.
        </p>

        {error && (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
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
            className="text-center text-lg tracking-[0.5em] font-mono"
            disabled={isSubmitting}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("qr")}>
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Enable 2FA"}
          </Button>
        </div>
      </form>
    );
  }

  if (step === "backup") {
    return (
      <BackupCodesDisplay
        codes={backupCodes}
        onDone={() => {
          setStep("done");
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="py-4 text-center text-sm text-muted-foreground">
      2FA is now enabled on your account.
    </div>
  );
}
