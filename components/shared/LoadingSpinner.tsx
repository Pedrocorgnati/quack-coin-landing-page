import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  fullPage?: boolean;
}

export function LoadingSpinner({ className, size = 24, fullPage = false }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2
          className={cn("animate-spin text-primary", className)}
          width={size}
          height={size}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className="animate-spin text-primary" width={size} height={size} />
    </div>
  );
}
