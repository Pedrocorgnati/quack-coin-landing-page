// app/(dashboard)/membership/page.tsx
// Membership status page — tier card, benefits, billing history.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { MembershipService } from "@/lib/services/membership.service";
import { MembershipStatusCard } from "@/components/membership/MembershipStatusCard";
import { BillingHistoryTable } from "@/components/membership/BillingHistoryTable";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Membership | QuackCoin",
  description: "Manage your QuackCoin membership and billing history",
};

export default async function MembershipPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, benefits] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { membershipTier: true, membershipExpiresAt: true },
    }),
    MembershipService.getActiveBenefits(userId),
  ]);

  if (!user) redirect("/login");

  // Prefetch first page of billing history on server
  const [billingData, billingTotal] = await Promise.all([
    prisma.membershipPayment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.membershipPayment.count({ where: { userId } }),
  ]);

  // Serialize dates for client hydration
  const serializedBilling = billingData.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    validFrom: p.validFrom?.toISOString() ?? null,
    validUntil: p.validUntil?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Membership</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your current tier, active benefits, and payment history
        </p>
      </div>

      <MembershipStatusCard
        tier={user.membershipTier}
        expiresAt={user.membershipExpiresAt}
        qcMultiplier={benefits.qcMultiplier}
        stakingBonus={benefits.stakingBonus}
        cashbackBonus={benefits.cashbackBonus}
      />

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Billing History</h2>
        {billingTotal === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <BillingHistoryTable
            initialData={serializedBilling}
            initialTotal={billingTotal}
          />
        )}
      </div>
    </div>
  );
}
