// app/(admin)/layout.tsx
// Server Component — requires admin role, renders AdminShell.

import { requireAdmin } from "@/lib/auth/requireRole";
import { AdminShell } from "@/components/layout/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin(); // redirects to /dashboard if not ADMIN
  const adminName = session.user.name ?? session.user.email ?? "Admin";

  return <AdminShell adminName={adminName}>{children}</AdminShell>;
}
