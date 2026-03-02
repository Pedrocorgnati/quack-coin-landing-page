// app/(public)/pricing/page.tsx
// Membership pricing page. Server Component — prices read from SiteConfig.

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { PricingGrid } from "@/components/landing/PricingGrid";
import { TierBenefitsTable } from "@/components/landing/TierBenefitsTable";
import { SiteConfigService } from "@/lib/services/siteConfig.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";

export const metadata: Metadata = {
  title: "Membership Plans | QuackCoin",
  description:
    "Compare QuackCoin membership tiers — Free, Silver, Gold, and Platinum. Unlock staking yield, QC multipliers, and exclusive DeFi benefits.",
  alternates: {
    canonical: `${APP_URL}/pricing`,
  },
};

export default async function PricingPage() {
  const configs = await SiteConfigService.getMany([
    "pricing.silver",
    "pricing.gold",
    "pricing.platinum",
  ]);

  const prices = {
    free: "0",
    silver: configs["pricing.silver"] ?? "29",
    gold: configs["pricing.gold"] ?? "79",
    platinum: configs["pricing.platinum"] ?? "199",
  };

  return (
    <div className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Choose your membership
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free and upgrade as you grow. All paid plans are billed monthly
            in USDC stablecoin — no crypto volatility.
          </p>
        </div>

        {/* Pricing grid */}
        <PricingGrid prices={prices} />

        {/* Benefits comparison */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">
            Full feature comparison
          </h2>
          <TierBenefitsTable />
        </div>

        {/* FAQ link */}
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Have questions?{" "}
          <Link href="/faq" className="underline underline-offset-4 hover:text-foreground">
            See our FAQ
          </Link>{" "}
          or{" "}
          <a
            href="/landing#invite-form"
            className="underline underline-offset-4 hover:text-foreground"
          >
            request an invite
          </a>
          .
        </p>
      </div>
    </div>
  );
}
