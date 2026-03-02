"use client";

// components/shared/SolanaPayQR.tsx
// Renders a Solana Pay QR code with optional status polling.
// When paymentId is provided, polls /api/payments/{paymentId}/status every 3 seconds.

import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/formatters";

type PaymentStatus = "PENDING" | "CONFIRMED" | "EXPIRED" | "FAILED";

interface SolanaPayQRProps {
  paymentUrl: string;
  amount: number;
  label: string;
  expiresAt?: Date;
  onExpire?: () => void;
  /** When provided, enables status polling every 3s */
  paymentId?: string;
  onConfirmed?: (tier?: string) => void;
  size?: number;
  className?: string;
}

export function SolanaPayQR({
  paymentUrl,
  amount,
  label,
  expiresAt,
  onExpire,
  paymentId,
  onConfirmed,
  size = 200,
  className,
}: SolanaPayQRProps) {
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [pollStatus, setPollStatus] = useState<PaymentStatus>("PENDING");

  // Expiry countdown
  const checkExpiry = useCallback(() => {
    if (!expiresAt) return;
    const now = Date.now();
    if (expiresAt.getTime() <= now) {
      setIsExpired(true);
      onExpire?.();
    } else {
      setTimeLeft(formatRelativeTime(expiresAt));
    }
  }, [expiresAt, onExpire]);

  useEffect(() => {
    if (!expiresAt) return;
    checkExpiry();
    const interval = setInterval(checkExpiry, 10_000);
    return () => clearInterval(interval);
  }, [expiresAt, checkExpiry]);

  // Payment status polling
  useEffect(() => {
    if (!paymentId) return;
    if (pollStatus !== "PENDING") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { status: PaymentStatus; tier?: string };
        setPollStatus(data.status);

        if (data.status === "CONFIRMED") {
          onConfirmed?.(data.tier);
        } else if (data.status === "EXPIRED" || data.status === "FAILED") {
          setIsExpired(true);
          onExpire?.();
        }
      } catch {
        // silently ignore network errors during polling
      }
    };

    const interval = setInterval(() => { void poll(); }, 3_000);
    return () => clearInterval(interval);
  }, [paymentId, pollStatus, onConfirmed, onExpire]);

  if (pollStatus === "CONFIRMED") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
        <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border-2 border-green-500/40 bg-green-50 dark:bg-green-950">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">
              Payment confirmed!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isExpired || pollStatus === "EXPIRED" || pollStatus === "FAILED") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
        <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-center">
            <XCircle className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-1 text-sm font-medium text-gray-500">
              {pollStatus === "FAILED" ? "Payment failed" : "QR code expired"}
            </p>
            <button
              onClick={onExpire}
              className="mt-1 text-xs text-blue-500 underline hover:text-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <div className="relative rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-white">
        <QRCodeSVG value={paymentUrl} size={size} level="H" includeMargin={false} />
        {paymentId && (
          <div className="absolute bottom-2 right-2">
            <Loader2 className="h-3 w-3 animate-spin text-gray-400" aria-label="Waiting for payment" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{amount} USDC</p>
        {timeLeft && (
          <p className="mt-0.5 text-xs text-orange-500">Expires {timeLeft}</p>
        )}
        {paymentId && pollStatus === "PENDING" && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Waiting for payment…
          </p>
        )}
      </div>
    </div>
  );
}
