// app/(public)/page.tsx
// Root route stub — redirects unauthenticated users to /login, authenticated to /dashboard.
// Full landing page implemented in module-06.

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";

export default async function PublicHomePage() {
  const session = await getAuthSession();

  if (session) {
    redirect("/dashboard");
  }

  redirect("/login");
}
