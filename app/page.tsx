// app/page.tsx
// Root route — redirect to /landing for unauthenticated users.
// Auth middleware handles redirect to /dashboard for authenticated users.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/landing");
}
