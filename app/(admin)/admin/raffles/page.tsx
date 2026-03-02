// app/(admin)/raffles/page.tsx
// Admin raffle management — list all raffles with status and action buttons.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import type { RaffleStatus } from "@/lib/generated/prisma/client";
import { AdminRaffleActions } from "@/components/raffles/AdminRaffleActions";

export const metadata: Metadata = { title: "Manage Raffles | Admin" };

const STATUS_COLORS: Record<RaffleStatus, string> = {
  UPCOMING: "bg-secondary text-secondary-foreground",
  ACTIVE: "bg-primary text-primary-foreground",
  DRAWING: "bg-yellow-500 text-white",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive text-destructive-foreground",
};

export default async function AdminRafflesPage() {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const raffles = await prisma.raffle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tickets: true, winners: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Raffles</h2>
        <Link
          href="/admin/raffles/new"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Raffle
        </Link>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Tickets</th>
              <th className="text-left p-3 font-medium">Draw At</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {raffles.map((raffle) => (
              <tr key={raffle.id} className="hover:bg-muted/30">
                <td className="p-3 font-medium max-w-xs truncate">{raffle.title}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[raffle.status]}`}
                  >
                    {raffle.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{raffle._count.tickets}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(raffle.drawAt).toLocaleString()}
                </td>
                <td className="p-3">
                  <AdminRaffleActions raffle={{ id: raffle.id, status: raffle.status }} />
                </td>
              </tr>
            ))}
            {raffles.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No raffles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
