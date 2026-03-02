// app/(dashboard)/badges/page.tsx
// Server Component — fetches all badges with earned status and renders BadgeCollection.

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";
import { BadgeService } from "@/lib/services/badge.service";
import { BadgeCollection } from "@/components/badges/BadgeCollection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Badges | QuackCoin",
  description: "Your badge collection — earn badges by completing challenges.",
};

export default async function BadgesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const badges = await BadgeService.getBadgesForUser(session.user.id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Badges</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete challenges and milestones to earn badges.
        </p>
      </div>
      <BadgeCollection badges={badges} />
    </div>
  );
}
