// components/landing/PricingGrid.tsx
// Membership tier pricing cards — prices passed from Server Component (SiteConfig).

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TierPrice {
  free: string;
  silver: string;
  gold: string;
  platinum: string;
}

interface PricingGridProps {
  prices: TierPrice;
}

interface TierCard {
  tier: string;
  label: string;
  priceKey: keyof TierPrice;
  billing: string;
  tagline: string;
  popular?: boolean;
  benefits: string[];
  ctaText: string;
  ctaHref: string;
  badge?: string;
}

const TIERS: TierCard[] = [
  {
    tier: "FREE",
    label: "Free",
    priceKey: "free",
    billing: "Forever free",
    tagline: "Start earning QC with daily activities.",
    benefits: [
      "100 QC daily check-in",
      "Access to education courses",
      "Basic staking pool (5% APY)",
      "1 invite code to share",
      "Community badges",
    ],
    ctaText: "Request Invite",
    ctaHref: "/landing#invite-form",
  },
  {
    tier: "SILVER",
    label: "Silver",
    priceKey: "silver",
    billing: "per month in USDC",
    tagline: "Boost your earnings with multipliers.",
    benefits: [
      "1.5× QC earning multiplier",
      "250 QC daily check-in",
      "Silver staking pool (8% APY)",
      "3 invite codes to share",
      "5% affiliate cashback",
      "Priority support",
      "Silver badge & profile flair",
    ],
    ctaText: "Get Silver",
    ctaHref: "/landing#invite-form",
    badge: "◈",
  },
  {
    tier: "GOLD",
    label: "Gold",
    priceKey: "gold",
    billing: "per month in USDC",
    tagline: "The most popular choice for serious earners.",
    popular: true,
    benefits: [
      "2× QC earning multiplier",
      "500 QC daily check-in",
      "Gold staking pool (12% APY)",
      "5 invite codes to share",
      "10% affiliate cashback",
      "Priority support",
      "Exclusive Gold content",
      "Gold badge & profile flair",
    ],
    ctaText: "Get Gold",
    ctaHref: "/landing#invite-form",
    badge: "★",
  },
  {
    tier: "PLATINUM",
    label: "Platinum",
    priceKey: "platinum",
    billing: "per month in USDC",
    tagline: "Maximum benefits for top DeFi enthusiasts.",
    benefits: [
      "3× QC earning multiplier",
      "1000 QC daily check-in",
      "Platinum staking pool (18% APY)",
      "10 invite codes to share",
      "15% affiliate cashback",
      "Dedicated support",
      "All exclusive content",
      "Platinum badge & profile flair",
      "Early access to new features",
    ],
    ctaText: "Get Platinum",
    ctaHref: "/landing#invite-form",
    badge: "◆",
  },
];

export function PricingGrid({ prices }: PricingGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {TIERS.map((tier) => {
        const price = tier.priceKey === "free" ? "0" : prices[tier.priceKey];
        const isPopular = tier.popular ?? false;

        return (
          <div
            key={tier.tier}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md",
              isPopular
                ? "border-yellow-500 bg-yellow-500/5 shadow-yellow-500/10 shadow-lg"
                : "bg-card",
            )}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-black">
                  Most Popular
                </span>
              </div>
            )}

            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                {tier.badge && (
                  <span className="text-yellow-600 dark:text-yellow-400 text-lg">
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold">{tier.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{tier.tagline}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <span className="text-4xl font-extrabold tracking-tight">
                  {price}
                </span>
                {tier.priceKey !== "free" && (
                  <span className="text-sm text-muted-foreground mb-1">USDC</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tier.billing}</p>
            </div>

            {/* Benefits */}
            <ul className="flex-1 space-y-2 mb-6">
              {tier.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              asChild
              className={cn(
                "w-full font-semibold",
                isPopular
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                  : "variant-outline",
              )}
              variant={isPopular ? "default" : "outline"}
            >
              <Link href={tier.ctaHref}>{tier.ctaText}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
