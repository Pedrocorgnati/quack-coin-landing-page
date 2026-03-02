import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | QuackCoin",
  description: "Sign in to your QuackCoin account.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
