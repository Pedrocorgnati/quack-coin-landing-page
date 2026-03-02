"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/rubber-duck.png"
          alt="QuackCoin"
          width={56}
          height={56}
          className="h-14 w-14"
          priority
        />
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          An unexpected error occurred. Our team has been notified.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="bg-muted mt-2 max-w-lg overflow-auto rounded p-3 text-left text-xs">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}
