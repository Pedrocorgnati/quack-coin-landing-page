// app/(dashboard)/profile/page.tsx
// User profile page — server component that fetches user data and renders sections.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth/getSession";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SecurityOverview } from "@/components/profile/SecurityOverview";
import { MembershipTierBadge } from "@/components/shared/MembershipTierBadge";
import { QCBalanceCard } from "@/components/shared/QCBalanceCard";
import { QcService } from "@/lib/services/qc.service";
import { BadgeService } from "@/lib/services/badge.service";
import { BadgeCard } from "@/components/badges/BadgeCard";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export const metadata: Metadata = { title: "Profile | QuackCoin" };

export default async function ProfilePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?callbackUrl=/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      membershipTier: true,
      membershipExpiresAt: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const [qcBalance, allBadges] = await Promise.all([
    QcService.getBalance(user.id).catch(() => 0),
    BadgeService.getBadgesForUser(user.id).catch(() => []),
  ]);
  const earnedBadges = allBadges.filter((b) => b.earned);
  const recentBadges = earnedBadges.slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account details</p>
        </div>
        <div className="flex items-center gap-3">
          <MembershipTierBadge
            tier={user.membershipTier}
            expiresAt={user.membershipExpiresAt ?? undefined}
          />
          <QCBalanceCard balance={qcBalance} variant="compact" />
        </div>
      </div>

      <Separator />

      {/* Profile Form */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
        <ProfileForm
          initialName={user.name}
          initialAvatarUrl={user.avatarUrl}
          email={user.email}
        />
      </section>

      <Separator />

      {/* Badges preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Badges{" "}
            <span className="text-muted-foreground font-normal text-base">
              ({earnedBadges.length})
            </span>
          </h2>
          <Link href="/badges" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentBadges.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {recentBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} compact />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No badges earned yet.{" "}
            <Link href="/badges" className="text-primary hover:underline">
              See what you can unlock
            </Link>
            .
          </p>
        )}
      </section>

      <Separator />

      {/* Security Overview */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Security</h2>
        <SecurityOverview
          twoFactorEnabled={user.twoFactorEnabled}
          lastLoginAt={user.lastLoginAt}
          createdAt={user.createdAt}
        />
      </section>
    </div>
  );
}
