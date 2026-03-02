// app/(public)/faq/page.tsx
// Public FAQ page. Server Component with static content and shadcn Accordion.

import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";

export const metadata: Metadata = {
  title: "FAQ | QuackCoin",
  description:
    "Frequently asked questions about QuackCoin — earning QC, membership tiers, USDC payments, staking, and invite codes.",
  alternates: {
    canonical: `${APP_URL}/faq`,
  },
};

const FAQ_ITEMS = [
  {
    q: "What is QuackCoin?",
    a: "QuackCoin (QC) is an invite-only DeFi platform where members earn tokens by completing daily activities, taking Web3 education courses, staking, and referring friends. QC tokens can be staked for yield or used to upgrade your membership tier.",
  },
  {
    q: "How do I earn QC tokens?",
    a: "You can earn QC through several activities: daily check-ins (100–1,000 QC depending on your tier), completing education courses (variable bonus QC per lesson), participating in community events, and affiliate cashback when people you refer complete activities. Higher membership tiers unlock multipliers that boost all earnings.",
  },
  {
    q: "What are the membership tiers?",
    a: "There are four tiers: Free (no payment required), Silver, Gold, and Platinum. Paid tiers are unlocked with a monthly USDC payment and provide higher QC multipliers, better staking APY rates, more invite codes, and access to exclusive content. You can compare all tier benefits on our Pricing page.",
  },
  {
    q: "How do USDC payments work?",
    a: "Paid memberships (Silver, Gold, Platinum) require a monthly payment in USDC, a USD-pegged stablecoin. USDC payments are stable and predictable — there's no exposure to crypto price volatility. Payments are processed securely and your membership activates immediately.",
  },
  {
    q: "Is my account secure?",
    a: "Yes. We support two-factor authentication (2FA) via authenticator apps for all accounts. Sensitive data is encrypted at rest and in transit. We follow Web3 security best practices and will never ask for your private keys or seed phrases.",
  },
  {
    q: "How do invite codes work?",
    a: "QuackCoin is invite-only to maintain a high-quality, engaged community. Every member receives invite codes they can share with people they'd like to bring in. The number of codes you hold depends on your membership tier (Free: 1 code, up to 10 for Platinum). You earn affiliate cashback whenever someone you invited completes activities.",
  },
  {
    q: "What is staking and how does it work?",
    a: "Staking lets you lock your QC tokens in a pool for a set period to earn passive yield (APY). Higher membership tiers unlock pools with better APY rates. While your tokens are staked they are temporarily locked, but you receive steady yield rewards over time.",
  },
  {
    q: "Can I upgrade or downgrade my membership?",
    a: "Yes. You can upgrade your membership at any time and the new benefits take effect immediately. Downgrades take effect at the start of your next billing cycle so you retain current-tier benefits until then.",
  },
  {
    q: "What devices and platforms are supported?",
    a: "QuackCoin is a web application accessible from any modern browser on desktop, tablet, or mobile. No app installation is required. The platform is fully responsive and optimised for all screen sizes.",
  },
  {
    q: "I don't have an invite code. How can I join?",
    a: "If you don't know a current member, you can request access via our waitlist. Submit your email on the landing page and we'll reach out when a spot becomes available. Due to the invite-only model, waitlist spots open as members share new invite codes.",
  },
];

export default function FAQPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about QuackCoin.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="w-full space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border bg-card px-6"
            >
              <AccordionTrigger className="text-left font-semibold text-base py-5 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Still have questions? Request an invite and we&apos;ll be in touch.
          </p>
          <Link
            href="/landing#invite-form"
            className="inline-flex items-center justify-center rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-6 py-2.5 text-sm transition-colors"
          >
            Request Access
          </Link>
        </div>
      </div>
    </div>
  );
}
