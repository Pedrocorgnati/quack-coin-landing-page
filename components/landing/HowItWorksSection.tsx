"use client";

// components/landing/HowItWorksSection.tsx
// 3-step process with Intersection Observer scroll animation.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mail, Coins, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    step: "01",
    icon: Mail,
    title: "Get Invited",
    description:
      "Request access with your email. An existing member sends you an invite code to join the platform.",
  },
  {
    step: "02",
    icon: Coins,
    title: "Earn QC",
    description:
      "Complete daily activities, take courses, stake tokens, and participate in community events to accumulate QuackCoins.",
  },
  {
    step: "03",
    icon: Unlock,
    title: "Unlock Benefits",
    description:
      "Use your QC to upgrade membership tiers, access exclusive content, stake for yield, and unlock premium features.",
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    const el = sectionRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Three simple steps to start building your QuackCoin portfolio.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line (desktop) */}
          <div
            className="absolute top-10 left-[calc(16.7%)] right-[calc(16.7%)] hidden md:block h-0.5 bg-border"
            aria-hidden="true"
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className={cn(
                  "flex flex-col items-center text-center transition-all duration-700",
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8",
                )}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Step circle */}
                <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-yellow-500 bg-yellow-500/10 z-10">
                  <Icon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-black">
                    {step.step}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border bg-card">
          <Image
            src="/smart-dusck-quack-togheter.png"
            alt="Smart ducks quack together"
            width={1400}
            height={600}
            className="h-auto w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
