"use client";

// app/(dashboard)/error.tsx
// Error boundary for dashboard route group.

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[dashboard] error boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Image
        src="/rubber-duck.png"
        alt="QuackCoin"
        width={48}
        height={48}
        className="h-12 w-12"
        priority
      />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred. Try refreshing the page or contact support if the problem persists.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset} size="sm">
        Try again
      </Button>
    </div>
  );
}
