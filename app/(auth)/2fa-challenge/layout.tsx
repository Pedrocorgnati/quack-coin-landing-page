import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-Factor Authentication | QuackCoin",
  description: "Complete two-factor verification to access your account.",
};

export default function TwoFaChallengeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
