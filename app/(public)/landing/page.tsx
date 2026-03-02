// app/(public)/landing/page.tsx
// Main marketing landing page. Server Component with full OG metadata.

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { CTASection } from "@/components/landing/CTASection";
import { SiteConfigService } from "@/lib/services/siteConfig.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: {
      default: "QuackCoin — Earn by Learning, Staking & Engaging",
      template: "%s | QuackCoin",
    },
    description:
      "Join the invite-only QuackCoin DeFi platform. Earn QC tokens through daily activities, stake for yield, and unlock premium USDC membership benefits.",
    metadataBase: new URL(APP_URL),
    alternates: {
      canonical: `${APP_URL}/landing`,
    },
    openGraph: {
      type: "website",
      url: APP_URL,
      siteName: "QuackCoin",
      title: "QuackCoin — Earn by Learning, Staking & Engaging",
      description:
        "The invite-only Web3 DeFi platform where engagement translates to real yield.",
      images: [
        {
          url: `${APP_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "QuackCoin Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "QuackCoin — Earn by Learning, Staking & Engaging",
      description:
        "The invite-only Web3 DeFi platform where engagement translates to real yield.",
      images: [`${APP_URL}/og-image.png`],
    },
  };
}

export default async function LandingPage() {
  const memberCountStr = await SiteConfigService.getOrDefault(
    "stats.total_members",
    "2400",
  );
  const memberCount = parseInt(memberCountStr, 10);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SocialProofSection />
      <CTASection memberCount={isNaN(memberCount) ? undefined : memberCount} />
    </>
  );
}
