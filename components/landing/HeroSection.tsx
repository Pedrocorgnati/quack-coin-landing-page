"use client";

// components/landing/HeroSection.tsx
// Landing page hero with headline, sub-headline, two CTAs, and hero image placeholder.

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroSectionProps {
  inviteFormId?: string;
}

export function HeroSection({ inviteFormId = "invite-form" }: HeroSectionProps) {
  const scrollToInviteForm = () => {
    document.getElementById(inviteFormId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center bg-[#1A1A1A] overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8 text-white">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-xs font-medium text-yellow-400 mb-6">
            <Sparkles className="h-3 w-3" />
            Invite-Only DeFi Platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Earn QuackCoins by{" "}
            <span className="text-yellow-400">
              learning, staking,
            </span>{" "}
            and engaging
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
            Join an exclusive Web3 community. Accumulate QC tokens through daily
            engagement, stake for passive yield, and unlock premium membership
            benefits with USDC.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
              onClick={scrollToInviteForm}
            >
              Get Invited
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="#features">Learn More</Link>
            </Button>
          </div>

            {/* Social proof numbers */}
            <div className="mt-12 flex flex-wrap gap-8">
              {[
                { label: "Active Members", value: "2,400+" },
                { label: "QC in Circulation", value: "1.2M+" },
                { label: "Avg Monthly Yield", value: "8.5%" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-yellow-400">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero foreground image (legacy) */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 rounded-[32px] bg-yellow-500/10 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-[28px] border border-yellow-500/20 bg-black/40 p-6">
              <Image
                src="/quack-coin.png"
                alt="QuackCoin hero"
                width={640}
                height={640}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
