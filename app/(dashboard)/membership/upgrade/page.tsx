"use client";

// app/(dashboard)/membership/upgrade/page.tsx
// Membership upgrade page — tier selection → Solana Pay QR code → polling.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SolanaPayQR } from "@/components/shared/SolanaPayQR";

type Tier = "SILVER" | "GOLD" | "PLATINUM";

interface TierInfo {
  name: string;
  price: number; // USDC/month
  benefits: string[];
  highlight?: boolean;
}

const TIERS: Record<Tier, TierInfo> = {
  SILVER: {
    name: "Silver",
    price: 9.99,
    benefits: ["1.5× QC multiplier", "Priority support", "Early feature access"],
  },
  GOLD: {
    name: "Gold",
    price: 19.99,
    benefits: [
      "2× QC multiplier",
      "Staking bonus +5%",
      "Cashback on referrals",
      "Exclusive badge",
    ],
    highlight: true,
  },
  PLATINUM: {
    name: "Platinum",
    price: 49.99,
    benefits: [
      "3× QC multiplier",
      "Staking bonus +15%",
      "2× cashback",
      "VIP support",
      "All future perks",
    ],
  },
};

interface PaymentSession {
  paymentId: string;
  solanaPayUrl: string;
  expiresAt: string;
  amountUsdc: number;
  tier: Tier;
}

export default function MembershipUpgradePage() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelectTier = async (tier: Tier) => {
    setSelectedTier(tier);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, months: 1 }),
      });

      if (!res.ok) {
        const json: unknown = await res.json();
        setError(
          json !== null && typeof json === "object" && "error" in json
            ? String((json as Record<string, unknown>).error)
            : "Failed to create payment session",
        );
        setSelectedTier(null);
        return;
      }

      const data = (await res.json()) as PaymentSession;
      setSession(data);
    } catch {
      setError("Network error. Please try again.");
      setSelectedTier(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmed = () => {
    setConfirmed(true);
    setTimeout(() => {
      router.push("/membership");
    }, 3000);
  };

  if (confirmed) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Payment confirmed!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your membership has been upgraded. Redirecting…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Upgrade Membership</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay with USDC on Solana. Scan the QR code with a Solana Pay-compatible
          wallet (Phantom, Solflare, etc).
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!session ? (
        /* Tier selection */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(Object.entries(TIERS) as [Tier, TierInfo][]).map(([tier, info]) => (
            <Card
              key={tier}
              className={`cursor-pointer transition-all hover:shadow-md ${
                info.highlight ? "border-primary ring-1 ring-primary" : ""
              }`}
              onClick={() => { if (!loading) void handleSelectTier(tier); }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  {info.name}
                  {info.highlight && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Popular
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    {info.price}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">USDC/mo</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {info.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 shrink-0 text-green-500" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4 w-full"
                  variant={info.highlight ? "default" : "outline"}
                  size="sm"
                  disabled={loading}
                >
                  {loading && selectedTier === tier ? "Creating…" : "Select"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* QR code + polling */
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Upgrading to{" "}
              <span className="font-semibold text-foreground">
                {TIERS[session.tier]?.name}
              </span>
            </p>
          </div>

          <SolanaPayQR
            paymentUrl={session.solanaPayUrl}
            amount={session.amountUsdc}
            label="QuackCoin Membership"
            expiresAt={new Date(session.expiresAt)}
            paymentId={session.paymentId}
            onConfirmed={handleConfirmed}
            onExpire={() => {
              setSession(null);
              setSelectedTier(null);
            }}
            size={220}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSession(null); setSelectedTier(null); }}
            className="text-muted-foreground"
          >
            ← Choose different tier
          </Button>
        </div>
      )}
    </div>
  );
}
