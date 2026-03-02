"use client";

// app/(admin)/error.tsx
// Error boundary for admin route group.

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[admin] error boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-4xl" role="img" aria-label="Error">⚠️</span>
      <h2 className="text-xl font-semibold">Admin panel error</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred in the admin panel.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset} size="sm" variant="destructive">
        Try again
      </Button>
    </div>
  );
}
