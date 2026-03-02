import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: {
    template: "%s | QuackCoin",
    default: "QuackCoin",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image
            src="/rubber-duck.png"
            alt="QuackCoin"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <span className="text-2xl font-bold tracking-tight">QuackCoin</span>
        </div>
        <p className="text-sm text-muted-foreground">Invite-only platform</p>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
