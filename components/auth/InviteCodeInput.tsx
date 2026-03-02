"use client";

// components/auth/InviteCodeInput.tsx
// Real-time invite code validation input with 500ms debounce.

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (valid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

type Status = "idle" | "checking" | "valid" | "invalid";

export function InviteCodeInput({
  value,
  onChange,
  onValidChange,
  disabled,
  className,
}: InviteCodeInputProps) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!value.trim()) {
      setStatus("idle");
      onValidChange?.(false);
      return;
    }

    setStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/invite/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: value }),
        });
        const data = await res.json();
        const isValid = data.valid === true;
        setStatus(isValid ? "valid" : "invalid");
        onValidChange?.(isValid);
      } catch {
        setStatus("invalid");
        onValidChange?.(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, onValidChange]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor="inviteCode">Invite Code</Label>
      <div className="relative">
        <Input
          id="inviteCode"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your invite code"
          disabled={disabled}
          className={cn(
            "pr-10",
            status === "valid" && "border-green-500 focus-visible:ring-green-500",
            status === "invalid" && "border-red-500 focus-visible:ring-red-500",
          )}
          aria-describedby="inviteCode-status"
          aria-invalid={status === "invalid"}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          )}
          {status === "valid" && (
            <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden />
          )}
          {status === "invalid" && (
            <XCircle className="h-4 w-4 text-red-500" aria-hidden />
          )}
        </div>
      </div>
      <p id="inviteCode-status" className="text-xs" aria-live="polite">
        {status === "valid" && (
          <span className="text-green-600">Valid invite code</span>
        )}
        {status === "invalid" && (
          <span className="text-red-600">Invalid or expired invite code</span>
        )}
      </p>
    </div>
  );
}
