// app/(admin)/admin/affiliate/audit/page.tsx
// Audit trail of all cashback transactions (claimed, pending, expired).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin — Cashback Audit" };

export default async function CashbackAuditPage() {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const txs = await prisma.cashbackTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      affiliateClick: {
        select: {
          createdAt: true,
          convertedAt: true,
          affiliateLink: { select: { code: true } },
        },
      },
    },
  });

  const now = new Date();

  function getStatus(tx: (typeof txs)[0]) {
    if (tx.claimedAt) return "claimed";
    if (tx.expiresAt && tx.expiresAt < now) return "expired";
    return "pending";
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/affiliate"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Cashback Audit Trail</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 text-left font-medium">User</th>
              <th className="pb-2 text-left font-medium">Link</th>
              <th className="pb-2 text-right font-medium">Purchase</th>
              <th className="pb-2 text-right font-medium">QC</th>
              <th className="pb-2 text-left font-medium">Created</th>
              <th className="pb-2 text-left font-medium">Claimed</th>
              <th className="pb-2 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => {
              const status = getStatus(tx);
              return (
                <tr key={tx.id} className="border-b last:border-0">
                  <td className="py-2.5">
                    <p className="font-medium text-xs">{tx.user.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{tx.user.email}</p>
                  </td>
                  <td className="py-2.5">
                    {tx.affiliateClick?.affiliateLink?.code ? (
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {tx.affiliateClick.affiliateLink.code}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-xs">
                    ${tx.purchaseAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    {tx.amountQc} QC
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {tx.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {tx.claimedAt
                      ? tx.claimedAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-2.5 text-center">
                    {status === "claimed" && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                        Claimed
                      </Badge>
                    )}
                    {status === "expired" && (
                      <Badge variant="secondary" className="text-xs">Expired</Badge>
                    )}
                    {status === "pending" && (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                        Pending
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
