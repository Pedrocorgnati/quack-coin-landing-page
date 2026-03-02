import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | QuackCoin",
  description: "Join QuackCoin with an invite code.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
