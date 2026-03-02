// lib/auth/getSession.ts
// Server Component helper and Client Component hook for accessing the auth session.

import { getServerSession } from "next-auth/next";
import { useSession } from "next-auth/react";
import { authOptions } from "@/lib/auth/config";
import type { Session } from "next-auth";

// ── Server Component helper ────────────────────────────────────
/**
 * Returns the current NextAuth session in Server Components.
 * Returns null when the user is unauthenticated.
 */
export async function getAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

// ── Client Component hook ──────────────────────────────────────
/**
 * Returns the current NextAuth session in Client Components.
 * Wraps `useSession` from next-auth/react for convenience.
 */
export { useSession as useAuthSession };
