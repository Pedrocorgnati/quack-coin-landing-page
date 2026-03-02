import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | QuackCoin",
  description: "Set a new password for your QuackCoin account.",
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
