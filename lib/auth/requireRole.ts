// lib/auth/requireRole.ts
// Server Component defence-in-depth helpers for role-based access control.
// These are called as the FIRST line in admin page Server Components.

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";

/**
 * Require admin role in a Server Component.
 * Redirects to /dashboard if the user is not an admin.
 * Returns the session for convenience.
 */
export async function requireAdmin() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}

/**
 * Require authenticated session in a Server Component.
 * Redirects to /login if the user is not authenticated.
 * Returns the session for convenience.
 */
export async function requireAuth() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  return session;
}
