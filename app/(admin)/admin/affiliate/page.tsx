// app/(admin)/admin/affiliate/page.tsx
// Admin cashback management — view and process pending cashback transactions.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Coins, ClipboardList } from "lucide-react";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { AdminCashbackTable } from "@/components/admin/AdminCashbackTable";

export const metadata: Metadata = { title: "Admin — Cashback" };

export default async function AdminAffiliatePage() {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const pending = await prisma.cashbackTransaction.findMany({
    where: {
      claimedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      affiliateClick: {
        select: {
          createdAt: true,
          convertedAt: true,
          affiliateLink: { select: { code: true } },
        },
      },
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6" aria-hidden="true" />
            Cashback Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pending.length} pending cashback transaction{pending.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/affiliate/audit"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ClipboardList className="h-4 w-4" />
          Audit Trail
        </Link>
      </div>

      <AdminCashbackTable rows={pending} />
    </div>
  );
}
