// components/landing/SocialProofSection.tsx
// Testimonials / social proof section (static content for now).

import Image from "next/image";

const TESTIMONIALS = [
  {
    quote:
      "QuackCoin completely changed how I think about passive income in Web3. The staking yields are real, and the community is amazing.",
    author: "Alex M.",
    role: "Gold Member",
    tier: "★",
  },
  {
    quote:
      "I earned my first 500 QC just from taking courses in my first week. The education platform is top-notch.",
    author: "Sarah K.",
    role: "Silver Member",
    tier: "◈",
  },
  {
    quote:
      "The invite system makes this feel exclusive and high-quality. No spam, just serious DeFi enthusiasts.",
    author: "James T.",
    role: "Platinum Member",
    tier: "◆",
  },
];

export function SocialProofSection() {
  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Trusted by DeFi enthusiasts
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            What our members are saying about QuackCoin.
          </p>
        </div>

        <div className="mb-12 overflow-hidden rounded-2xl border bg-card">
          <Image
            src="/about.png"
            alt="QuackCoin community"
            width={1400}
            height={600}
            className="h-auto w-full object-cover"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.author}
              className="rounded-2xl border bg-card p-6"
            >
              <blockquote className="text-sm text-muted-foreground leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold text-base">
                  {t.tier}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
