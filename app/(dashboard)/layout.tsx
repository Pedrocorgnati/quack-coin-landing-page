// app/(dashboard)/layout.tsx
// Server Component — fetches session + user data, passes to DashboardShell.
// Auth guard is handled by middleware (module-03); this layout assumes session exists.

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const [dbUser, qcBalance] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        membershipTier: true,
      },
    }),
    QcService.getBalance(session.user.id),
  ]);

  if (!dbUser) redirect("/login");

  const user = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    avatarUrl: dbUser.avatarUrl,
    membershipTier: dbUser.membershipTier,
    qcBalance,
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
