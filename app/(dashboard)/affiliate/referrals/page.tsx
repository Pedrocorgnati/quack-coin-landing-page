// app/(dashboard)/affiliate/referrals/page.tsx
// Shows users who registered via current user's invite code.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "My Referrals" };

export default async function ReferralsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const referrals = await prisma.user.findMany({
    where: { invitedById: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      membershipTier: true,
      createdAt: true,
      qcTransactions: { where: { type: "EARN" }, select: { amount: true } },
    },
  });

  const totalQcFromReferrals = referrals.reduce(
    (sum, u) => sum + u.qcTransactions.reduce((s, t) => s + t.amount, 0),
    0,
  );

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/affiliate/stats"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to stats"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            Referred Users
          </h1>
          <p className="text-sm text-muted-foreground">
            {referrals.length} user{referrals.length !== 1 ? "s" : ""} joined via your invite
            {referrals.length > 0 && ` · ${totalQcFromReferrals} QC earned in total`}
          </p>
        </div>
      </div>

      {referrals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No referrals yet. Share your invite code to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {referrals.map((u) => {
            const earned = u.qcTransactions.reduce((s, t) => s + t.amount, 0);
            return (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{u.name ?? "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined{" "}
                    {u.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {u.membershipTier}
                  </Badge>
                  {earned > 0 && (
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {earned} QC
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
