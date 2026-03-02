import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | QuackCoin",
  description: "Reset your QuackCoin account password.",
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
