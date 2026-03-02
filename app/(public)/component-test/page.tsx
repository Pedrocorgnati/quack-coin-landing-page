// DEV-ONLY: component smoke test page (not linked in production nav)

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ComponentTestClient } from "./ComponentTestClient";

export const metadata: Metadata = { title: "Component Test — Dev Only" };

export default function ComponentTestPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }
  return <ComponentTestClient />;
}
