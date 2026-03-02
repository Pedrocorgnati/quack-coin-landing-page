// components/landing/FeaturesSection.tsx
// 6-feature grid: QC Economy, USDC Membership, Staking, Education, Affiliate, Badges.

import Image from "next/image";
import {
  Coins,
  CreditCard,
  TrendingUp,
  BookOpen,
  Users,
  Medal,
} from "lucide-react";

const FEATURES = [
  {
    icon: Coins,
    title: "QC Economy",
    description:
      "Earn QuackCoins through daily check-ins, learning, and community engagement. A real token economy rewarding participation.",
  },
  {
    icon: CreditCard,
    title: "USDC Membership",
    description:
      "Upgrade to Silver, Gold, or Platinum membership with USDC stablecoin payments. Unlock multipliers and exclusive benefits.",
  },
  {
    icon: TrendingUp,
    title: "Staking Yield",
    description:
      "Lock QC in staking pools to earn passive yield. Higher membership tiers unlock better APY rates.",
  },
  {
    icon: BookOpen,
    title: "Education Courses",
    description:
      "Complete DeFi and Web3 courses to earn bonus QC. Learn and get rewarded — every lesson counts.",
  },
  {
    icon: Users,
    title: "Affiliate Cashback",
    description:
      "Refer friends and earn a percentage of their activity as QC cashback. Grow the community and earn together.",
  },
  {
    icon: Medal,
    title: "Social Badges",
    description:
      "Collect achievement badges for milestones: first stake, course completion, referral streaks, and more.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything you need to grow in Web3
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            From earning to staking, from learning to networking — QuackCoin
            builds a complete DeFi lifestyle.
          </p>
        </div>

        <div className="mb-12 overflow-hidden rounded-2xl border bg-card">
          <Image
            src="/spend-less-quack-more.png"
            alt="Spend less, quack more"
            width={1400}
            height={600}
            className="h-auto w-full object-cover"
          />
        </div>

        {/* Feature grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Icon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
