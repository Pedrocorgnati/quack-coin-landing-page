// app/(public)/roadmap/page.tsx
// Product roadmap page. Server Component with static timeline content.

import type { Metadata } from "next";
import { RoadmapTimeline } from "@/components/landing/RoadmapTimeline";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";

export const metadata: Metadata = {
  title: "Roadmap | QuackCoin",
  description:
    "See what's coming to QuackCoin — completed milestones, features in progress, and planned improvements.",
  alternates: {
    canonical: `${APP_URL}/roadmap`,
  },
};

export default function RoadmapPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Roadmap
          </h1>
          <p className="text-muted-foreground text-lg">
            Where we&apos;ve been, where we are, and where we&apos;re going.
          </p>
        </div>
        <RoadmapTimeline />
      </div>
    </div>
  );
}
