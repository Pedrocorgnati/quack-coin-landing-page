"use client";

// components/security/BackupCodesDisplay.tsx
// Grid of backup codes with individual + bulk copy. Single-use warning.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackupCodesDisplayProps {
  codes: string[];
  onDone?: () => void;
}

export function BackupCodesDisplay({ codes, onDone }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState<number | "all" | null>(null);

  async function copyCode(code: string, idx: number | "all") {
    await navigator.clipboard.writeText(code);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyAll() {
    await copyCode(codes.join("\n"), "all");
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Save these backup codes now. You will not be able to view them again. Each code can
          only be used once.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2">
        {codes.map((code, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
          >
            <code
              className="text-sm font-mono tracking-widest"
              aria-label={`Backup code ${idx + 1}: ${code}`}
            >
              {code}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => copyCode(code, idx)}
              aria-label={`Copy backup code ${idx + 1}`}
            >
              {copied === idx ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={copyAll}
          aria-label="Copy all backup codes"
        >
          {copied === "all" ? (
            <>
              <Check className={cn("mr-2 h-4 w-4 text-green-500")} />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy All Codes
            </>
          )}
        </Button>

        {onDone && (
          <Button onClick={onDone} className="flex-1">
            I&apos;ve saved my codes
          </Button>
        )}
      </div>
    </div>
  );
}
