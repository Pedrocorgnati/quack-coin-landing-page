// app/(public)/about/page.tsx
// About page with mission, stats from SiteConfig, and tech stack. Server Component.

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { SiteConfigService } from "@/lib/services/siteConfig.service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";

export const metadata: Metadata = {
  title: "About | QuackCoin",
  description:
    "Learn about QuackCoin — our mission to make DeFi accessible through learning, staking, and community engagement.",
  alternates: {
    canonical: `${APP_URL}/about`,
  },
};

const TEAM = [
  {
    name: "Alex Rivera",
    role: "Co-Founder & CEO",
    bio: "DeFi researcher and serial entrepreneur with 10 years in fintech.",
    initials: "AR",
  },
  {
    name: "Sam Chen",
    role: "Co-Founder & CTO",
    bio: "Full-stack engineer and blockchain developer. Previously at a major L2 protocol.",
    initials: "SC",
  },
  {
    name: "Jordan Lee",
    role: "Head of Community",
    bio: "Crypto educator and community builder with 200k+ followers across Web3 platforms.",
    initials: "JL",
  },
];

const TECH_STACK = [
  "Next.js",
  "TypeScript",
  "Prisma",
  "Redis",
  "MariaDB",
  "Solidity (rewards layer)",
];

export default async function AboutPage() {
  const configs = await SiteConfigService.getMany([
    "stats.total_members",
    "stats.qc_in_circulation",
    "stats.courses_available",
  ]);

  const stats = [
    {
      label: "Members",
      value: Number(configs["stats.total_members"] ?? "2400").toLocaleString("en-US"),
    },
    {
      label: "QC in Circulation",
      value: Number(configs["stats.qc_in_circulation"] ?? "12000000").toLocaleString("en-US"),
    },
    {
      label: "Courses Available",
      value: configs["stats.courses_available"] ?? "48",
    },
  ];

  return (
    <div className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Mission */}
        <section className="mb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Our mission
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            QuackCoin was built on a simple belief: learning about DeFi and participating in
            it should reward you. We created a platform where curiosity, consistency, and
            community translate into real, tangible yield.
          </p>
        </section>

        {/* Stats */}
        <section className="mb-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border bg-card p-8 text-center"
              >
                <p className="text-4xl font-extrabold text-yellow-600 dark:text-yellow-400 mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center">Meet the team</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl border bg-card p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xl font-bold">
                  {member.initials}
                </div>
                <p className="font-semibold">{member.name}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
                  {member.role}
                </p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center">Built with</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
