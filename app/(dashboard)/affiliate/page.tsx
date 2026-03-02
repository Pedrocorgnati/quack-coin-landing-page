// app/(dashboard)/affiliate/page.tsx
// Affiliate dashboard — link generator + links list + cashback overview.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, TrendingUp } from "lucide-react";
import { getAuthSession } from "@/lib/auth/getSession";
import { AffiliateSection } from "@/components/affiliate/AffiliateSection";

export const metadata: Metadata = { title: "Affiliate Program" };

export default async function AffiliatePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" aria-hidden="true" />
          Affiliate Program
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your links and earn QuackCoin when friends convert.
        </p>
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          href="/affiliate"
          className="text-foreground font-medium border-b-2 border-primary pb-0.5"
        >
          Links
        </Link>
        <Link
          href="/affiliate/stats"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
          Stats
        </Link>
      </div>

      <AffiliateSection />
    </div>
  );
}
